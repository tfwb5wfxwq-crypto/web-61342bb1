// Edge Function: Renvoyer email de confirmation (avec possibilité de corriger l'adresse)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
    // 🔒 SÉCURITÉ: Validation token admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé - token admin requis' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminToken = authHeader.replace('Bearer ', '')

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

    const { orderId, newEmail } = await req.json()

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Commande introuvable')
    }

    // Mettre à jour l'email si changé
    const targetEmail = newEmail || order.client_email
    if (!targetEmail) {
      throw new Error('Aucune adresse email disponible')
    }

    if (newEmail && newEmail !== order.client_email) {
      console.log(`📧 Mise à jour email: ${order.client_email} → ${newEmail}`)
      await supabase
        .from('orders')
        .update({ client_email: newEmail })
        .eq('id', orderId)
    }

    // Récupérer les items de la commande
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    const items = orderItems || order.items || []

    // Générer le template email (même template que send-order-confirmation)
    const itemsHtml = items.map((item: any) => {
      const qty = item.quantite || item.qty || 1
      const prix = item.prix || 0
      return `
        <tr>
          <td style="padding:12px 0 0 0;font-size:14px;line-height:1.45;color:#6B6256;width:36px;vertical-align:top;white-space:nowrap;">${qty}x</td>
          <td style="padding:12px 0 0 0;font-size:14px;line-height:1.45;color:#1F1B16;">${item.nom}</td>
          <td style="padding:12px 0 0 12px;text-align:right;font-size:14px;line-height:1.45;color:#1F1B16;vertical-align:top;white-space:nowrap;font-variant-numeric:tabular-nums;">${(prix * qty).toFixed(2)}€</td>
        </tr>
      `
    }).join('')

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
  <title>Commande confirmée</title>
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
<h1 class="serif h1" style="margin:0 0 6px 0;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;color:#1F1B16;">Commande confirmée</h1>
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#5E554A;">Merci ${order.client_prenom || 'pour votre commande'} !</p>

              <!-- Ticket de retrait -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td bgcolor="#F7F1E7" style="background:#F7F1E7;border:1px dashed #CDBFA8;border-radius:12px;padding:22px 24px 22px 24px;text-align:center;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;">Commande</div>
                    <div class="serif num" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:46px;line-height:1.1;font-weight:400;letter-spacing:1px;color:#1F1B16;margin-top:4px;font-variant-numeric:tabular-nums;">${order.numero}</div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 16px 0;">
                      <tr><td height="1" style="border-top:1px dashed #CDBFA8;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr>
                    </table>
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;">Retrait</div>
                    <div class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:400;color:#A85A17;margin-top:2px;"><a style="color:#A85A17;text-decoration:none;">${order.heure_retrait === 'asap' ? 'Dès que possible' : order.heure_retrait}</a></div>
                  </td>
                </tr>
              </table>

              <!-- Récapitulatif -->
              <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:8px;">Récapitulatif</div>
              <!-- Articles -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;border-top:1px solid #E6DFD3;">
                <tr><td colspan="3" height="4" style="height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
                ${itemsHtml}
                <tr><td colspan="3" height="16" style="height:16px;line-height:16px;font-size:16px;border-bottom:1px solid #E6DFD3;">&nbsp;</td></tr>
                <tr>
                  <td colspan="2" style="padding:18px 0 0 0;font-size:15px;font-weight:600;color:#1F1B16;">Total</td>
                  <td class="serif" style="padding:18px 0 0 0;text-align:right;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:26px;line-height:1.1;font-weight:400;color:#1F1B16;white-space:nowrap;">${order.total.toFixed(2)}€</td>
                </tr>
              </table>

              <!-- Adresse -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E6DFD3;">
                <tr>
                  <td style="padding:24px 0 0 0;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;margin-bottom:6px;">Retrait</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.6;margin-bottom:16px;">
                      <strong class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-weight:400;font-size:18px;">A Beyrouth</strong> · <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#1F1B16;text-decoration:none;">4 Esp. Gal de Gaulle</a><br>
                      <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#1F1B16;text-decoration:none;">92400 Courbevoie (La Défense)</a><br>
                      <span style="font-size:13px;color:#6B6256;"><a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#6B6256;text-decoration:none;">Sortie 4 du métro La Défense</a></span>
                    </div>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#304936" class="btn-dark" style="background-color:#304936 !important;border-radius:8px;">
                          <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" class="btn-dark" style="display:inline-block;background-color:#304936 !important;color:#F7F1E7;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;font-size:14px;line-height:1.2;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                            Ouvrir dans Google Maps
                          </a>
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
            <td bgcolor="#F7F4EE" class="px" style="background:#F7F4EE;padding:28px 32px 36px 32px;text-align:center;">

              <a href="https://beyrouth.express" style="font-size:13px;color:#6B6256;text-decoration:underline;">beyrouth.express</a>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Envoyer l'email
    const emailResult = await sendEmailViaBrevo({
      to: targetEmail,
      subject: `✅ Commande ${order.numero} confirmée - A Beyrouth`,
      html: emailHtml,
      replyTo: 'contact@beyrouth.express',
      orderId: orderId
    })

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Erreur envoi email')
    }

    console.log(`✅ Email renvoyé à ${targetEmail} pour commande ${order.numero}`)

    // Mettre à jour le timestamp
    await supabase
      .from('orders')
      .update({
        confirmation_email_sent_at: new Date().toISOString(),
        email_status: 'sent',
        email_error: null
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({ success: true, email: targetEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur resend-order-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
