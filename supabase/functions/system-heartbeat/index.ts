// Heartbeat quotidien — vérifie que tout le système fonctionne
// Tourne tous les matins à 8h via pg_cron (job 3 `system-heartbeat-daily`)
// Envoie un résumé sur Telegram à l'admin (Ludovik), TOUS les jours (le silence = alarme)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resumeAbandons } from '../_shared/paiement-echoue.ts'

const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID') ?? ''
const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY') ?? ''
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
// Trafic reel : quelques mails par jour (70 commandes depuis mars).
// 20 laisse une marge confortable sans jamais declencher a tort.
const SEUIL_MAILS_24H = 20

// ─── Contrôle du site (02/10/2026) ────────────────────────────────────────────
// Avant : UN seul fetch, 5 s de timeout, depuis AWS Dublin. Le HTML n'est jamais servi par
// le cache Cloudflare (DYNAMIC) → un aller-retour GitHub Pages un peu lent suffisait à
// afficher « HORS LIGNE » (faux positif du 02/10 à 08:00).
// Maintenant : jusqu'à 3 essais, 10 s chacun, démarrés à 0 / 20 / 40 s (pire cas ≈ 50 s,
// sous le timeout pg_net de 60 s). HORS LIGNE seulement si les 3 échouent, avec la cause.
// Une page 200 vide ou d'erreur ne compte pas : elle doit contenir « Beyrouth ».
const SITE_URL = 'https://beyrouth.express/'
const SITE_ESSAIS = 3
const SITE_TIMEOUT_MS = 10_000
const SITE_ECART_MS = 20_000
const SITE_MOT_ATTENDU = 'Beyrouth'

type EssaiSite = { ok: boolean; cause: string; ms: number }
type EtatSite = { etat: 'ok' | 'lent' | 'ko'; essais: EssaiSite[] }

async function essaiSite(): Promise<EssaiSite> {
  const t = Date.now()
  try {
    const res = await fetch(SITE_URL, {
      headers: { 'cache-control': 'no-cache', 'user-agent': 'BeyrouthHeartbeat/1.0' },
      signal: AbortSignal.timeout(SITE_TIMEOUT_MS),
    })
    const corps = await res.text()
    const ms = Date.now() - t
    if (!res.ok) return { ok: false, cause: `HTTP ${res.status}`, ms }
    if (!corps.includes(SITE_MOT_ATTENDU)) return { ok: false, cause: `page sans « ${SITE_MOT_ATTENDU} » (HTTP 200, ${corps.length} octets)`, ms }
    return { ok: true, cause: `HTTP ${res.status}`, ms }
  } catch (e) {
    const ms = Date.now() - t
    const nom = (e as Error)?.name ?? ''
    // Jamais le message brut de l'erreur dans Telegram (caractères Markdown imprévisibles).
    const cause = (nom === 'TimeoutError' || nom === 'AbortError')
      ? `délai dépassé (${SITE_TIMEOUT_MS / 1000} s)`
      : 'erreur réseau (DNS/TLS/connexion)'
    return { ok: false, cause, ms }
  }
}

async function controleSite(): Promise<EtatSite> {
  const debut = Date.now()
  const essais: EssaiSite[] = []
  for (let i = 0; i < SITE_ESSAIS; i++) {
    if (i > 0) {
      const attente = debut + i * SITE_ECART_MS - Date.now()
      if (attente > 0) await new Promise(r => setTimeout(r, attente))
    }
    const e = await essaiSite()
    essais.push(e)
    if (e.ok) return { etat: i === 0 ? 'ok' : 'lent', essais }
  }
  return { etat: 'ko', essais }
}

// ─── Cron moniteur : état RÉEL (02/10/2026) ───────────────────────────────────
// Avant : « ✅ actif » écrit en dur, sans rien tester. Maintenant on lit cron.job_run_details
// et net._http_response via la fonction SQL public.heartbeat_cron_monitor() (migration
// 20261002090000). Si elle n'existe pas encore → « état inconnu », sans fausse alerte.
type EtatCron = { ok: boolean | null; texte: string }
const CRON_MAX_MIN = 10

async function controleCron(supabase: any): Promise<EtatCron> {
  try {
    const { data, error } = await supabase.rpc('heartbeat_cron_monitor')
    if (error || !data) return { ok: null, texte: '⚠️ état inconnu (fonction SQL heartbeat\\_cron\\_monitor absente ?)' }
    const maintenant = Date.parse(data.maintenant) || Date.now()
    const ageMin = (iso: string | null) => iso ? Math.round((maintenant - Date.parse(iso)) / 60000) : null
    const okMin = ageMin(data.dernier_ok)
    const httpMin = ageMin(data.derniere_reponse_200)
    if (!data.active) return { ok: false, texte: '❌ job DÉSACTIVÉ dans pg\\_cron' }
    if (okMin === null || okMin > CRON_MAX_MIN) {
      return { ok: false, texte: `❌ aucun passage réussi depuis ${okMin === null ? '24 h' : okMin + ' min'}` }
    }
    if (httpMin === null || httpMin > CRON_MAX_MIN) {
      return { ok: false, texte: `❌ lancé il y a ${okMin} min, mais la fonction ne répond plus 200 (dernier 200 : ${httpMin === null ? 'aucun' : 'il y a ' + httpMin + ' min'})` }
    }
    const echecs = Number(data.echecs_1h ?? 0)
    return { ok: true, texte: `✅ dernier passage il y a ${okMin} min${echecs > 0 ? ` (⚠️ ${echecs} échec(s) en 1 h)` : ''}` }
  } catch (_) {
    return { ok: null, texte: '⚠️ état inconnu (lecture impossible)' }
  }
}

