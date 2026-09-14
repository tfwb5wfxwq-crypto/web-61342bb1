// Edge Function : Vérifie le statut d'un paiement PayGreen directement
// Utilisé comme fallback quand le webhook échoue (HMAC, timeout, etc.)
// Appelé par confirmation.html après ~20s de statut "pending"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ['https://beyrouth.express', 'https://www.beyrouth.express']
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : 'https://beyrouth.express',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// ─── ALERTE ECHEC DE PAIEMENT (09/09/2026) ────────────────────────────────
// create-payment alerte deja quand la CREATION du paiement echoue (8 cas :
// PayGreen injoignable, plat indisponible, montant obsolete...). Ce qui
// manquait, c est l APRES : le client est arrive sur la page de paiement et
// elle n a pas abouti (refuse, expire, annule). C etait le trou noir :
// 26 echecs depuis avril 2026, 17 clients jamais revenus, 233 EUR, sans
// qu aucun message ne parte.
// IDEMPOTENT : trois chemins peuvent annuler la meme commande (ce webhook, le
// fallback check-payment-status, le cron monitor-pending-orders). On reclame
// donc la ligne de facon ATOMIQUE en ecrivant cancellation_reason ; seul le
// chemin qui gagne l ecriture envoie le message. Pas de doublon possible.
// ─── Lire les tentatives de paiement (ajout 14/09/2026) ─────────────────────
// PayGreen renvoie DEJA le detail des transactions dans la reponse payment-orders ;
// on ne lisait que "status" et on jetait le reste. Or c'est ce tableau qui separe les
// deux cas que Paco doit traiter differemment :
//   0 transaction  = le client a vu le formulaire et n'a JAMAIS saisi de carte
//   1+ refusee     = carte saisie, refusee par SA banque (le site n'y est pour rien)
// Mesure du 14/09/2026 : sur 21 jours, TOUS les "expired" avaient 0 transaction. Le
// message disait pourtant "3DS non termine" et a envoye le diagnostic dans le mur.
// Confirme par une cliente (Cassie) : "je n'avais pas ma carte sur moi".
function lireTentatives(pgData: any): { nb: number; refusees: number; ligne: string; dernier: string | null } {
  const src: any = pgData?.data ?? pgData
  // Ne conclure "jamais saisi de carte" QUE si PayGreen a bien renvoye le champ.
  // Champ absent = on ne sait pas -> on se tait plutot que d'affirmer a tort.
  const connu = !!src && Object.prototype.hasOwnProperty.call(src, 'transactions')
  const tx: any[] = (connu ? (src.transactions ?? []) : []) as any[]
  const statuts = tx
    .map((t: any) => String(t?.status ?? '').replace('transaction.', ''))
    .filter((s: string) => s.length > 0)
  const refusees = statuts.filter((s: string) => s.includes('refused') || s.includes('failed')).length
  const dernier = statuts.length ? statuts[statuts.length - 1] : null
  let ligne = ''
  if (!pgData || !connu) {
    ligne = ''                       // pas d'info PayGreen : on n'invente rien
  } else if (tx.length === 0) {
    ligne = "\n🚪 Il n'a JAMAIS saisi de carte : arrete AVANT de payer."
  } else if (refusees > 0) {
    ligne = `\n💳 Carte saisie et REFUSEE par sa banque (${refusees} tentative${refusees > 1 ? 's' : ''}) — plafond, opposition ou solde. Le site n'y est pour rien.`
  } else {
    ligne = `\n💳 ${tx.length} tentative(s) de paiement : ${statuts.join(', ')}.`
  }
  return { nb: connu ? tx.length : -1, refusees, ligne, dernier }
}

