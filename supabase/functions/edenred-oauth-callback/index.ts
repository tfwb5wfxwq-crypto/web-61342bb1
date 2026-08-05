// Supabase Edge Function: Callback OAuth Edenred - Échange code → token → payment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// URLs Edenred PRODUCTION (EU region)
const EDENRED_AUTH_URL = 'https://sso.eu.edenred.io/connect/token'
const EDENRED_PAYMENT_URL = 'https://directpayment.eu.edenred.io/v2/transactions'
const EDENRED_MID = '1422285' // Merchant ID PROD (SARL PAPA)

// CORS restreint à beyrouth.express
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://beyrouth.express',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🔒 FIX #75: Helper pour fetch avec timeout (évite hang infini si API externe down)
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Timeout API externe (${timeoutMs}ms)`)
    }
    throw error
  }
}

// Alerte INTERNE (14/07/2026) : prévient l'admin sur Telegram quand un client Edenred (titre-resto)
// n'a PAS pu payer. Copie du helper de create-payment. Jamais bloquant.
async function notifyAdminBlocked(reason: string, info: { orderNum?: string, name?: string, phone?: string, email?: string, total?: number }) {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
    if (!botToken || !chatId) return
    const euros = (info.total != null) ? (info.total / 100).toFixed(2) + ' EUR' : '?'
    const text =
      `⚠️ Paiement Edenred bloqué — un client n'a pas pu payer\n` +
      `Raison : ${reason}\n` +
      `Client : ${info.name || '?'} — ${info.phone || '?'} (${info.email || '?'})\n` +
      `Panier : ${euros} — commande ${info.orderNum || '?'}\n` +
      `👉 Tu peux le rappeler pour récupérer la commande.`
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    })
  } catch (e) {
    console.error('notifyAdminBlocked (edenred) failed:', e)
  }
}

