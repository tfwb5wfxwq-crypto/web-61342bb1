// Supabase Edge Function pour créer un paiement Paygreen sécurisé
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYGREEN_API_URL = 'https://api.paygreen.fr/payment/payment-orders'
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''
const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''

// CORS dynamique pour accepter beyrouth.express et www.beyrouth.express
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigins = ['https://beyrouth.express', 'https://www.beyrouth.express']
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://beyrouth.express'

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// Helper pour parser le pickup time (format: "Aujourd'hui 14h30", "Demain 11h00", "Lundi 12h00")
function parsePickupTime(pickup: string): Date | null {
  if (!pickup || pickup === 'asap') return null

  const now = new Date()
  let targetDate = new Date(now)

  // Extraire l'heure (format: "14h30")
  const timeMatch = pickup.match(/(\d+)h(\d+)/)
  if (!timeMatch) return null

  const hours = parseInt(timeMatch[1])
  const minutes = parseInt(timeMatch[2])

  // Déterminer le jour
  if (pickup.includes('Aujourd\'hui') || pickup.includes("Aujourd'hui")) {
    targetDate.setHours(hours, minutes, 0, 0)
  } else if (pickup.includes('Demain')) {
    targetDate.setDate(targetDate.getDate() + 1)
    targetDate.setHours(hours, minutes, 0, 0)
  } else {
    // Jour de la semaine (Lundi, Mardi, etc.)
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const jourIndex = jours.findIndex(j => pickup.includes(j))
    if (jourIndex === -1) return null

    // Trouver le prochain jour correspondant
    const currentDay = now.getDay()
    let daysToAdd = jourIndex - currentDay
    if (daysToAdd <= 0) daysToAdd += 7 // Si déjà passé cette semaine, aller à la semaine prochaine

    targetDate.setDate(targetDate.getDate() + daysToAdd)
    targetDate.setHours(hours, minutes, 0, 0)
  }

  return targetDate
}

