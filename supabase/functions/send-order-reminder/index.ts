// Edge Function: Envoyer email de relance si client n'est pas venu
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailViaBrevo } from '../_shared/brevo-email.ts'
import { t, type Lang } from '../_shared/email-i18n.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://beyrouth.express',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 🔒 SÉCURITÉ: Validation token admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé - token admin requis' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminToken = authHeader.replace('Bearer ', '')

    // Connexion Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

        // 🔒 Valider le JWT Supabase Auth
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(adminToken)
    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Token invalide ou expiré' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { orderId } = await req.json()

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer la commande complète
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Erreur récupération commande:', orderError)
      throw new Error('Commande introuvable')
    }

    // Vérifier que la commande est acceptée
    if (order.statut !== 'acceptee') {
      return new Response(
        JSON.stringify({ error: 'Commande pas acceptée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🔒 Protection double-envoi
    if (order.reminder_email_sent_at) {
      console.log(`⏭️  Email de relance déjà envoyé pour ${order.numero}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Email déjà envoyé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lang: Lang = (order.language === 'en') ? 'en' : 'fr'
    const tr = t(lang)

    // Formater l'heure de retrait
    const rawPickup = order.heure_retrait || ''
    let pickupText = tr.asap
    let subjectPickup = tr.asap.toLowerCase()

    if (rawPickup && rawPickup !== 'asap' && rawPickup !== 'ASAP') {
      const isToday = /^Aujourd'hui\s+/i.test(rawPickup)
      const heureOnly = rawPickup.replace(/^Aujourd'hui\s+/i, '')
      pickupText = heureOnly
      subjectPickup = isToday ? (lang === 'fr' ? `aujourd'hui à ${heureOnly}` : `today at ${heureOnly}`) : rawPickup.toLowerCase()
    }

    // Template email (Gmail-compatible - tables, solid colors, no flex/gradient)
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="only light">
  <meta name="supported-color-schemes" content="light">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light only; supported-color-schemes: light; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #F7F4EE !important; }
      .header-dark { background-color: #304936 !important; }
      .card-dark { background-color: #304936 !important; }
      .btn-dark { background-color: #304936 !important; color: #F7F1E7 !important; }
      .content-white { background-color: #ffffff !important; color: #1F1B16 !important; }
    }
    [data-ogsb] .header-dark, [data-ogsb] .card-dark, [data-ogsb] .btn-dark { background-color: #304936 !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    u + #body a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; }
    @media only screen and (max-width: 480px) {
      .outer { padding: 0 !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .h1 { font-size: 28px !important; }
      .num { font-size: 38px !important; }
      .round { border-radius: 0 !important; }
    }
  </style>
  <!--[if mso]>
  <style>
    body, table, td, div, p, a, span { font-family: Arial, Helvetica, sans-serif !important; }
    .serif { font-family: Georgia, 'Times New Roman', serif !important; }
  </style>
  <![endif]-->
  <title>Votre commande vous attend</title>
</head>
<body id="body" bgcolor="#F7F4EE" style="margin:0;padding:0;font-family:'DM Sans',Arial,Helvetica,sans-serif;background:#F7F4EE;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F4EE" style="background:#F7F4EE;">
    <tr>
      <td align="center" class="outer" bgcolor="#F7F4EE" style="background:#F7F4EE;padding:24px 12px 0 12px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- En-tête vert foncé (forcé : !important + classe header-dark), logo PNG à fond vert intégré, aligné à gauche comme sur le site -->
          <tr>
            <td bgcolor="#304936" class="header-dark px round" style="background-color:#304936 !important;padding:22px 32px;border-radius:12px 12px 0 0;text-align:left;">
              <img src="https://beyrouth.express/img/logo-email-v2.png" alt="A Beyrouth" width="176" style="width:176px;height:auto;max-width:100%;display:block;border:0;">
            </td>
          </tr>

          <!-- Contenu (fond blanc, sans !important) -->
          <tr>
            <td bgcolor="#FFFFFF" class="px round" style="background:#FFFFFF;padding:36px 32px 36px 32px;border-radius:0 0 12px 12px;">
<h1 class="serif h1" style="margin:0 0 28px 0;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;color:#1F1B16;">${tr.orderWaiting}</h1>
              <!-- Ticket de retrait -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td bgcolor="#F7F1E7" style="background:#F7F1E7;border:1px dashed #CDBFA8;border-radius:12px;padding:22px 24px 22px 24px;text-align:center;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;">${tr.order}</div>
                    <div class="serif num" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:46px;line-height:1.1;font-weight:400;letter-spacing:1px;color:#1F1B16;margin-top:4px;font-variant-numeric:tabular-nums;">${order.numero}</div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 16px 0;">
                      <tr><td height="1" style="border-top:1px dashed #CDBFA8;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr>
                    </table>
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;">${tr.pickup}</div>
                    <div class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:400;color:#A85A17;margin-top:2px;"><a style="color:#A85A17;text-decoration:none;">${pickupText}</a></div>
                  </td>
                </tr>
              </table>

              <!-- Adresse avec GIF de la sortie de métro (carte vert foncé forcée) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#304936" class="card-dark" style="background-color:#304936 !important;border-radius:12px;padding:0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:0;line-height:0;font-size:0;">
                          <!--[if mso]><img src="https://beyrouth.express/img/beyrouth-location-v2.jpg" alt="Sortie métro La Défense" width="536" height="357" style="display:block;width:536px;height:357px;border:0;"><![endif]-->
                          <!--[if !mso]><!--><img src="https://beyrouth.express/img/beyrouth-location-v2.gif" alt="Sortie métro La Défense" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:12px 12px 0 0;"><!--<![endif]-->
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 24px 24px 24px;">
                          <div style="font-size:13px;line-height:1.4;color:#B9C6B4;margin-bottom:6px;">${tr.wherePickup}</div>
                          <div class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;font-weight:400;color:#F7F1E7;margin-bottom:10px;">A Beyrouth</div>
                          <div style="font-size:14px;color:#DCE3D6;line-height:1.6;margin-bottom:2px;"><a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#DCE3D6;text-decoration:none;">4 Esplanade du Général de Gaulle, 92400 Courbevoie</a></div>
                          <div style="font-size:13px;line-height:1.5;color:#B9C6B4;margin-bottom:18px;"><a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#B9C6B4;text-decoration:none;">${tr.metro}</a></div>
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="border:1px solid #8FA38E;border-radius:8px;">
                                <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="display:inline-block;color:#F7F1E7;text-decoration:none;padding:11px 18px;font-weight:600;font-size:14px;line-height:1.2;">${tr.viewMaps}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pied de page, directement sur le crème de la page -->
          <tr>
            <td bgcolor="#F7F4EE" class="px" style="background:#F7F4EE;padding:36px 32px 40px 32px;text-align:center;">

              <!-- Instagram -->
              <div style="font-size:14px;color:#5E554A;line-height:1.5;margin-bottom:12px;">${tr.followUs} <a href="https://www.instagram.com/a_beyrouth/" target="_blank" style="color:#304936;font-weight:600;text-decoration:underline;">@a_beyrouth</a></div>

              <!-- Contact -->
              <div style="font-size:12px;color:#6B6256;line-height:1.7;">
                    <strong style="font-weight:600;color:#5E554A;">A Beyrouth</strong> · <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#6B6256;text-decoration:none;">4 Esp. Gal de Gaulle, 92400 Courbevoie</a><br>
                    <a href="https://beyrouth.express" style="color:#6B6256;text-decoration:underline;">beyrouth.express</a>
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Envoyer l'email via Brevo API
    const emailResult = await sendEmailViaBrevo({
      to: order.client_email,
      subject: tr.subjectReminder(order.numero, subjectPickup),
      html: emailHtml,
      replyTo: 'contact@beyrouth.express',
      orderId: orderId
    })

    if (!emailResult.success) {
      console.error('Erreur envoi email:', emailResult.error)
      throw new Error('Erreur envoi email')
    }

    console.log(`✅ Email de relance envoyé pour ${order.numero}`)

    // Timestamp en BDD pour éviter doubles envois
    await supabase.from('orders').update({
      reminder_email_sent_at: new Date().toISOString()
    }).eq('id', orderId)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur send-order-reminder:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