// 🔒 SÉCURITÉ : Vérifier si le restaurant est ouvert (7j/7 11h30-21h00)
function isOpenNow(): boolean {
  const now = new Date()
  // Convert to Paris timezone (UTC+1 or UTC+2 depending on DST)
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  const h = parisTime.getHours()
  const m = parisTime.getMinutes()
  const nowMin = h * 60 + m

  // Lun-Ven 11h30 (690 min) à 21h00 (1260 min)
  return nowMin >= 690 && nowMin <= 1260
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, state, total, redirectUri, orderNum } = await req.json()

    // Validation params
    if (!code || !orderNum || !total || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants (code, orderNum, total, redirectUri requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔐 OAuth callback Edenred: échange code pour commande ${orderNum}`)

    // Créer client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ===== VALIDATION CSRF : state OBLIGATOIRE depuis toutes les versions client =====
    if (!state) {
      console.error('❌ State CSRF manquant — requête rejetée')
      return new Response(
        JSON.stringify({ error: 'Token de sécurité manquant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    {
      const { data: storedState, error: stateError } = await supabase
        .from('oauth_states')
        .select('order_num, expires_at')
        .eq('state', state)
        .maybeSingle()

      if (stateError) {
        console.error('❌ Erreur lecture state CSRF:', stateError)
        return new Response(
          JSON.stringify({ error: 'Erreur validation sécurité' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Vérifier que le state existe
      if (!storedState) {
        console.error('❌ State CSRF invalide ou expiré:', state)
        return new Response(
          JSON.stringify({ error: 'Token de sécurité invalide ou expiré' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Vérifier que le state n'est pas expiré
      if (new Date(storedState.expires_at) < new Date()) {
        console.error('❌ State CSRF expiré:', state)
        // Supprimer le state expiré
        await supabase.from('oauth_states').delete().eq('state', state)
        return new Response(
          JSON.stringify({ error: 'Token de sécurité expiré' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Vérifier que le numéro de commande correspond
      if (storedState.order_num !== orderNum) {
        console.error(`❌ Mismatch order_num: state=${storedState.order_num}, fourni=${orderNum}`)
        return new Response(
          JSON.stringify({ error: 'Token de sécurité ne correspond pas à la commande' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Supprimer le state (usage unique)
      await supabase.from('oauth_states').delete().eq('state', state)
      console.log(`✅ Validation CSRF OK pour commande ${orderNum}`)
    }

    // ===== VALIDATION MONTANT : Recalculer côté serveur pour éviter manipulation =====
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('items, client_prenom, client_email, client_telephone')
      .eq('numero', orderNum)
      .maybeSingle()

    if (orderError || !orderData) {
      console.error('❌ Commande introuvable:', orderNum)
      return new Response(
        JSON.stringify({ error: 'Commande introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Infos client pour l'alerte admin (14/07/2026)
    const cInfo = { orderNum, name: orderData.client_prenom, phone: orderData.client_telephone, email: orderData.client_email, total }

    const items = orderData.items
    if (items && items.length > 0) {
      // Récupérer les prix des items depuis menu_items
      // FIX (14/07/2026) : dédoublonner les ids (2 formules identiques = même id → .in()
      // ne renvoie qu'une ligne). Même bug que create-payment. Le recalcul (.find) gère les doublons.
      const itemIds = items.map((i: any) => i.id)
      const uniqueItemIds = [...new Set(itemIds)]
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, prix, nom')
        .in('id', uniqueItemIds)

      if (!menuData || menuData.length !== uniqueItemIds.length) {
        await notifyAdminBlocked('Un plat du panier n\'existe plus en base', cInfo)
        return new Response(
          JSON.stringify({ error: 'Certains plats ne sont plus au menu. Veuillez créer une nouvelle commande.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Recalculer le montant côté serveur
      let serverTotal = 0
      items.forEach((item: any) => {
        const menuItem = menuData.find(m => m.id === item.id)
        if (!menuItem) {
          throw new Error(`Item invalide: ${item.id}`)
        }
        serverTotal += menuItem.prix * (item.qty || 1)
      })

      // Arrondir à 2 décimales puis convertir en centimes
      serverTotal = Math.round(serverTotal * 100)

      // 🔒 FIX #77: Vérifier que le montant client correspond (tolérance 1 centime pour arrondi au lieu de 2)
      const clientTotal = total // déjà en centimes
      if (Math.abs(serverTotal - clientTotal) > 1) {
        console.error('❌ MONTANT INVALIDE:', { serverTotal, clientTotal, diff: Math.abs(serverTotal - clientTotal) })
        await notifyAdminBlocked('Montant du panier obsolete (prix change)', cInfo)
        return new Response(
          JSON.stringify({
            error: 'Le montant de la commande a changé. Veuillez actualiser la page et créer une nouvelle commande.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Validation montant Edenred OK:', { serverTotal, clientTotal })
    }

    // Récupérer credentials depuis Supabase Secrets
    const authClientId = Deno.env.get('EDENRED_AUTH_CLIENT_ID') ?? ''
    const authClientSecret = Deno.env.get('EDENRED_AUTH_CLIENT_SECRET') ?? ''
    const paymentClientId = Deno.env.get('EDENRED_PAYMENT_CLIENT_ID') ?? ''
    const paymentClientSecret = Deno.env.get('EDENRED_PAYMENT_CLIENT_SECRET') ?? ''

    if (!authClientId || !authClientSecret) {
      throw new Error('Credentials OAuth Edenred manquants')
    }

    // ===== ÉTAPE 1 : Échanger le code contre un access_token =====
    console.log('📝 Échange code OAuth contre access_token...')
    const tokenResponse = await fetchWithTimeout(EDENRED_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: authClientId,
        client_secret: authClientSecret,
        redirect_uri: redirectUri
      })
    }, 10000)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Erreur échange code OAuth:', tokenResponse.status, errorText)
      await notifyAdminBlocked(`Echec connexion Edenred (OAuth ${tokenResponse.status})`, cInfo)

      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = JSON.stringify(errorJson, null, 2)
      } catch (e) {}

      return new Response(
        JSON.stringify({
          error: `Échec échange code OAuth (${tokenResponse.status})`,
          details: errorDetails
        }),
        { status: tokenResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('❌ Access token non reçu:', tokenData)
      return new Response(
        JSON.stringify({ error: 'Token OAuth non reçu' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Access token OAuth obtenu')

    // ===== ÉTAPE 2 : Créer le paiement avec le token =====
    console.log('💳 Création paiement Edenred...')

    const paymentPayload = {
      order_ref: orderNum,
      mid: EDENRED_MID,
      amount: total, // En centimes (nombre entier)
      capture_mode: 'auto',
      extra_field: `beyrouth-${orderNum}`,
      tstamp: new Date().toISOString()
    }

    const paymentResponse = await fetchWithTimeout(EDENRED_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Client-Id': paymentClientId,
        'X-Client-Secret': paymentClientSecret,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    }, 10000)

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error('❌ Erreur création paiement Edenred:', paymentResponse.status, errorText)
      await notifyAdminBlocked(`Edenred refuse la creation du paiement (${paymentResponse.status})`, cInfo)

      let edenredError = errorText
      try {
        const errorJson = JSON.parse(errorText)
        edenredError = errorJson.message || errorJson.error || errorText
      } catch (e) {}

      // Annuler la commande (paiement échoué)
      await supabase
        .from('orders')
        .update({ statut: 'cancelled', edenred_status: 'failed' })
        .eq('numero', orderNum)

      return new Response(
        JSON.stringify({
          error: `Échec création paiement Edenred (${paymentResponse.status}): ${edenredError}`
        }),
        {
          status: paymentResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paymentData = await paymentResponse.json()
    console.log('✅ Paiement Edenred créé:', JSON.stringify(paymentData))

    // Vérifier le statut de la réponse Edenred
    if (paymentData.meta?.status !== 'succeeded') {
      console.error('❌ Paiement Edenred échoué:', paymentData)
      await notifyAdminBlocked('Paiement Edenred refuse (non succeeded)', cInfo)

      // Annuler la commande (paiement échoué)
      await supabase
        .from('orders')
        .update({ statut: 'cancelled', edenred_status: 'failed' })
        .eq('numero', orderNum)

      return new Response(
        JSON.stringify({
          error: 'Paiement Edenred échoué',
          details: paymentData.meta?.messages || paymentData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const captureId = paymentData.data?.capture_id || paymentData.data?.authorization_id
    const capturedAmount = paymentData.data?.captured_amount
    const transactionStatus = paymentData.data?.status

    if (!captureId || transactionStatus !== 'captured') {
      console.error('❌ Transaction non capturée:', paymentData)
      await notifyAdminBlocked('Transaction Edenred non capturee', cInfo)

      // Annuler la commande (transaction non capturée)
      await supabase
        .from('orders')
        .update({ statut: 'cancelled', edenred_status: 'not_captured' })
        .eq('numero', orderNum)

      return new Response(
        JSON.stringify({
          error: 'Transaction non capturée',
          debug: paymentData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour la commande : paiement capturé = statut "payee"

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        edenred_payment_id: captureId,
        edenred_status: 'captured',
        statut: 'payee', // Paiement confirmé
        payment_confirmed_at: new Date().toISOString()
      })
      .eq('numero', orderNum)
      .select()

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError)
      throw updateError
    }

    console.log(`✅ Paiement Edenred capturé (${capturedAmount} centimes), commande ${orderNum} payée`)

    // Vérifier si auto-accept est activé (même logique que PayGreen webhook)
    const { data: autoAcceptSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'auto_accept_orders')
      .maybeSingle()

    const autoAcceptEnabled = autoAcceptSetting?.value === 'true'

    const isOpen = isOpenNow()
    console.log(`🤖 Auto-accept: ${autoAcceptEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`)
    console.log(`🕐 Restaurant: ${isOpen ? 'OUVERT' : 'FERMÉ'}`)

    // Si AUTO-ACCEPT activé ET restaurant OUVERT : passer directement en statut "acceptee" + email
    if (autoAcceptEnabled && isOpen && updatedOrder && updatedOrder[0]) {
      console.log(`🤖 Auto-accept activé, passage automatique en "acceptee" pour ${orderNum}`)

      // Update statut à "acceptee"
      const { error: acceptError } = await supabase
        .from('orders')
        .update({ statut: 'acceptee' })
        .eq('id', updatedOrder[0].id)

      if (acceptError) {
        console.error('Erreur auto-accept:', acceptError)
      } else {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Envoyer email d'acceptation
        try {
          const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: updatedOrder[0].id })
          })
          const emailResult = await emailResp.json().catch(() => ({}))
          if (!emailResp.ok) {
            console.error('❌ Erreur envoi email confirmation:', emailResp.status, JSON.stringify(emailResult))
          } else {
            console.log(`📧 Email d'acceptation envoyé pour ${orderNum}`)
          }
        } catch (emailError) {
          console.error('Erreur envoi email acceptation:', emailError)
        }

        // 📱 Envoyer notification Telegram
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: updatedOrder[0].numero,
              pickupTime: updatedOrder[0].heure_retrait || 'Dès que possible',
              total: updatedOrder[0].total.toFixed(2),
              paymentMethod: 'edenred',
              items: updatedOrder[0].items || [],
              note: updatedOrder[0].note || null
            })
          })
          console.log(`📱 Notification Telegram envoyée pour ${orderNum}`)
        } catch (telegramError) {
          console.error('❌ Erreur notification Telegram:', telegramError)
        }
      }
    }
    // Si AUTO-ACCEPT désactivé OU restaurant FERMÉ : envoyer email de paiement (en attente validation)
    else if (updatedOrder && updatedOrder[0]) {
      const reason = !autoAcceptEnabled ? 'Auto-accept désactivé' : 'Restaurant fermé'
      console.log(`⏸️ ${reason} → en attente validation manuelle`)

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

      try {
        const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-payment-confirmation`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: updatedOrder[0].id })
        })
        const emailResult = await emailResp.json().catch(() => ({}))
        if (!emailResp.ok) {
          console.error('❌ Erreur envoi email paiement:', emailResp.status, JSON.stringify(emailResult))
        } else {
          console.log(`📧 Email de confirmation paiement envoyé pour ${orderNum}`)
        }
      } catch (emailError) {
        console.error('Erreur appel send-payment-confirmation:', emailError)
      }

      // 📱 Envoyer notification Telegram
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: updatedOrder[0].numero,
            pickupTime: updatedOrder[0].heure_retrait || 'Dès que possible',
            total: updatedOrder[0].total.toFixed(2),
            paymentMethod: 'edenred',
            items: updatedOrder[0].items || []
          })
        })
        console.log(`📱 Notification Telegram envoyée pour ${orderNum}`)
      } catch (telegramError) {
        console.error('❌ Erreur notification Telegram:', telegramError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNum: orderNum,
        captureId: captureId,
        amount: capturedAmount,
        status: 'captured'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur OAuth callback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
