// Edge Function: Envoyer email d'annulation et remboursement
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

    const { orderId, cancellationReason } = await req.json()

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
      console.error('Erreur récupération commande:', orderError)
      throw new Error('Commande introuvable')
    }

    // Vérifier que la commande est annulée
    if (order.statut !== 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Commande pas annulée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier qu'on n'a pas déjà envoyé l'email
    if (order.cancellation_email_sent_at) {
      console.log(`⏭️  Email d'annulation déjà envoyé pour ${order.numero}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Email déjà envoyé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lang: Lang = (order.language === 'en') ? 'en' : 'fr'
    const tr = t(lang)

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
  <title>Commande annulée</title>
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
<h1 class="serif h1" style="margin:0 0 28px 0;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;color:#8E2F23;">${tr.orderCancelled}</h1>
              <!-- Ticket de retrait -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td bgcolor="#F7F1E7" style="background:#F7F1E7;border:1px dashed #CDBFA8;border-radius:12px;padding:22px 24px 22px 24px;text-align:center;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;">${tr.order}</div>
                    <div class="serif num" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:46px;line-height:1.1;font-weight:400;letter-spacing:1px;color:#1F1B16;margin-top:4px;font-variant-numeric:tabular-nums;">${order.numero}</div>
                  </td>
                </tr>
              </table>

              ${cancellationReason ? `
              <!-- Raison -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td bgcolor="#F7F4EE" style="background:#F7F4EE;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:4px;">${tr.reason}</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.55;">${cancellationReason.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Remboursement -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td bgcolor="#F6EBD9" style="background:#F6EBD9;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:15px;font-weight:600;color:#6E4310;margin-bottom:4px;">${tr.refundTitle}</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.55;">${tr.refundMsg(parseFloat(order.total).toFixed(2).replace('.', ',') + ' €')}</div>
                  </td>
                </tr>
              </table>

              <!-- Adresse -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E6DFD3;">
                <tr>
                  <td style="padding:24px 0 0 0;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;margin-bottom:6px;">${tr.contact}</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.6;margin-bottom:16px;">
                      <strong class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-weight:400;font-size:18px;">A Beyrouth</strong> · <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#1F1B16;text-decoration:none;">4 Esp. Gal de Gaulle</a><br>
                      <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#1F1B16;text-decoration:none;">92400 Courbevoie (La Défense)</a><br>
                      <span style="font-size:13px;color:#6B6256;"><a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" style="color:#6B6256;text-decoration:none;">Sortie 4 du métro La Défense</a></span>
                    </div>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#304936" class="btn-dark" style="background-color:#304936 !important;border-radius:8px;">
                          <a href="https://maps.google.com/?q=A+Beyrouth+4+Esplanade+du+General+de+Gaulle+92400+Courbevoie" target="_blank" class="btn-dark" style="display:inline-block;background-color:#304936 !important;color:#F7F1E7;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;font-size:14px;line-height:1.2;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                            ${tr.openMaps}
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
            <td bgcolor="#F7F4EE" class="px" style="background:#F7F4EE;padding:36px 32px 40px 32px;text-align:center;">

              <!-- Avis Google -->
              <div class="serif" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:1.25;font-weight:400;color:#1F1B16;margin-bottom:6px;">${tr.yourReviewMatters}</div>
              <div style="font-size:14px;color:#5E554A;line-height:1.55;margin-bottom:18px;">${tr.rateUs}</div>
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 32px auto;">
                <tr>
                  <td bgcolor="#304936" class="btn-dark" style="background-color:#304936 !important;border-radius:8px;">
                    <a href="https://g.page/r/CVVy4iE1igTkEBE/review" target="_blank" class="btn-dark" style="display:inline-block;background-color:#304936 !important;color:#F7F1E7;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;line-height:1.2;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                      ${tr.leaveReview}
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;"><tr><td height="1" style="border-top:1px solid #E6DFD3;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table>

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
      subject: tr.subjectCancelled(order.numero),
      html: emailHtml,
      replyTo: 'contact@beyrouth.express',
      orderId: orderId
    })

    if (!emailResult.success) {
      console.error('Erreur envoi email:', emailResult.error)
      throw new Error('Erreur envoi email')
    }

    // Marquer l'email comme envoyé + sauvegarder la raison
    await supabase
      .from('orders')
      .update({
        cancellation_email_sent_at: new Date().toISOString(),
        cancellation_reason: cancellationReason || null
      })
      .eq('id', orderId)

    console.log(`✅ Email d'annulation envoyé pour ${order.numero}`)

    // Remboursement automatique PayGreen (seulement si pas Edenred)
    let refundResult = null
    if (order.paygreen_transaction_id && order.total > 0 && order.edenred_status !== 'captured') {
      try {
        console.log(`💳 Remboursement de ${parseFloat(order.total).toFixed(2)}€ pour ${order.numero}...`)

        // Étape 1: Obtenir un JWT token PayGreen
        const PAYGREEN_SECRET_KEY = Deno.env.get('PAYGREEN_SECRET_KEY')
        const PAYGREEN_SHOP_ID = Deno.env.get('PAYGREEN_SHOP_ID')

        const authResponse = await fetch(`https://api.paygreen.fr/auth/authentication/${PAYGREEN_SHOP_ID}/secret-key`, {
          method: 'POST',
          headers: {
            'Authorization': PAYGREEN_SECRET_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!authResponse.ok) {
          throw new Error(`Auth PayGreen échouée: ${authResponse.status}`)
        }

        const authData = await authResponse.json()
        const jwtToken = authData.data?.token || authData.token

        if (!jwtToken) {
          throw new Error('JWT token non reçu de PayGreen')
        }

        // Étape 2: Créer le remboursement
        const refundResponse = await fetch(
          `https://api.paygreen.fr/payment/payment-orders/${order.paygreen_transaction_id}/refunds`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              amount: Math.round(parseFloat(order.total) * 100), // Convertir euros → centimes
              reason: 'customer_request'
            })
          }
        )

        if (!refundResponse.ok) {
          const errorText = await refundResponse.text()
          throw new Error(`Remboursement échoué (${refundResponse.status}): ${errorText}`)
        }

        const refundData = await refundResponse.json()
        const refund = refundData.data || refundData

        refundResult = {
          refund_transaction_id: refund.id,
          refund_amount: Math.round(parseFloat(order.total) * 100),
          refund_requested_at: new Date().toISOString(),
          refund_completed_at: new Date().toISOString(),
          refund_error: null
        }

        console.log(`✅ Remboursement réussi pour ${order.numero}: ${refund.id}`)

      } catch (refundError) {
        console.error(`❌ Erreur remboursement pour ${order.numero}:`, refundError)

        refundResult = {
          refund_requested_at: new Date().toISOString(),
          refund_error: refundError.message
        }

        // Ne pas bloquer l'email si le remboursement échoue
        // L'admin devra le faire manuellement
      }

      // Sauvegarder le résultat du remboursement
      await supabase
        .from('orders')
        .update(refundResult)
        .eq('id', orderId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund: refundResult ? {
          success: !refundResult.refund_error,
          transactionId: refundResult.refund_transaction_id,
          error: refundResult.refund_error
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur send-cancellation-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
