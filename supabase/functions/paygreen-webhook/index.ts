// Webhook Paygreen — vérification du paiement directement via API PayGreen
// Sécurité : on vérifie le paiement côté PayGreen (pas de dépendance au HMAC qui peut changer)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://beyrouth.express',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''

// Obtenir un JWT PayGreen pour appeler leur API
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
  if (!res.ok) throw new Error(`Auth PayGreen failed: ${res.status}`)
  const data = await res.json()
  return data.data?.token || data.token
}

// Vérifier le paiement directement chez PayGreen (source de vérité)
// Moyen de paiement reellement utilise (16/09/2026) : PayGreen le met dans
// transactions[].operations[].instrument.platform ('bank_card', 'apple_pay',
// 'google_pay', 'swile', 'conecs', 'restoflash'). On prend la derniere operation
// capturee ; sinon la derniere connue. Jamais bloquant : null si absent.
function extractPlatform(po: any): string | null {
  try {
    const ops: any[] = []
    for (const t of (po?.transactions ?? [])) for (const op of (t?.operations ?? [])) ops.push(op)
    const pick = ops.filter(o => String(o?.status ?? '').includes('captured')).pop() ?? ops.pop()
    const p = pick?.instrument?.platform ?? pick?.payment_config?.platform ?? null
    return typeof p === 'string' && p.length > 0 && p.length < 40 ? p : null
  } catch (_) { return null }
}

async function verifyPaymentWithPaygreen(paymentOrderId: string): Promise<{ status: string; amount: number; platform: string | null } | null> {
  try {
    const jwt = await getPaygreenJWT()
    const res = await fetch(`https://api.paygreen.fr/payment/payment-orders/${paymentOrderId}`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'Accept': 'application/json' }
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      status: data.data?.status ?? '',
      amount: data.data?.amount ?? 0,
      platform: extractPlatform(data.data)
    }
  } catch (e) {
    console.error('Erreur vérification PayGreen:', e)
    return null
  }
}

// Detail brut d'une commande PayGreen (utilise sur le chemin d'ECHEC, pour savoir si
// une carte a ete saisie). Renvoie null en cas de pepin : jamais bloquant.
async function getPaymentOrderRaw(paymentOrderId: string): Promise<any | null> {
  try {
    const jwt = await getPaygreenJWT()
    const res = await fetch(`https://api.paygreen.fr/payment/payment-orders/${paymentOrderId}`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'Accept': 'application/json' }
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('getPaymentOrderRaw failed (non bloquant):', e)
    return null
  }
}

