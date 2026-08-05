// Edge Function: Envoyer email de test
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { sendEmailViaBrevo } from '../_shared/brevo-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://beyrouth.express',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="only light">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root { color-scheme: light; }
    .email-header-bg { background-color: #000000 !important; }
  </style>
  <title>Test Email - A Beyrouth</title>
</head>
<body bgcolor="#f5f5f5" style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5" style="background:#f5f5f5;">
    <tr>
      <td align="center" bgcolor="#f5f5f5" style="background:#f5f5f5;padding:0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header fond noir avec logo -->
          <tr>
            <td class="email-header-bg" bgcolor="#000000" style="background:#000000;padding:8px 24px;text-align:center;">
              <img src="https://beyrouth.express/img/logo-email-final.png" alt="A Beyrouth" style="width:240px;height:auto;max-width:100%;display:block;margin:0 auto;">
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding:24px 20px;background:#ffffff;">

              <!-- Statut -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background:#f0fdf4;padding:16px 20px;">
                    <span style="font-size:16px;font-weight:600;color:#166534;">✅ Email de test</span>
                  </td>
                </tr>
              </table>

              <!-- Numéro test -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Commande de test</td>
                        <td style="text-align:right;font-size:22px;font-weight:700;font-family:'Courier New',monospace;color:#1a1a1a;">1234 AB</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 20px 0;">
                Ceci est un email de test pour vérifier le rendu (header noir, design, délivrabilité).
              </p>

              <!-- Adresse -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Lieu de retrait</div>
                    <div style="font-size:14px;color:#1a1a1a;line-height:1.6;">
                      A Beyrouth<br>
                      4 Esplanade du Général de Gaulle, 
                      92400 Courbevoie (La Défense)
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f5f5f5" style="background:#f5f5f5;padding:20px;border-top:1px solid #e0e0e0;text-align:center;">
              <p style="margin:0 0 12px 0;font-size:12px;color:#888;line-height:1.6;">
                Retrouvez-nous sur
              </p>
              <a href="https://www.instagram.com/abeyrouth.ladefense" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:500;">
                📷 @abeyrouth.ladefense
              </a>
              <p style="margin:16px 0 0 0;font-size:11px;color:#aaa;">
                <a href="https://beyrouth.express" style="color:#D4A853;text-decoration:none;">beyrouth.express</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const result = await sendEmailViaBrevo({
      to: email,
      subject: '✅ Test Email - A Beyrouth',
      html: emailHtml,
      from: { email: 'commande@beyrouth.express', name: 'A Beyrouth' },
      replyTo: 'contact@beyrouth.express'
    })

    if (!result.success) {
      throw new Error(result.error || 'Erreur envoi email')
    }

    console.log(`✅ Email de test envoyé à ${email}`)

    return new Response(
      JSON.stringify({ success: true, emailId: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur send-test-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