// Alerte INTERNE (14/07/2026) : prévient l'admin sur Telegram quand un client n'a PAS pu payer,
// avec son nom + téléphone + la raison, pour qu'on puisse le rappeler et sauver la vente.
// Rien de plus n'est montré au client (aucune surface d'attaque en plus). Jamais bloquant.
async function notifyAdminBlocked(reason: string, info: { orderNum?: string, name?: string, phone?: string, email?: string, total?: number }) {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
    if (!botToken || !chatId) return
    const euros = (info.total != null) ? (info.total / 100).toFixed(2) + ' EUR' : '?'
    const text =
      `⚠️ Paiement bloqué — un client n'a pas pu payer\n` +
      `Raison : ${reason}\n` +
      `Client : ${info.name || '?'} — ${info.phone || '?'} (${info.email || '?'})\n` +
      `Panier : ${euros} — commande ${info.orderNum || '?'}\n` +
      `👉 Tu peux le rappeler pour récupérer la commande.`
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    })
  } catch (e) {
    console.error('notifyAdminBlocked failed (non bloquant):', e)
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderNum, total, email, name, phone, pickup, note, items } = await req.json()

    // Validation params
    if (!orderNum || !total || !email || !name) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Init Supabase client (on en aura besoin pour les validations)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ===== RATE LIMITING : max 5 VRAIES sessions de paiement par email en 10 min =====
    // FIX (14/07/2026) : on ne compte QUE les pending ayant réellement démarré un paiement
    // (paygreen_transaction_id non nul). Avant, les tentatives échouées AVANT PayGreen
    // (ex. panier bloqué) comptaient aussi → un client qui réessayait s'auto-bloquait 10 min.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentOrdersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('client_email', email)
      .eq('statut', 'pending')
      .not('paygreen_transaction_id', 'is', null)
      .gte('created_at', tenMinutesAgo)

    if ((recentOrdersCount ?? 0) >= 5) {
      await notifyAdminBlocked('Trop de tentatives (rate-limit 5 sessions de paiement / 10 min)', { orderNum, name, phone, email, total })
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Veuillez patienter 10 minutes avant de réessayer.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ===== VALIDATION #0 : PAUSE INDÉFINIE =====
    const { data: indefinitePauseData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'indefinite_pause')
      .maybeSingle()

    if (indefinitePauseData?.value === 'true') {
      return new Response(
        JSON.stringify({
          error: 'Click & collect temporairement fermé.\n\nPour vos événements (10+ personnes), découvrez notre service traiteur :\nbeyrouth.express/traiteur'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ===== VALIDATION #1 : PAUSE ADMIN =====
    const { data: pauseData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'next_slot_available_at')
      .maybeSingle()

    if (pauseData?.value) {
      const pauseDate = new Date(pauseData.value)
      const now = new Date()

      // Si pause active et pickup = "asap", refuser
      if (pickup === 'asap' && pauseDate > now) {
        return new Response(
          JSON.stringify({ error: 'Restaurant en pause. Actualisez la page et choisissez un autre créneau.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Si pickup est un créneau spécifique, valider qu'il est après la pause
      if (pickup !== 'asap') {
        // Parser "Aujourd'hui 14h30", "Demain 11h00", etc.
        const pickupDate = parsePickupTime(pickup)
        if (pickupDate && pickupDate < pauseDate) {
          return new Response(
            JSON.stringify({ error: 'Ce créneau n\'est plus disponible. Actualisez la page.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ===== VALIDATION #2 : MENU DISPONIBLE =====
    // SÉCURITÉ : items obligatoire — refuse toute commande sans articles (évite bypass montant)
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'La commande ne contient aucun article.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const itemIds = items.map((i: any) => i.id)
    // FIX (13/07/2026) : dédoublonner les ids. Deux lignes du même plat (ex. 2 formules
    // identiques à garnitures différentes) partagent le même id ; .in() ne renvoie qu'UNE
    // ligne, donc comparer à items.length rejetait à tort la commande ("Certains plats ne
    // sont plus au menu"). On compare au nombre d'ids DISTINCTS.
    const uniqueItemIds = [...new Set(itemIds)]
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('id, disponible, nom, prix')
      .in('id', uniqueItemIds)

    // Vérifier que tous les items existent
    if (!menuData || menuData.length !== uniqueItemIds.length) {
      await notifyAdminBlocked('Un plat du panier n\'existe plus en base', { orderNum, name, phone, email, total })
      return new Response(
        JSON.stringify({ error: 'Certains plats ne sont plus au menu. Actualisez la page.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier que tous les items sont disponibles
    const unavailableItems = menuData.filter(i => !i.disponible)
    if (unavailableItems.length > 0) {
      await notifyAdminBlocked(`Plat indisponible : ${unavailableItems[0].nom}`, { orderNum, name, phone, email, total })
      return new Response(
        JSON.stringify({
          error: `Le plat "${unavailableItems[0].nom}" n'est plus disponible. Actualisez la page.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // VALIDATION CRITIQUE : Recalculer le montant côté serveur pour éviter manipulation
    let serverTotal = 0
    items.forEach((item: any) => {
      const menuItem = menuData.find(m => m.id === item.id)
      if (!menuItem) {
        throw new Error(`Item invalide: ${item.id}`)
      }
      serverTotal += menuItem.prix * (item.qty || 1)
    })

    // Arrondir à 2 décimales
    serverTotal = Math.round(serverTotal * 100) / 100

    // Vérifier que le montant client correspond (tolérance 0.02€ pour arrondi)
    const clientTotal = total / 100 // total est en centimes
    if (Math.abs(serverTotal - clientTotal) > 0.02) {
      console.error('MONTANT INVALIDE:', { serverTotal, clientTotal, diff: Math.abs(serverTotal - clientTotal) })
      await notifyAdminBlocked('Montant du panier obsolète (prix changé côté serveur)', { orderNum, name, phone, email, total })
      return new Response(
        JSON.stringify({
          error: 'Le montant de la commande a changé. Veuillez actualiser la page et réessayer.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Validation montant OK:', { serverTotal, clientTotal })

    // Étape 1 : Obtenir un JWT token depuis l'Auth API
    const authResponse = await fetch(`https://api.paygreen.fr/auth/authentication/${PAYGREEN_SHOP_ID}/secret-key`, {
      method: 'POST',
      headers: {
        'Authorization': PAYGREEN_SECRET_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('Erreur Auth Paygreen:', authResponse.status, errorText)
      await notifyAdminBlocked(`PayGreen injoignable — auth ${authResponse.status} (panne systeme)`, { orderNum, name, phone, email, total })
      return new Response(
        JSON.stringify({ error: `Auth Paygreen (${authResponse.status}): ${errorText}` }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authData = await authResponse.json()
    const jwtToken = authData.data?.token || authData.token

    if (!jwtToken) {
      console.error('JWT token non reçu:', authData)
      await notifyAdminBlocked('PayGreen : JWT non recu (panne systeme)', { orderNum, name, phone, email, total })
      return new Response(
        JSON.stringify({ error: 'JWT token non reçu de PayGreen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Séparer prénom/nom (PayGreen exige lastName non vide)
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0] || 'Client'
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'Beyrouth'

    // Étape 2 : Créer la requête de paiement Paygreen (API v3)
    const paygreenPayload = {
      reference: orderNum,
      amount: total, // Déjà en centimes
      currency: 'eur',
      mode: 'instant',
      auto_capture: true,
      shop_id: PAYGREEN_SHOP_ID,
      description: `Commande ${orderNum} - Beyrouth Express`,
      // 11/08/2026 CORRECTIF : commande.html a ete SUPPRIMEE le 28/03 (commit 8753145,
      // « non utilise, modal suffit ») mais ces deux URL n avaient pas suivi : elles
      // renvoyaient donc le client vers une page 404 APRES son paiement.
      // Le parcours normal n est pas concerne (Paygreen est embarque dans la page et
      // c est index.html:2438 qui redirige), MAIS les cartes restaurant Edenred/Swile
      // sortent du domaine pour s authentifier et reviennent par ces URL : ces clients
      // tombaient sur une 404 apres avoir paye.
      // confirmation.html lit le meme parametre `num` (l.690) et gere tous les etats.
      return_url: `https://beyrouth.express/confirmation.html?num=${orderNum}&status=success`,
      cancel_url: `https://beyrouth.express/confirmation.html?num=${orderNum}&status=cancelled`,
      buyer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || ''
      },
      metadata: {
        pickup_time: pickup || 'asap',
        note: note || '',
        items_count: items?.length || 0
      }
    }

    // Appeler l'API Paygreen avec JWT token
    const paygreenResponse = await fetch(PAYGREEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paygreenPayload)
    })

    if (!paygreenResponse.ok) {
      const errorText = await paygreenResponse.text()
      console.error('Erreur Paygreen:', paygreenResponse.status, errorText)
      await notifyAdminBlocked(`PayGreen refuse la creation du paiement (${paygreenResponse.status})`, { orderNum, name, phone, email, total })

      // Essayer de parser l'erreur JSON de Paygreen
      let paygreenError = errorText
      try {
        const errorJson = JSON.parse(errorText)
        paygreenError = errorJson.message || errorJson.error || errorText
      } catch (e) {
        // Si pas JSON, utiliser le texte brut
      }

      return new Response(
        JSON.stringify({
          error: `Paygreen (${paygreenResponse.status}): ${paygreenError}`
        }),
        {
          status: paygreenResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paygreenData = await paygreenResponse.json()
    console.log('PayGreen response:', JSON.stringify(paygreenData))

    // Extraire les données (PayGreen peut renvoyer {data: {...}} ou directement {...})
    const paymentOrder = paygreenData.data || paygreenData
    const paymentUrl = paymentOrder.hosted_payment_url || paymentOrder.url
    const transactionId = paymentOrder.id
    const objectSecret = paymentOrder.object_secret

    if (!transactionId || !objectSecret) {
      console.error('Données PayGreen invalides:', paygreenData)
      await notifyAdminBlocked('PayGreen : reponse invalide (pas de transaction)', { orderNum, name, phone, email, total })
      return new Response(
        JSON.stringify({
          error: 'Réponse PayGreen invalide',
          debug: paygreenData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour la commande avec l'ID de transaction Paygreen
    await supabase
      .from('orders')
      .update({
        paygreen_transaction_id: transactionId,
        paygreen_status: 'pending'
      })
      .eq('numero', orderNum)

    return new Response(
      JSON.stringify({
        paymentOrderId: transactionId,
        objectSecret: objectSecret,
        paymentUrl: paymentUrl // Fallback pour compatibilité
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
