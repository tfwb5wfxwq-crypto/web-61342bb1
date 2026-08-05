import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

// Pixel transparent 1x1 PNG
const PIXEL = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='
), c => c.charCodeAt(0))

const pool = new Pool(Deno.env.get('SUPABASE_DB_URL'), 3, true)

function detectDevice(ua: string): string {
  if (!ua || ua === 'unknown') return '❓ Inconnu'
  if (/iPhone|iPad/.test(ua)) return '📱 iPhone/iPad'
  if (/Android/.test(ua)) return '📱 Android'
  if (/Macintosh|Mac OS/.test(ua)) return '💻 Mac'
  if (/Windows/.test(ua)) return '💻 Windows'
  return '🖥️ Autre'
}

async function sendTelegram(name: string, id: string, device: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? Deno.env.get('TELEGRAM_CHAT_ID')
  if (!botToken || !chatId) return

  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
  const message = `🏚️ *RÉNOVACIEUX — Email ouvert*\n\n👤 *Client :* ${name}\n🔖 *ID :* \`${id}\`\n🕐 *À :* ${now}\n${device}`

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  })
}

serve(async (req: Request) => {
  const url = new URL(req.url)
  const name = url.searchParams.get('name') ?? url.searchParams.get('email') ?? 'Inconnu'
  const id = url.searchParams.get('id') ?? crypto.randomUUID()
  const ua = req.headers.get('user-agent') ?? 'unknown'
  const device = detectDevice(ua)

  // Log + Telegram en parallèle (non-bloquant)
  Promise.all([
    (async () => {
      try {
        const conn = await pool.connect()
        try {
          await conn.queryObject(`
            CREATE TABLE IF NOT EXISTS email_opens (
              id BIGSERIAL PRIMARY KEY,
              tracking_id TEXT,
              email_label TEXT,
              ip TEXT,
              user_agent TEXT,
              opened_at TIMESTAMPTZ DEFAULT NOW()
            )
          `)
          await conn.queryObject(
            `INSERT INTO email_opens (tracking_id, email_label, ip, user_agent) VALUES ($1, $2, $3, $4)`,
            [id, name, req.headers.get('x-forwarded-for') ?? 'unknown', ua]
          )
        } finally {
          conn.release()
        }
      } catch (_) {}
    })(),
    sendTelegram(name, id, device).catch(() => {}),
  ])

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    }
  })
})
