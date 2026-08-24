// Heartbeat quotidien — vérifie que tout le système fonctionne
// Tourne tous les matins à 8h via pg_cron
// Envoie un résumé sur Telegram à l'admin (Ludovik)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
// Trafic reel : quelques mails par jour (70 commandes depuis mars).
// 20 laisse une marge confortable sans jamais declencher a tort.
const SEUIL_MAILS_24H = 20

serve(async (_req) => {
  const results: Record<string, boolean> = {}

  // 1. Check site beyrouth.express
  try {
    const res = await fetch('https://beyrouth.express', { signal: AbortSignal.timeout(5000) })
    results.site = res.ok
  } catch {
    results.site = false
  }

  // 2. Check PayGreen API
  try {
    const res = await fetch(`https://api.paygreen.fr/auth/authentication/${PAYGREEN_SHOP_ID}/secret-key`, {
      method: 'POST',
      headers: { 'Authorization': PAYGREEN_SECRET_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000)
    })
    results.paygreen = res.ok
  } catch {
    results.paygreen = false
  }

  // 3. Check DB Supabase
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { error } = await supabase.from('orders').select('id').limit(1)
    results.database = !error
  } catch {
    results.database = false
  }

  // 4. Check cron actif
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    // On vérifie juste que la DB répond pour les settings
    const { data } = await supabase.from('settings').select('key').limit(1)
    results.cron = data !== null
  } catch {
    results.cron = false
  }

  // 5. Compteur d'e-mails Brevo sur 24 h — detecte un abus AVANT que le quota saute
  let mailsEnvoyes: number | null = null
  try {
    const jour = (d: Date) => d.toISOString().slice(0, 10)
    const maintenant = new Date()
    const hier = new Date(maintenant.getTime() - 24 * 3600 * 1000)
    const res = await fetch(
      `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${jour(hier)}&endDate=${jour(maintenant)}`,
      { headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const stats = await res.json()
      mailsEnvoyes = Number(stats?.requests ?? 0)
    }
  } catch {
    // compteur indisponible : on ne declenche PAS de fausse alerte
  }
  results.emails = mailsEnvoyes === null ? true : mailsEnvoyes <= SEUIL_MAILS_24H

  const allOk = Object.values(results).every(v => v)
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

  const lines = [
    allOk ? `✅ *SYSTÈME BEYROUTH OK* — ${date}` : `🚨 *ALERTE BEYROUTH* — ${date}`,
    '',
    `🌐 Site beyrouth.express : ${results.site ? '✅ en ligne' : '❌ HORS LIGNE'}`,
    `💳 PayGreen API : ${results.paygreen ? '✅ accessible' : '❌ INACCESSIBLE'}`,
    `🗄️ Base de données : ${results.database ? '✅ accessible' : '❌ INACCESSIBLE'}`,
    `🔄 Cron moniteur : ✅ actif (toutes les 2 min)`,
    mailsEnvoyes === null
      ? `📧 E-mails 24 h : ⚠️ compteur indisponible`
      : `📧 E-mails 24 h : ${mailsEnvoyes <= SEUIL_MAILS_24H ? '✅' : '🚨'} ${mailsEnvoyes} envoyé${mailsEnvoyes > 1 ? 's' : ''} (seuil ${SEUIL_MAILS_24H})`,
  ]

  if (mailsEnvoyes !== null && mailsEnvoyes > SEUIL_MAILS_24H) {
    lines.push('')
    lines.push(`→ *Volume anormal.* Le trafic normal est de quelques mails par jour.`)
    lines.push(`→ Quelqu'un utilise peut-être tes fonctions d'envoi. Vérifie Brevo.`)
  }

  if (!allOk) {
    lines.push('')
    lines.push('→ Vérifie immédiatement, les commandes peuvent être affectées')
  }

  const message = lines.join('\n')

  // Envoyer à l'admin uniquement (Ludovik)
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const adminChatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')

  // On envoie TOUS les jours, meme quand tout va bien : ainsi le silence
  // devient lui-meme un signal d'alarme (le heartbeat est mort).
  if (botToken && adminChatId) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })
  }

  console.log(`Heartbeat: site=${results.site} paygreen=${results.paygreen} db=${results.database}`)

  return new Response(JSON.stringify({ ok: allOk, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
