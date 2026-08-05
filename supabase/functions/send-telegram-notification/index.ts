// Edge Function: Envoyer notification Telegram pour nouvelle commande
// (affiche le client + son rang de fidélité, cf. getClientInfo plus bas)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Le message part en parse_mode Markdown (legacy). Doc Telegram : les caractères _ * ` [
// doivent être précédés d'un backslash hors entité. Un seul non apparié dans une note
// client ou un nom de plat suffit à faire rejeter le message entier en 400 "can't parse
// entities" → Paco n'est PAS notifié, sans retry ni alerte. Vérifié contre l'API réelle.
// On échappe plutôt que de supprimer : une note d'allergie ne doit rien perdre.
// Le backslash lui-même est dans la classe, sinon il échapperait le caractère suivant.
function safeMd(txt: unknown): string {
  return String(txt ?? '').replace(/([\\_*`\[])/g, '\\$1')
}

// Récupère le prénom du client + son nombre total de commandes (fidélité).
// Fait ici plutôt que chez les 5 appelants (webhook PayGreen, Edenred, monitor) :
// un seul endroit à maintenir. Toute erreur est avalée → la notif part quand même.
async function getClientInfo(orderNumber: string): Promise<{ prenom: string | null, count: number | null }> {
  const empty = { prenom: null, count: null }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey || !orderNumber) return empty

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: order } = await supabase
      .from('orders')
      .select('client_prenom, client_email')
      .eq('numero', orderNumber)
      .maybeSingle()

    if (!order) return empty
    if (!order.client_email) return { prenom: order.client_prenom || null, count: null }

    // clients.nombre_commandes est maintenu par le trigger update_client_stats, qui a déjà
    // tourné au passage en "payee" → le compteur inclut la commande en cours ("2e" = sa 2e).
    const { data: client } = await supabase
      .from('clients')
      .select('nombre_commandes')
      .eq('email', order.client_email)
      .maybeSingle()

    return {
      prenom: order.client_prenom || null,
      count: typeof client?.nombre_commandes === 'number' ? client.nombre_commandes : null
    }
  } catch (e) {
    console.error('⚠️ Lookup client échoué (notif envoyée sans le nom):', e)
    return empty
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://beyrouth.express',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderNumber, pickupTime, total, paymentMethod, items, note } = await req.json()

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Config Telegram manquante')
      return new Response(
        JSON.stringify({ error: 'Config Telegram manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Formater les items (avec détails formule si applicable)
    const itemsList = items && items.length > 0
      ? items.map((item: any) => {
          const qty = item.quantite || item.qty || 1
          let line = `• ${qty}x ${safeMd(item.nom)}`
          if (item.isFormule && item.components && item.components.length > 0) {
            line += `\n  ↳ ${item.components.map((c: any) => safeMd(c)).join(' · ')}`
          }
          return line
        }).join('\n')
      : 'Aucun détail'

    // Note client (si présente) — texte libre saisi par le client, donc échappé
    const noteSection = note ? `\n\n⚠️ *Note client* : ${safeMd(note)}` : ''

    // Client + fidélité (ligne omise si le lookup n'a rien donné)
    const { prenom, count } = await getClientInfo(orderNumber)
    let clientSection = ''
    const prenomSafe = prenom ? safeMd(prenom.trim()) : ''
    if (prenomSafe) {
      const rang = count && count >= 1
        ? (count === 1 ? ' (1re commande)' : ` (${count}e commande)`)
        : ''
      clientSection = `\n👤 *Client* : ${prenomSafe}${rang}`
    }

    // Message Telegram avec emoji et formatage
    const message = `
🆕 *NOUVELLE COMMANDE*

📦 *Commande* : \`${orderNumber}\`${clientSection}
⏰ *Retrait* : ${pickupTime || 'Dès que possible'}
💰 *Total* : *${total}€*
💳 *Paiement* : ${paymentMethod === 'edenred' ? '🎫 Edenred' : '💳 PayGreen'}

*Articles :*
${itemsList}${noteSection}
    `.trim()

    // Envoyer via Telegram Bot API
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      }
    )

    const telegramData = await telegramResponse.json()

    if (!telegramData.ok) {
      console.error('❌ Erreur Telegram API:', telegramData)
      throw new Error(telegramData.description || 'Erreur Telegram')
    }

    console.log(`✅ Notification Telegram envoyée pour commande ${orderNumber}`)

    return new Response(
      JSON.stringify({ success: true, messageId: telegramData.result.message_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur send-telegram-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
