// Edge Function: Envoyer email après récupération commande (avec lien facture + avis)
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
    // Connexion Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 🔒 SÉCURITÉ: Accepter soit token admin (depuis admin UI), soit service_role (depuis webhook)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé - token requis' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Accepter soit service_role (webhook interne), soit JWT admin Supabase Auth
    const isServiceRole = token === serviceRoleKey

    if (!isServiceRole) {
      // 🔒 Valider le JWT Supabase Auth
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !adminUser) {
        return new Response(
          JSON.stringify({ error: 'Token invalide ou expiré' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      console.log('✅ Appel depuis service_role (webhook)')
    }

    const { orderId, emailOverride, forceResend } = await req.json()

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

    // Vérifier que la commande est bien récupérée
    if (order.statut !== 'recuperee') {
      return new Response(
        JSON.stringify({ error: 'Commande pas encore récupérée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier qu'on n'a pas déjà envoyé l'email (sauf si forceResend)
    if (order.completed_email_sent_at && !forceResend) {
      console.log(`⏭️  Email de remerciement déjà envoyé pour commande ${order.numero}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Email déjà envoyé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (forceResend) {
      console.log(`🔄 Renvoi forcé de l'email pour commande ${order.numero}`)
    }

    const lang: Lang = (order.language === 'en') ? 'en' : 'fr'
    const tr = t(lang)

    // Liens externes (utiliser le token sécurisé)
    const invoicePdfUrl = `https://beyrouth.express/facture?token=${order.invoice_token}`
    const googleReviewUrl = 'https://g.page/r/CVVy4iE1igTkEBE/review'
    const instagramUrl = 'https://www.instagram.com/a_beyrouth/'

    // Template email (Gmail-compatible - pas de SVG, pas de gradients, pas de flexbox)
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
  <title>${tr.thankYou}</title>
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
            <td bgcolor="#FFFFFF" class="px round" style="background:#FFFFFF;padding:44px 32px 44px 32px;border-radius:0 0 12px 12px;text-align:center;">
<h1 class="serif h1" style="margin:0 0 12px 0;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;color:#1F1B16;text-align:center;">${tr.thankYou}</h1>
              <p style="margin:0 auto 28px auto;max-width:420px;font-size:16px;color:#5E554A;line-height:1.6;">
                ${tr.orderPickedUp(order.numero)}
              </p>

              <!-- Bouton reçu -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td bgcolor="#304936" class="btn-dark" style="background-color:#304936 !important;border-radius:8px;">
                    <a href="${invoicePdfUrl}" target="_blank" class="btn-dark" style="display:inline-block;background-color:#304936 !important;color:#F7F1E7;text-decoration:none;padding:14px 26px;border-radius:8px;font-weight:600;font-size:15px;line-height:1.2;">
                      ${tr.downloadReceipt}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pied de page, directement sur le crème de la page -->
          <tr>
            <td bgcolor="#F7F4EE" class="px" style="background:#F7F4EE;padding:36px 32px 40px 32px;text-align:center;">

              <!-- Avis Google -->
              <div class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:1.25;font-weight:400;color:#1F1B16;margin-bottom:6px;">${tr.yourReviewMatters}</div>
              <div style="font-size:14px;color:#5E554A;line-height:1.55;margin-bottom:18px;">
                      ${tr.rateUs}
                    </div>
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 32px auto;">
                <tr>
                  <td bgcolor="#304936" class="btn-dark" style="background-color:#304936 !important;border-radius:8px;">
                    <a href="${googleReviewUrl}" target="_blank" class="btn-dark" style="display:inline-block;background-color:#304936 !important;color:#F7F1E7;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;line-height:1.2;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                      ${tr.leaveReview}
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;"><tr><td height="1" style="border-top:1px solid #E6DFD3;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table>

              <!-- Instagram -->
              <div style="font-size:14px;color:#5E554A;line-height:1.5;margin-bottom:12px;">${tr.followUs} <a href="${instagramUrl}" target="_blank" style="color:#304936;font-weight:600;text-decoration:underline;">@a_beyrouth</a></div>

              <!-- Contact -->
              <div style="font-size:12px;color:#6B6256;line-height:1.7;">
                    <strong style="font-weight:600;color:#5E554A;">A Beyrouth</strong><br>
                    <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#6B6256;text-decoration:none;">4 Esp. Gal de Gaulle, 92400 Courbevoie</a><br>
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
    // emailOverride permet à Paco de renvoyer à une autre adresse (si client s'est trompé)
    const emailResult = await sendEmailViaBrevo({
      to: emailOverride || order.client_email,
      subject: tr.subjectCompleted(order.numero),
      html: emailHtml,
      replyTo: 'contact@beyrouth.express',
      orderId: orderId  // Pour sync auto du statut
    })

    if (!emailResult.success) {
      console.error('Erreur envoi email:', emailResult.error)
      throw new Error('Erreur envoi email')
    }

    // Marquer l'email comme envoyé
    await supabase
      .from('orders')
      .update({ completed_email_sent_at: new Date().toISOString() })
      .eq('id', orderId)

    console.log(`✅ Email de remerciement envoyé pour ${order.numero}`)

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur send-order-completed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
