// Edge Function: Envoyer email confirmation demande de devis
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { t, type Lang, langueCommande, versRtl } from '../_shared/email-i18n.ts'
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
    const { email, name, phone, message, eventType, guestCount, eventDate, language } = await req.json()

    // Langue du visiteur au moment de la demande. Repli sur le francais des que
    // la valeur n est pas exactement 'en' : une valeur absente, inconnue ou
    // malformee donne un email francais, jamais un email casse.
    const lang: Lang = langueCommande(language)
    const L = t(lang)

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: 'Email et nom requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validation anti-spam basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connexion Supabase pour vérifications
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Protection 1: Rate limiting (max 3 demandes par email par heure)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentRequests, error: rateLimitError } = await supabase
      .from('quote_requests')
      .select('id')
      .eq('client_email', email)
      .gte('created_at', oneHourAgo)

    if (rateLimitError) {
      console.error('Erreur rate limit check:', rateLimitError)
    }

    if (recentRequests && recentRequests.length >= 3) {
      return new Response(
        JSON.stringify({ error: 'Trop de demandes. Veuillez réessayer dans 1 heure.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Protection 2: Détection doublons récents (même email dans les 30 dernières minutes)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: duplicates, error: dupError } = await supabase
      .from('quote_requests')
      .select('id')
      .eq('client_email', email)
      .gte('created_at', thirtyMinAgo)

    if (dupError) {
      console.error('Erreur duplicate check:', dupError)
    }

    if (duplicates && duplicates.length > 0) {
      return new Response(
        JSON.stringify({ error: (language === 'en') ? 'You have already sent a request recently.' : (language === 'ar') ? 'لقد أرسلت طلبًا مؤخرًا.' : 'Vous avez déjà envoyé une demande récemment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Template email CLIENT (Gmail-compatible - tables, solid colors, no flex/gradient)
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
  <title>${L.quotePreheader}</title>
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
<h1 class="serif h1" style="margin:0 0 6px 0;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;color:#1F1B16;">${L.quoteTitle}</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#5E554A;">${L.quoteThanks(name.split(' ')[0])}</p>

              <!-- Info principale -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td bgcolor="#E3E9DF" style="background:#E3E9DF;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:15px;color:#304936;font-weight:600;margin-bottom:4px;">${L.quoteRegistered}</div>
                    <div style="font-size:14px;color:#3E5A44;line-height:1.55;">
                      ${L.quoteStudy}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Récapitulatif -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td bgcolor="#F7F4EE" style="background:#F7F4EE;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:8px;">${L.quoteSummary}</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.7;">
                      ${eventType ? `<div class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:19px;line-height:1.3;color:#1F1B16;margin-bottom:2px;">${eventType}</div>` : ''}
                      ${guestCount ? `<div>${guestCount} ${lang === 'en' ? 'guests' : lang === 'ar' ? 'أشخاص' : 'personnes'}</div>` : ''}
                      ${eventDate ? `<div><a style="color:#1F1B16;text-decoration:none;">${eventDate}</a></div>` : ''}
                      <div><a href="mailto:${email}" style="color:#1F1B16;text-decoration:none;">${email}</a></div>
                      ${phone ? `<div><a href="tel:${phone}" style="color:#1F1B16;text-decoration:none;">${phone}</a></div>` : ''}
                    </div>
                  </td>
                </tr>
              </table>

              ${message ? `
              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td bgcolor="#F7F4EE" style="background:#F7F4EE;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:8px;">${L.quoteYourMessage}</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.6;white-space:pre-wrap;">${message}</div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Contact -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E6DFD3;">
                <tr>
                  <td style="padding:24px 0 0 0;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;margin-bottom:6px;">${L.contact}</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.6;">
                      <strong class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-weight:400;font-size:18px;">A Beyrouth</strong><br>
                      <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#1F1B16;text-decoration:none;">${L.quoteAddress.replace('<br>', ' ')}</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pied de page, directement sur le crème de la page -->
          <tr>
            <td bgcolor="#F7F4EE" class="px" style="background:#F7F4EE;padding:36px 32px 40px 32px;text-align:center;">

              <!-- Instagram -->
              <div style="font-size:14px;color:#5E554A;line-height:1.5;margin-bottom:12px;">${L.followUs} <a href="https://www.instagram.com/a_beyrouth/" target="_blank" style="color:#304936;font-weight:600;text-decoration:underline;">@a_beyrouth</a></div>

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

    // Envoyer l'email via Brevo (migre depuis Resend le 23/08/2026 :
    // la cle Resend avait fuite et tout le reste du site est deja sur Brevo)
    const emailResult = await sendEmailViaBrevo({
      to: email,
      subject: L.subjectQuote,
      html: lang === 'ar' ? versRtl(emailHtml, L.quoteTitle) : emailHtml,
      senderEmail: 'traiteur@beyrouth.express',
      replyTo: 'traiteur@beyrouth.express'
    })

    if (!emailResult.success) {
      console.error('Erreur envoi email client:', emailResult.error)
      throw new Error('Erreur envoi email client')
    }

    console.log(`✅ Email de confirmation devis envoyé à ${email}`)

    // Envoyer aussi un email à l'admin avec les détails (Gmail-compatible - tables, solid colors, no flex/gradient)
    const adminEmailHtml = `
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
  <title>Nouvelle demande de devis - ${name}</title>
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
<h1 class="serif h1" style="margin:0 0 24px 0;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;color:#1F1B16;">Nouvelle demande de devis</h1>
              <!-- Contact -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td bgcolor="#F7F4EE" style="background:#F7F4EE;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:6px;">Contact</div>
                    <div class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:1.25;color:#1F1B16;font-weight:400;margin-bottom:6px;">${name}</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.7;">
                      <a href="mailto:${email}" style="color:#304936;text-decoration:underline;">${email}</a><br>
                      ${phone ? `<a href="tel:${phone}" style="color:#304936;text-decoration:underline;">${phone}</a>` : ''}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Événement -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td bgcolor="#F7F4EE" style="background:#F7F4EE;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:6px;">Événement</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.7;">
                      ${eventType ? `<div><strong style="font-weight:600;">${eventType}</strong></div>` : ''}
                      ${guestCount ? `<div><strong style="font-weight:600;">${guestCount} personnes</strong></div>` : ''}
                      ${eventDate ? `<div><a style="color:#1F1B16;text-decoration:none;">${eventDate}</a></div>` : ''}
                    </div>
                  </td>
                </tr>
              </table>

              ${message ? `
              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td bgcolor="#F7F4EE" style="background:#F7F4EE;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:6px;">Message</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.6;white-space:pre-wrap;">${message}</div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Info -->
              <div style="font-size:13px;color:#304936;font-weight:600;padding-top:8px;">Email de confirmation envoyé au client</div>

            </td>
          </tr>

          <!-- Pied de page, directement sur le crème de la page -->
          <tr>
            <td bgcolor="#F7F4EE" class="px" style="background:#F7F4EE;padding:20px 32px 28px 32px;text-align:center;">

              <div style="font-size:12px;color:#6B6256;">Demande enregistrée dans quote_requests</div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // replyTo = l'email du prospect : repondre depuis la boite traiteur
    // ecrit directement au client, sans copier-coller son adresse.
    const adminEmailResult = await sendEmailViaBrevo({
      to: 'traiteur@beyrouth.express',
      subject: `📋 Nouvelle demande de devis - ${name}`,
      html: adminEmailHtml,
      senderEmail: 'traiteur@beyrouth.express',
      replyTo: email
    })

    if (!adminEmailResult.success) {
      console.error('Erreur envoi email admin:', adminEmailResult.error)
      // On ne throw pas l'erreur car l'email client a été envoyé
    } else {
      console.log(`✅ Email admin envoyé à traiteur@beyrouth.express`)
    }

    // Sauvegarder la demande dans la table quote_requests
    await supabase.from('quote_requests').insert({
      client_name: name,
      client_email: email,
      client_phone: phone,
      event_type: eventType,
      guest_count: guestCount,
      event_date: eventDate,
      message: message,
      status: 'pending',
      language: lang,
      created_at: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur send-quote-confirmation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