// Markdown legacy de Telegram : un `_ * [ \`` isolé = message REFUSÉ (jamais envoyé).
// Tout texte venant d'un client (prénom, téléphone tapé) passe par ici.
function md(s: string): string {
  return s.replace(/([_*`\[])/g, '\\$1')
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Les contrôles tournent EN PARALLÈLE : la durée totale = celle du site (≤ ~50 s).
  const [site, paygreen, database, cron, mailsEnvoyes, resume] = await Promise.all([
    controleSite(),

    // PayGreen API
    (async () => {
      try {
        const res = await fetch(`https://api.paygreen.fr/auth/authentication/${PAYGREEN_SHOP_ID}/secret-key`, {
          method: 'POST',
          headers: { 'Authorization': PAYGREEN_SECRET_KEY, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000)
        })
        return res.ok
      } catch { return false }
    })(),

    // Base Supabase
    (async () => {
      try {
        const { error } = await supabase.from('orders').select('id').limit(1)
        return !error
      } catch { return false }
    })(),

    controleCron(supabase),

    // Compteur d'e-mails Brevo sur 24 h — detecte un abus AVANT que le quota saute
    (async (): Promise<number | null> => {
      try {
        const jour = (d: Date) => d.toISOString().slice(0, 10)
        const maintenant = new Date()
        const hier = new Date(maintenant.getTime() - 24 * 3600 * 1000)
        const res = await fetch(
          `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${jour(hier)}&endDate=${jour(maintenant)}`,
          { headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
        )
        if (!res.ok) return null
        const stats = await res.json()
        return Number(stats?.requests ?? 0)
      } catch { return null } // compteur indisponible : pas de fausse alerte
    })(),

    // Résumé des abandons de paiement des dernières 24 h (02/10/2026) : ce qui ne valait
    // pas une alerte immédiate (voir _shared/paiement-echoue.ts).
    resumeAbandons(supabase, new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  ])

  const results: Record<string, boolean> = {
    site: site.etat !== 'ko',
    paygreen,
    database,
    cron: cron.ok !== false,   // null = inconnu → pas d'alarme
    emails: mailsEnvoyes === null ? true : mailsEnvoyes <= SEUIL_MAILS_24H,
  }

  const allOk = Object.values(results).every(v => v)
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

  const premier = site.essais[0]
  const ligneSite =
    site.etat === 'ok' ? `✅ en ligne (${(premier.ms / 1000).toFixed(1)} s)`
    : site.etat === 'lent' ? `🟡 lent mais revenu — 1er essai : ${premier.cause}, OK au ${site.essais.length}e essai`
    : `❌ HORS LIGNE — ${SITE_ESSAIS} essais sur ~50 s : ${site.essais.map(e => e.cause).join(' / ')}`

  const lines = [
    allOk ? `✅ *SYSTÈME BEYROUTH OK* — ${date}` : `🚨 *ALERTE BEYROUTH* — ${date}`,
    '',
    `🌐 Site beyrouth.express : ${ligneSite}`,
    `💳 PayGreen API : ${paygreen ? '✅ accessible' : '❌ INACCESSIBLE'}`,
    `🗄️ Base de données : ${database ? '✅ accessible' : '❌ INACCESSIBLE'}`,
    `🔄 Cron moniteur (2 min) : ${cron.texte}`,
    mailsEnvoyes === null
      ? `📧 E-mails 24 h : ⚠️ compteur indisponible`
      : `📧 E-mails 24 h : ${mailsEnvoyes <= SEUIL_MAILS_24H ? '✅' : '🚨'} ${mailsEnvoyes} envoyé${mailsEnvoyes > 1 ? 's' : ''} (seuil ${SEUIL_MAILS_24H})`,
  ]

  if (resume) {
    let l = `🛒 Paiements 24 h : ${resume.payees} payé${resume.payees > 1 ? 's' : ''}`
    if (resume.abandons > 0) {
      l += ` · ${resume.abandons} abandon${resume.abandons > 1 ? 's' : ''} à l'écran de paiement`
      if (resume.recuperes > 0) l += ` (dont ${resume.recuperes} payé${resume.recuperes > 1 ? 's' : ''} ensuite)`
    }
    lines.push(l)
    if (resume.aRappeler.length > 0) {
      lines.push(`   Pas revenus (rappel possible) :`)
      for (const r of resume.aRappeler.slice(0, 8)) lines.push(`   • ${md(r)}`)
      if (resume.aRappeler.length > 8) lines.push(`   • … et ${resume.aRappeler.length - 8} autre(s)`)
    }
  }

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

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const adminChatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')

  // On envoie TOUS les jours, meme quand tout va bien : ainsi le silence
  // devient lui-meme un signal d'alarme (le heartbeat est mort).
  if (botToken && adminChatId) {
    const envoi = (body: Record<string, unknown>) => fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminChatId, ...body })
    })
    const res = await envoi({ text: message, parse_mode: 'Markdown' })
    // Filet : si Telegram refuse le Markdown (400 « can't parse entities »), on renvoie en
    // texte brut plutôt que de perdre le heartbeat — le silence serait pris pour une panne.
    if (!res.ok) await envoi({ text: message.replace(/\\([_*`\[])/g, '$1').replace(/\*/g, '') })
  }

  console.log(`Heartbeat: site=${site.etat} (${site.essais.map(e => e.cause).join('|')}) paygreen=${paygreen} db=${database} cron=${cron.ok}`)

  return new Response(JSON.stringify({ ok: allOk, results, site }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