// Helper retry avec backoff (webhook peut arriver avant création commande)
async function findOrderWithRetry(supabase: any, orderNum: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await supabase
      .from('orders')
      .select('id, statut, payment_confirmed_at, paygreen_transaction_id, total, heure_retrait, numero, items, note')
      .eq('numero', orderNum)
      .maybeSingle()

    if (data) return data

    if (i < maxRetries - 1) {
      const delay = 500 * Math.pow(2, i)
      console.warn(`⏳ Commande ${orderNum} introuvable, retry dans ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()

    // Vérification HMAC — si valide, on fait confiance directement (comme Stripe/PayPal)
    // Si absent ou invalide, on re-vérifie via API PayGreen ci-dessous
    const signature = req.headers.get('signature')
    const webhookHmac = Deno.env.get('PAYGREEN_WEBHOOK_HMAC')
    let hmacValid = false

    if (signature && webhookHmac) {
      try {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw', encoder.encode(webhookHmac),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
        )
        let sigBytes: Uint8Array
        try {
          sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
        } catch {
          sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
        }
        hmacValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))
        if (hmacValid) {
          console.log('✅ Signature HMAC valide — traitement direct sans re-vérification API')
        } else {
          console.warn('⚠️ Signature HMAC invalide — re-vérification via API PayGreen')
        }
      } catch (e) {
        console.warn('⚠️ Erreur vérification HMAC:', e.message, '— re-vérification via API')
      }
    } else if (!signature) {
      console.warn('⚠️ Webhook sans signature HMAC — re-vérification via API PayGreen')
    }

    const webhookData = JSON.parse(body)
    console.log('Webhook PayGreen reçu:', JSON.stringify(webhookData))

    const { id: paymentOrderId, event, reference } = webhookData
    const orderNum = reference

    if (!orderNum || !event) {
      console.error('Données webhook invalides:', { orderNum, event })
      return new Response(
        JSON.stringify({ error: 'Données invalides (reference ou event manquant)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // On ne traite que les événements de succès ou d'échec
    const isSuccess = event.includes('successed') || event.includes('success') || event.includes('paid')
    const isFailure = event.includes('refused') || event.includes('cancelled') || event.includes('canceled') || event.includes('expired')
    const isRefund = event.includes('refunded')

    if (!isSuccess && !isFailure && !isRefund) {
      console.log(`Event ignoré: ${event}`)
      return new Response(JSON.stringify({ ignored: true, event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer la commande
    const existingOrder = await findOrderWithRetry(supabase, orderNum, 3)
    if (!existingOrder) {
      console.error(`Commande ${orderNum} introuvable`)
      return new Response(
        JSON.stringify({ error: `Commande ${orderNum} introuvable` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const wasAlreadyPaid = existingOrder.statut !== 'pending'
    if (wasAlreadyPaid && !isRefund) {
      console.log(`Commande ${orderNum} déjà traitée (statut: ${existingOrder.statut}) — ignoré`)
      return new Response(JSON.stringify({ skipped: true, statut: existingOrder.statut }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Re-vérification API PayGreen uniquement si HMAC absent ou invalide
    let paymentPlatform: string | null = null
    if (isSuccess && paymentOrderId && !hmacValid) {
      const pgVerification = await verifyPaymentWithPaygreen(paymentOrderId)
      if (!pgVerification) {
        console.error(`❌ Impossible de vérifier le paiement ${paymentOrderId} chez PayGreen`)
        return new Response(
          JSON.stringify({ error: 'Vérification PayGreen impossible' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!pgVerification.status.includes('successed') && !pgVerification.status.includes('success') && !pgVerification.status.includes('paid')) {
        console.warn(`❌ PayGreen confirme que le paiement ${paymentOrderId} N'EST PAS réussi (${pgVerification.status}) — rejeté`)
        return new Response(
          JSON.stringify({ error: 'Paiement non confirmé par PayGreen', pg_status: pgVerification.status }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`✅ PayGreen confirme le paiement ${paymentOrderId}: ${pgVerification.status} (${pgVerification.platform ?? 'moyen inconnu'})`)
      paymentPlatform = pgVerification.platform
    }

    // Moyen de paiement (16/09/2026) : quand la signature HMAC est valide on ne verifie pas
    // chez PayGreen ; on fait alors UN appel de lecture, non bloquant, juste pour l'etiquette.
    if (isSuccess && paymentOrderId && !paymentPlatform) {
      try {
        const info = await verifyPaymentWithPaygreen(paymentOrderId)
        paymentPlatform = info?.platform ?? null
      } catch (_) { paymentPlatform = null }
    }

    // Mapper statut
    let newStatus = 'pending'
    if (isSuccess) newStatus = 'payee'
    else if (isFailure) newStatus = 'cancelled'
    else if (isRefund) newStatus = 'refunded'

    // Mettre à jour la commande
    const { data, error } = await supabase
      .from('orders')
      .update({
        statut: newStatus,
        paygreen_status: event,
        paygreen_transaction_id: paymentOrderId || existingOrder.paygreen_transaction_id,
        payment_confirmed_at: newStatus === 'payee' ? new Date().toISOString() : null,
        ...(paymentPlatform ? { payment_method: paymentPlatform } : {})
      })
      .eq('numero', orderNum)
      .select()

    if (error) {
      console.error('Erreur mise à jour commande:', error)
      throw error
    }

    console.log(`✅ Commande ${orderNum} → ${newStatus}`)

    // Le client a atteint la page de paiement et ca n a pas abouti : on previent.
    if (newStatus === 'cancelled' && data?.[0]?.id) {
      // Le webhook n'interroge PayGreen que sur les succes. Sur un echec on va chercher
      // le detail une fois, uniquement pour savoir si une carte a ete saisie.
      let pgDetail: any = null
      if (paymentOrderId) {
        try { pgDetail = await getPaymentOrderRaw(paymentOrderId) } catch (_) { /* non bloquant */ }
      }
      await alertPaiementEchoue(supabase, data[0].id, event, pgDetail)
    }

    // Auto-accept
    const { data: autoAcceptSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'auto_accept_orders')
      .maybeSingle()

    const autoAcceptEnabled = autoAcceptSetting?.value === 'true'
    const orderRecord = data?.[0]

    if (newStatus === 'payee' && autoAcceptEnabled && orderRecord) {
      const { error: acceptError } = await supabase
        .from('orders')
        .update({ statut: 'acceptee' })
        .eq('id', orderRecord.id)

      if (!acceptError) {
        console.log(`🤖 Auto-accept: ${orderNum} → acceptee`)

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        await Promise.allSettled([
          fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderRecord.id })
          }),
          fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: orderRecord.numero,
              pickupTime: orderRecord.heure_retrait || 'Dès que possible',
              total: (orderRecord.total || 0).toFixed(2),
              paymentMethod: 'paygreen',
              items: orderRecord.items || [],
              note: orderRecord.note || null
            })
          })
        ])
      }
    } else if (newStatus === 'payee' && !autoAcceptEnabled && orderRecord) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

      await Promise.allSettled([
        fetch(`${supabaseUrl}/functions/v1/send-payment-confirmation`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderRecord.id })
        }),
        fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: orderRecord.numero,
            pickupTime: orderRecord.heure_retrait || 'Dès que possible',
            total: (orderRecord.total || 0).toFixed(2),
            paymentMethod: 'paygreen',
            items: orderRecord.items || []
          })
        })
      ])
    }

    return new Response(
      JSON.stringify({ success: true, order: orderNum, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
