// Webhook Paygreen — vérification du paiement directement via API PayGreen
// Sécurité : on vérifie le paiement côté PayGreen (pas de dépendance au HMAC qui peut changer)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { alertPaiementEchoue } from '../_shared/paiement-echoue.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://beyrouth.express',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''

// Obtenir un JWT PayGreen pour appeler leur API
// Alerte « paiement echoue » : code commun dans _shared/paiement-echoue.ts (02/10/2026).
// Elle ne sonne plus que si ca vaut un appel (carte refusee, ou >= 2 essais sans payer) ;
// le reste part dans le resume du heartbeat de 08:00.

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
      .select('id, statut, payment_confirmed_at, paygreen_transaction_id, paygreen_status, total, heure_retrait, numero, items, note')
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
    // `authorized` = paiement accepte par la banque, argent garanti (28/09/2026) : la doc PayGreen
    // recommande de confirmer la commande sur cet evenement. Carte/Swile/Apple Pay passent
    // authorized -> successed dans la meme seconde, mais Conecs (Pluxee, Up, Bimpli) peut rester
    // en authorized : commande 2713 CR jamais arrivee au resto alors que le client avait paye.
    const isSuccess = event.includes('successed') || event.includes('success') || event.includes('paid') || event.includes('authorized')
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
      const etaitAutorise = String(existingOrder.paygreen_status ?? '').includes('authorized')

      // Encaissement arrive apres l'autorisation : la commande est deja payee et notifiee,
      // on note seulement que l'argent est encaisse (sert a l'alerte « jamais encaisse »).
      if (etaitAutorise && event.includes('successed')) {
        try {
          await supabase.from('orders').update({ paygreen_status: event }).eq('id', existingOrder.id)
        } catch (_) { /* non bloquant */ }
      }

      // Autorise puis annule/expire SANS jamais avoir ete encaisse : la commande a pu etre
      // preparee alors que l'argent ne rentrera pas. On previent, sans toucher au statut.
      if (etaitAutorise && isFailure) {
        try {
          const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
          const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
          if (botToken && chatId) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `⚠️ Paiement annule APRES autorisation — commande ${existingOrder.numero} (${Number(existingOrder.total ?? 0).toFixed(2)} EUR)\n` +
                  `PayGreen : ${event}. L'argent n'a jamais ete encaisse.\n` +
                  `Si c'est toi qui as annule/rembourse, rien a faire. Sinon verifie la commande.`
              })
            })
          }
        } catch (_) { /* non bloquant */ }
      }

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

      if (!pgVerification.status.includes('successed') && !pgVerification.status.includes('success') && !pgVerification.status.includes('paid') && !pgVerification.status.includes('authorized')) {
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
    // ATOMIQUE (28/09/2026) : depuis qu'on ecoute `authorized`, une carte envoie DEUX webhooks
    // quasi simultanes (authorized puis successed). Sans garde, les deux passeraient la lecture
    // « pending » ci-dessus et Paco recevrait deux notifs, le client deux mails. On ne change le
    // statut que s'il est ENCORE pending : un seul appel gagne, l'autre ne fait rien.
    let updateQuery = supabase
      .from('orders')
      .update({
        statut: newStatus,
        paygreen_status: event,
        paygreen_transaction_id: paymentOrderId || existingOrder.paygreen_transaction_id,
        payment_confirmed_at: newStatus === 'payee' ? new Date().toISOString() : null,
        ...(paymentPlatform ? { payment_method: paymentPlatform } : {})
      })
      .eq('numero', orderNum)
    if (!isRefund) updateQuery = updateQuery.eq('statut', 'pending')
    const { data, error } = await updateQuery.select()

    if (error) {
      console.error('Erreur mise à jour commande:', error)
      throw error
    }

    if (!isRefund && (!data || data.length === 0)) {
      // Un autre webhook (ou le fallback) a deja traite la commande entre-temps.
      // Si c'est l'encaissement qui arrive en second, on le note quand meme.
      if (event.includes('successed')) {
        try {
          await supabase.from('orders').update({ paygreen_status: event }).eq('id', existingOrder.id)
        } catch (_) { /* non bloquant */ }
      }
      console.log(`Commande ${orderNum} traitée en parallèle par un autre appel — ${event} ignoré`)
      return new Response(JSON.stringify({ skipped: true, reason: 'deja_traitee' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
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
              paymentMethod: paymentPlatform || 'paygreen',
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
            paymentMethod: paymentPlatform || 'paygreen',
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
