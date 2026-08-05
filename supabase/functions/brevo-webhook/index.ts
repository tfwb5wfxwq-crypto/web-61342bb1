// Récepteur des événements Brevo (14/07/2026)
// Brevo POSTe ici quand un mail est délivré / ouvert / rejeté → on remplit le statut
// email de la commande correspondante. ISOLÉ : ne touche ni paiements ni commandes,
// écrit UNIQUEMENT les colonnes email_* de `orders`.
// Protégé par un jeton dans l'URL (?token=...) car déployé sans JWT (Brevo appelle de l'extérieur).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_TOKEN = Deno.env.get('BREVO_WEBHOOK_TOKEN') ?? ''

serve(async (req) => {
  // Sécurité : jeton obligatoire dans l'URL
  const url = new URL(req.url)
  if (!WEBHOOK_TOKEN || url.searchParams.get('token') !== WEBHOOK_TOKEN) {
    return new Response('unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()
    const events = Array.isArray(body) ? body : [body]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let updated = 0
    for (const ev of events) {
      const email = ev?.email
      const type = String(ev?.event || '').toLowerCase()
      if (!email) continue

      // Trouver la commande la plus récente de ce client à qui un mail a été envoyé
      const { data: orders } = await supabase
        .from('orders')
        .select('id, email_status')
        .eq('client_email', email)
        .not('confirmation_email_sent_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!orders || orders.length === 0) continue
      const order = orders[0]
      const now = new Date().toISOString()
      const patch: Record<string, unknown> = {}

      if (type === 'delivered') {
        patch.email_delivered_at = now
        // ne pas rétrograder si déjà 'opened'
        if (order.email_status !== 'opened') patch.email_status = 'delivered'
      } else if (type === 'opened' || type === 'unique_opened' || type === 'proxy_open') {
        patch.email_status = 'opened'
        patch.email_opened_at = now
      } else if (['hard_bounce', 'soft_bounce', 'blocked', 'spam', 'invalid_email', 'error', 'deferred'].includes(type)) {
        patch.email_status = 'error'
        patch.email_error = String(ev?.reason || type)
      } else {
        continue // event non suivi (request, click, unsubscribe, opened déjà géré...)
      }

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id)
      if (!error) updated++
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('brevo-webhook error:', e)
    // Répondre 200 même sur erreur pour éviter que Brevo re-tente en boucle
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }
})