async function alertPaiementEchoue(supabase: any, orderId: string, pgStatus: string, pgData?: any) {
  try {
    const tentatives = lireTentatives(pgData)
    const motif =
      pgStatus.includes('refused') ? 'refuse par la banque ou la carte'
      : pgStatus.includes('expired')
        ? (pgData && tentatives.nb === 0   // -1 = information indisponible
            ? 'arret avant paiement (aucune carte saisie)'
            : 'delai depasse apres une tentative de paiement')
      : 'annule pendant le paiement'

    const { data } = await supabase
      .from('orders')
      .update({ cancellation_reason: `echec paiement : ${motif} (${pgStatus})` })
      .eq('id', orderId)
      .eq('statut', 'cancelled')
      .is('cancellation_reason', null)
      .select('numero, total, client_prenom, client_telephone, client_email, items, heure_retrait')

    const o = data?.[0]
    if (!o) return // deja signale par un autre chemin, on se tait

    // Trace durable, pour pouvoir COMPTER sur la duree (arrets avant paiement vs refus
    // bancaires). Volontairement isole et non bloquant : si les colonnes manquaient,
    // l'alerte partirait quand meme.
    if (pgData) {
      try {
        await supabase
          .from('orders')
          .update({ payment_attempts: tentatives.nb, payment_last_tx_status: tentatives.dernier })
          .eq('id', orderId)
      } catch (_) { /* jamais bloquant */ }
    }

    // Le signal le plus utile : quelqu un qui recommence veut vraiment
    // commander (cf. Mathilde le 08/09, deux fois 14 EUR, jamais revenue).
    let insiste = ''
    if (o.client_telephone) {
      try {
        const uneHeure = new Date(Date.now() - 3600000).toISOString()
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('client_telephone', o.client_telephone)
          .eq('statut', 'cancelled')
          .gte('created_at', uneHeure)
        if ((count ?? 0) > 1) insiste = `\n🔁 ${count}e tentative en moins d une heure.`
      } catch (_) { /* jamais bloquant */ }
    }

    const plats = Array.isArray(o.items)
      ? o.items.map((i: any) => `${i.qty ?? i.quantite ?? 1}x ${i.nom ?? '?'}`).join(', ')
      : ''

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
    if (!botToken || !chatId) return
    const text =
      `⚠️ Paiement echoue — un client n a pas pu payer\n` +
      `Raison : ${motif}\n` +
      `Client : ${o.client_prenom || '?'} — ${o.client_telephone || '?'} (${o.client_email || '?'})\n` +
      `Panier : ${Number(o.total ?? 0).toFixed(2)} EUR — commande ${o.numero}\n` +
      (plats ? `Articles : ${plats}\n` : '') +
      (o.heure_retrait ? `Retrait demande : ${o.heure_retrait}\n` : '') +
      tentatives.ligne +
      insiste +
      `\n👉 Tu peux le rappeler pour recuperer la commande.`
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    })
  } catch (e) {
    console.error('alertPaiementEchoue failed (non bloquant):', e)
  }
}

