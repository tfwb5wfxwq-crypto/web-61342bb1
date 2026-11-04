// Edge Function: Envoyer email de confirmation quand commande est acceptée
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailViaBrevo } from '../_shared/brevo-email.ts'
import { t, type Lang, langueCommande, versRtl, MENU_AR, COMPO_AR } from '../_shared/email-i18n.ts'

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

    // 🔒 Vérifier si c'est un appel service_role (comparaison directe contre la vraie clé)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const isServiceRole = token === serviceRoleKey

    if (!isServiceRole) {
      // Vérifier le JWT Supabase Auth
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !adminUser) {
        console.error('❌ Token invalide ou expiré')
        return new Response(
          JSON.stringify({ error: 'Token invalide ou expiré' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('✅ Appel depuis admin UI (JWT)', adminUser.email)
    } else {
      console.log('✅ Appel depuis service_role (webhook)')
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

    // Vérifier que la commande est bien acceptée
    if (order.statut !== 'acceptee') {
      return new Response(
        JSON.stringify({ error: 'Commande pas encore acceptée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier qu'on n'a pas déjà envoyé l'email
    if (order.confirmation_email_sent_at) {
      console.log(`⏭️  Email de confirmation déjà envoyé pour commande ${order.numero}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Email déjà envoyé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lang: Lang = langueCommande(order.language)
    const tr = t(lang)

    // Anglais (04/11/2026) : les noms stockés dans la commande restent en français (ce sont des clés,
    // et la tablette de Paco les lit tels quels). On ne traduit qu'ICI, à l'affichage du mail client.
    const COMPO_EN: Record<string, string> = { 'Feuilletés': 'Pastries', 'Boisson': 'Drink', 'Fromage': 'Cheese', 'Boeuf': 'Beef', 'Épinard': 'Spinach', 'Falafel': 'Falafel', "Sauce à l'ail": 'Garlic sauce', 'Ketchup': 'Ketchup' }
    const enParId = new Map<number, string>(), enParNom = new Map<string, string>()
    if (lang === 'en') {
      try {
        const { data: plats } = await supabase.from('menu_items').select('id, nom, nom_en')
        for (const p of plats || []) { if (p.nom_en) { enParId.set(Number(p.id), p.nom_en); if (!enParNom.has(p.nom)) enParNom.set(p.nom, p.nom_en) } }
      } catch (_e) { /* au pire, noms en français : le mail part quand même */ }
    }
    // Arabe : noms par id (MENU_AR), et par nom français pour les sandwichs choisis dans une formule
    const arParNom = new Map<string, string>()
    if (lang === 'ar') {
      try {
        const { data: plats } = await supabase.from('menu_items').select('id, nom')
        for (const p of plats || []) { const a = MENU_AR[Number(p.id)]; if (a && !arParNom.has(p.nom)) arParNom.set(p.nom, a) }
      } catch (_e) { /* au pire, noms en français : le mail part quand même */ }
    }
    const nomAffiche = (item: any, nomFr: string) => (lang === 'en' && (enParId.get(Number(item.id)) || enParNom.get(nomFr))) || (lang === 'ar' && (MENU_AR[Number(item.id)] || arParNom.get(nomFr))) || nomFr
    const compoAffiche = (c: string) => (lang === 'en' && (enParNom.get(c) || COMPO_EN[c])) || (lang === 'ar' && (arParNom.get(c) || COMPO_AR[c])) || c

    // Construire le récapitulatif des items (avec fallback qty/quantite, name/nom, price/prix)
    const itemsHtml = order.items.map((item: any) => {
      const qty = item.qty || item.quantite || 1
      const name = nomAffiche(item, item.name || item.nom || 'Article')
      const price = item.price || item.prix || 0

      let html = `
      <tr>
        <td style="padding:12px 0 0 0;font-size:14px;line-height:1.45;color:#6B6256;width:36px;vertical-align:top;white-space:nowrap;">${qty}×</td>
        <td style="padding:12px 0 0 0;font-size:14px;line-height:1.45;color:#1F1B16;">${name}</td>
        <td style="padding:12px 0 0 12px;text-align:right;font-size:14px;line-height:1.45;color:#1F1B16;vertical-align:top;white-space:nowrap;font-variant-numeric:tabular-nums;">${(price * qty).toFixed(2)}€</td>
      </tr>
      `

      // Détail d'une formule (ex. Box Express : sandwich · boisson · sauce)
      if (item.isFormule && Array.isArray(item.components) && item.components.length > 0) {
        const detail = item.components.map((c: any) => compoAffiche(String(c)).replace(/[<>&"]/g, '')).join(' · ')
        html += `
      <tr>
        <td style="padding:2px 0 0 0;width:36px;"></td>
        <td colspan="2" style="padding:2px 0 0 0;font-size:13px;line-height:1.45;color:#5E554A;">${detail}</td>
      </tr>
          `
      }

      // Ajouter les suppléments si présents
      if (item.supplements && item.supplements.length > 0) {
        item.supplements.forEach((supp: any) => {
          const suppName = supp.name || supp.nom || 'Supplément'
          const suppPrice = supp.price || supp.prix || 0
          html += `
      <tr>
        <td style="padding:2px 0 0 0;width:36px;"></td>
        <td style="padding:2px 0 0 0;font-size:13px;line-height:1.45;color:#5E554A;">+ ${suppName}</td>
        <td style="padding:2px 0 0 12px;text-align:right;font-size:13px;line-height:1.45;color:#5E554A;white-space:nowrap;font-variant-numeric:tabular-nums;">${suppPrice.toFixed(2)}€</td>
      </tr>
          `
        })
      }

      return html
    }).join('')

    // Formater l'heure de retrait
    const rawPickup = order.heure_retrait || ''
    let pickupText = tr.asap
    let subjectPickup = tr.asap.toLowerCase()

    if (rawPickup && rawPickup !== 'asap' && rawPickup !== 'ASAP') {
      const isToday = /^Aujourd'hui\s+/i.test(rawPickup)
      const heureOnly = rawPickup.replace(/^Aujourd'hui\s+/i, '')
      pickupText = heureOnly
      subjectPickup = isToday ? (lang === 'fr' ? `aujourd'hui à ${heureOnly}` : lang === 'ar' ? `اليوم الساعة ${heureOnly}` : `today at ${heureOnly}`) : rawPickup.toLowerCase()
    }

    // Calculer TVA (10% restauration)
    const totalTTC = order.total
    const totalHT = totalTTC / 1.10
    const tva = totalTTC - totalHT

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
  <title>Commande confirmée</title>
</head>
<body id="body" bgcolor="#F7F4EE" style="margin:0;padding:0;font-family:'DM Sans',Arial,Helvetica,sans-serif;background:#F7F4EE;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F4EE;opacity:0;">${tr.confirmedPreheader(order.numero)}</div>
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
<h1 class="serif h1" style="margin:0 0 12px 0;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;color:#1F1B16;">${tr.orderConfirmed}</h1>
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#5E554A;"><strong style="color:#1F1B16;font-weight:600;">${tr.skipQueueTitle}</strong><br>${tr.skipQueueText(order.numero)}</p>

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

              <!-- Articles -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;border-top:1px solid #E6DFD3;">
                <tr><td colspan="3" height="4" style="height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
                ${itemsHtml}
                <tr><td colspan="3" height="16" style="height:16px;line-height:16px;font-size:16px;border-bottom:1px solid #E6DFD3;">&nbsp;</td></tr>
                <tr>
                  <td colspan="2" style="padding:18px 0 0 0;font-size:15px;font-weight:600;color:#1F1B16;">${tr.totalTTC}</td>
                  <td class="serif" style="padding:18px 0 0 0;text-align:right;font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:26px;line-height:1.1;font-weight:400;color:#1F1B16;white-space:nowrap;">${totalTTC.toFixed(2)}€</td>
                </tr>
              </table>

              ${order.note && order.note.trim() ? `
              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td bgcolor="#F7F4EE" style="background:#F7F4EE;border-radius:10px;padding:16px 20px;">
                    <div style="font-size:13px;line-height:1.4;color:#6B6256;font-weight:600;margin-bottom:4px;">Note</div>
                    <div style="font-size:14px;color:#1F1B16;line-height:1.55;">${order.note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  </td>
                </tr>
              </table>
              ` : ''}

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
                    <a href="mailto:contact@beyrouth.express" style="color:#6B6256;text-decoration:underline;">contact@beyrouth.express</a> ·
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
      subject: tr.subjectConfirmed(order.numero, subjectPickup),
      html: lang === 'ar' ? versRtl(emailHtml, tr.orderConfirmed) : emailHtml,
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
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', orderId)

    console.log(`✅ Email de confirmation envoyé pour ${order.numero}`)

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur send-order-ready:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
