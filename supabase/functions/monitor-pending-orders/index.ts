// Moniteur de commandes bloquées — tourne toutes les 2 min via pg_cron
// Filet de sécurité si le webhook PayGreen échoue pour n'importe quelle raison
// Le client peut fermer son téléphone : cette fonction rattrapera le coup
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''

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

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ===== Nettoyage des commandes FANTÔMES (ajout 14/07/2026) =====
    // Pending SANS aucune session de paiement (ni PayGreen ni Edenred), vieilles de >1h :
    // le paiement n'a jamais démarré (abandon, ou blocage AVANT PayGreen). Un vrai payeur a
    // toujours un paygreen_transaction_id en quelques secondes. On les annule pour éviter
    // (a) l'accumulation invisible en base, (b) le rate-limit qui bloquait un client réessayant.
    // Isolé du reste : ne touche QUE des pending sans transaction, >1h.
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: ghostCancelled } = await supabase
        .from('orders')
        .update(
          { statut: 'cancelled', cancellation_reason: 'abandon (paiement jamais démarré)' },
          { count: 'exact' }
        )
        .eq('statut', 'pending')
        .is('paygreen_transaction_id', null)
        .is('edenred_payment_id', null)
        .lt('created_at', oneHourAgo)
      if (ghostCancelled) console.log(`🧹 Monitor: ${ghostCancelled} commande(s) fantôme(s) annulée(s)`)
    } catch (e) {
      console.error('⚠️ Nettoyage fantômes échoué (non bloquant):', e)
    }

    // Commandes pending avec un ID PayGreen, créées il y a plus de 2 min
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select('id, numero, statut, paygreen_transaction_id, total, heure_retrait, items, note')
      .eq('statut', 'pending')
      .not('paygreen_transaction_id', 'is', null)
      .lt('created_at', twoMinutesAgo)

    if (error) throw error

    if (!pendingOrders || pendingOrders.length === 0) {
      // Cas normal : rien à faire
      return new Response(JSON.stringify({ checked: 0, updated: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`🔍 Monitor: ${pendingOrders.length} commande(s) bloquée(s) détectée(s)`)

    // Auth PayGreen une seule fois pour toutes les commandes
    let jwt: string
    try {
      jwt = await getPaygreenJWT()
    } catch (e) {
      console.error('❌ Auth PayGreen impossible:', e)
      return new Response(JSON.stringify({ error: 'PayGreen auth failed' }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      })
    }

    // Auto-accept setting
    const { data: autoAcceptSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'auto_accept_orders')
      .maybeSingle()
    const autoAccept = autoAcceptSetting?.value === 'true'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    let updated = 0

    for (const order of pendingOrders) {
      try {
        const pgRes = await fetch(`https://api.paygreen.fr/payment/payment-orders/${order.paygreen_transaction_id}`, {
          headers: { 'Authorization': `Bearer ${jwt}`, 'Accept': 'application/json' }
        })

        if (!pgRes.ok) {
          console.warn(`⚠️ PayGreen lookup failed for ${order.numero}: ${pgRes.status}`)
          continue
        }

        const pgData = await pgRes.json()
        const pgStatus = pgData.data?.status ?? ''

        // Mapping statut
        let newStatus = 'pending'
        if (pgStatus.includes('successed') || pgStatus.includes('success') || pgStatus.includes('paid')) {
          newStatus = autoAccept ? 'acceptee' : 'payee'
        } else if (pgStatus.includes('refused') || pgStatus.includes('cancelled') || pgStatus.includes('expired')) {
          newStatus = 'cancelled'
        }

        if (newStatus === 'pending') continue // Genuinement en attente, on laisse

        const isPaid = newStatus === 'payee' || newStatus === 'acceptee'
        const now = new Date().toISOString()

        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            statut: newStatus,
            paygreen_status: pgStatus,
            payment_confirmed_at: isPaid ? now : null
          })
          .eq('id', order.id)

        if (updateErr) {
          console.error(`❌ Update failed for ${order.numero}:`, updateErr)
          continue
        }

        updated++
        console.log(`✅ Monitor: ${order.numero} → ${newStatus} (PayGreen: ${pgStatus})`)

        // Dernier filet : si ni le webhook ni le fallback n ont vu l echec.
        if (newStatus === 'cancelled') {
          await alertPaiementEchoue(supabase, order.id, pgStatus, pgData)
        }

        // Notifications si paiement confirmé
        if (isPaid) {
          const emailFn = newStatus === 'acceptee' ? 'send-order-confirmation' : 'send-payment-confirmation'

          await Promise.allSettled([
            // Email client
            fetch(`${supabaseUrl}/functions/v1/${emailFn}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.id })
            }),
            // Notif Paco — normale, sans mention du cron
            fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderNumber: order.numero,
                pickupTime: order.heure_retrait || 'Dès que possible',
                total: (order.total || 0).toFixed(2),
                paymentMethod: 'paygreen',
                items: order.items || [],
                note: order.note || null
              })
            })
          ])

          // Alerte technique séparée — webhook ET fallback manqués, rattrapé par cron
          try {
            const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
            const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
            if (botToken && chatId) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `🚨 *ALERTE SYSTÈME*\nCommande \`${order.numero}\` — webhook PayGreen raté + fallback raté\n✅ Rattrapée par le moniteur cron (2 min)\n→ Paco a bien reçu sa notif`,
                  parse_mode: 'Markdown'
                })
              })
            }
          } catch (e) {
            console.error('Erreur alerte système Telegram:', e)
          }
        }
      } catch (e) {
        console.error(`❌ Erreur traitement ${order.numero}:`, e)
      }
    }

    return new Response(JSON.stringify({ checked: pendingOrders.length, updated }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erreur monitor-pending-orders:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
