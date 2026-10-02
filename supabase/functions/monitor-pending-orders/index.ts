// Moniteur de commandes bloquées — tourne toutes les 2 min via pg_cron
// Filet de sécurité si le webhook PayGreen échoue pour n'importe quelle raison
// Le client peut fermer son téléphone : cette fonction rattrapera le coup
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { alertPaiementEchoue, suiviPaiementsRecuperes } from '../_shared/paiement-echoue.ts'

const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''

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

    // ===== Autorisé mais JAMAIS encaissé (ajout 28/09/2026) =====
    // Depuis qu'on accepte `authorized` comme paye, une commande peut etre preparee alors que
    // PayGreen n'a pas encore encaisse (Conecs/Pluxee : 2713 CR restee 25+ min en authorized).
    // 30 min apres la confirmation, si PayGreen dit TOUJOURS authorized, on previent une fois
    // (fenetre de 2 min = une seule passe du cron). Isole et non bloquant.
    try {
      const t30 = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const t32 = new Date(Date.now() - 32 * 60 * 1000).toISOString()
      const { data: nonEncaisses } = await supabase
        .from('orders')
        .select('id, numero, total, client_prenom, paygreen_transaction_id')
        .like('paygreen_status', '%authorized%')
        .not('statut', 'in', '(cancelled,refunded)')
        .lte('payment_confirmed_at', t30)
        .gt('payment_confirmed_at', t32)
      if (nonEncaisses && nonEncaisses.length > 0) {
        const jwtA = await getPaygreenJWT()
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
        const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
        for (const o of nonEncaisses) {
          if (!o.paygreen_transaction_id) continue
          const r = await fetch(`https://api.paygreen.fr/payment/payment-orders/${o.paygreen_transaction_id}`, {
            headers: { 'Authorization': `Bearer ${jwtA}`, 'Accept': 'application/json' }
          })
          if (!r.ok) continue
          const st = String((await r.json())?.data?.status ?? '')
          if (!st.includes('authorized')) {
            // Encaisse (ou annule) entre-temps : on met juste l'etiquette a jour, sans alerte ici.
            if (st) await supabase.from('orders').update({ paygreen_status: st }).eq('id', o.id)
            continue
          }
          if (botToken && chatId) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `⚠️ Paiement autorise mais PAS encore encaisse depuis 30 min — commande ${o.numero} (${o.client_prenom || '?'}, ${Number(o.total ?? 0).toFixed(2)} EUR)\n` +
                  `Le client a bien paye (argent bloque sur sa carte), mais PayGreen n'a pas encore encaisse.\n` +
                  `👉 Verifier dans PayGreen (paiement ${o.paygreen_transaction_id}).`
              })
            })
          }
        }
      }
    } catch (e) {
      console.error('⚠️ Controle autorise-non-encaisse echoue (non bloquant):', e)
    }

    // ===== « ✅ finalement payé » (ajout 02/10/2026) =====
    // Une alerte « paiement echoue » a ete envoyee et le meme client a paye depuis (< 2 h) :
    // on le dit UNE fois, pour que personne ne rappelle un client qui a deja paye.
    // Une seule requete legere quand il n'y a rien a faire. Isole et non bloquant.
    await suiviPaiementsRecuperes(supabase)

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
        // `authorized` = argent garanti (Conecs peut y rester, cf. 2713 CR du 28/09/2026).
        // PayGreen ecrit `canceled` (un seul L) : l'ancien test `cancelled` ne l'attrapait jamais.
        let newStatus = 'pending'
        if (pgStatus.includes('successed') || pgStatus.includes('success') || pgStatus.includes('paid') || pgStatus.includes('authorized')) {
          newStatus = autoAccept ? 'acceptee' : 'payee'
        } else if (pgStatus.includes('refused') || pgStatus.includes('cancelled') || pgStatus.includes('canceled') || pgStatus.includes('expired')) {
          newStatus = 'cancelled'
        }

        if (newStatus === 'pending') continue // Genuinement en attente, on laisse

        const isPaid = newStatus === 'payee' || newStatus === 'acceptee'
        const now = new Date().toISOString()

        // ATOMIQUE : seulement si ENCORE pending (le webhook a pu passer entre-temps).
        const { data: claimed, error: updateErr } = await supabase
          .from('orders')
          .update({
            statut: newStatus,
            paygreen_status: pgStatus,
            payment_confirmed_at: isPaid ? now : null
          })
          .eq('id', order.id)
          .eq('statut', 'pending')
          .select('id')

        if (updateErr) {
          console.error(`❌ Update failed for ${order.numero}:`, updateErr)
          continue
        }
        if (!claimed || claimed.length === 0) continue // deja traitee ailleurs, pas de doublon

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