async function getPaygreenJWT(): Promise<string> {
  const res = await fetch(`https://api.paygreen.fr/auth/authentication/${PAYGREEN_SHOP_ID}/secret-key`, {
    method: 'POST',
    headers: {
      'Authorization': PAYGREEN_SECRET_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  })
  if (!res.ok) throw new Error(`PayGreen auth failed: ${res.status}`)
  const data = await res.json()
  return data.data?.token || data.token
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const orderNum = url.searchParams.get('num')

    if (!orderNum || orderNum.length < 4 || orderNum.length > 12) {
      return new Response(JSON.stringify({ error: 'Numéro invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer la commande
    const { data: order } = await supabase
      .from('orders')
      .select('id, numero, statut, paygreen_transaction_id, payment_confirmed_at, total, heure_retrait, items, note')
      .eq('numero', orderNum)
      .maybeSingle()

    if (!order) {
      return new Response(JSON.stringify({ error: 'Commande introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Si déjà mis à jour, retourner le statut actuel directement
    if (order.statut !== 'pending') {
      return new Response(JSON.stringify({ statut: order.statut, updated: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Vérifier PayGreen si on a un transaction ID
    const pgRef = order.paygreen_transaction_id
    if (!pgRef) {
      return new Response(JSON.stringify({ statut: 'pending', updated: false, reason: 'no_pg_ref' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authentification PayGreen
    let jwt: string
    try {
      jwt = await getPaygreenJWT()
    } catch (e) {
      console.error('Erreur auth PayGreen:', e)
      return new Response(JSON.stringify({ statut: 'pending', updated: false, reason: 'pg_auth_failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Récupérer le statut PayGreen
    const pgRes = await fetch(`https://api.paygreen.fr/payment/payment-orders/${pgRef}`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'Accept': 'application/json' }
    })

    if (!pgRes.ok) {
      console.error('PayGreen lookup failed:', pgRes.status)
      return new Response(JSON.stringify({ statut: 'pending', updated: false, reason: 'pg_lookup_failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const pgData = await pgRes.json()
    const pgStatus = pgData.data?.status ?? ''

    console.log(`Order ${orderNum} — PayGreen status: ${pgStatus}`)

    // Mapping PayGreen → notre statut
    let newStatus = 'pending'
    if (pgStatus.includes('successed') || pgStatus.includes('success') || pgStatus.includes('paid')) {
      newStatus = 'payee'
    } else if (pgStatus.includes('refused') || pgStatus.includes('cancelled') || pgStatus.includes('expired')) {
      newStatus = 'cancelled'
    }

    if (newStatus === 'pending') {
      return new Response(JSON.stringify({ statut: 'pending', updated: false, pg_status: pgStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Vérifier auto-accept
    const { data: autoAcceptSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'auto_accept_orders')
      .maybeSingle()
    const autoAccept = autoAcceptSetting?.value === 'true'

    // Statut final : si payee + auto-accept → acceptee directement
    const finalStatus = (newStatus === 'payee' && autoAccept) ? 'acceptee' : newStatus
    const now = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        statut: finalStatus,
        paygreen_status: pgStatus,
        payment_confirmed_at: newStatus === 'payee' ? now : null
      })
      .eq('id', order.id)

    if (updateErr) {
      console.error('Erreur update order:', updateErr)
      return new Response(JSON.stringify({ statut: 'pending', updated: false, reason: 'db_update_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Fallback webhook: ${orderNum} → ${finalStatus} (pg: ${pgStatus})`)

    // Meme alerte que dans le webhook ; l ecriture atomique evite le doublon.
    if (finalStatus === 'cancelled') {
      await alertPaiementEchoue(supabase, order.id, pgStatus, pgData)
    }

    // Envoyer email + notifications si paiement confirmé
    if (newStatus === 'payee') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const emailFn = finalStatus === 'acceptee' ? 'send-order-confirmation' : 'send-payment-confirmation'

      await Promise.allSettled([
        // Email client
        fetch(`${supabaseUrl}/functions/v1/${emailFn}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id })
        }),
        // Notif Paco — normale, sans mention du fallback
        fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: orderNum,
            pickupTime: order.heure_retrait || 'Dès que possible',
            total: (order.total || 0).toFixed(2),
            paymentMethod: 'paygreen',
            items: order.items || [],
            note: order.note || null
          })
        })
      ])

      // Alerte technique séparée — webhook manqué, rattrapé par fallback
      try {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
        const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
        if (botToken && chatId) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🔧 *ALERTE SYSTÈME*\nCommande \`${orderNum}\` — webhook PayGreen raté\n✅ Rattrapée automatiquement par le fallback (20s)\n→ Paco a bien reçu sa notif`,
              parse_mode: 'Markdown'
            })
          })
        }
      } catch (e) {
        console.error('Erreur alerte système Telegram:', e)
      }
    }

    return new Response(JSON.stringify({ statut: finalStatus, updated: true, pg_status: pgStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erreur check-payment-status:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
