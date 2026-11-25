// Edge Function: Toggle menu item disponibilité (sécurisé avec token admin)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Connexion Supabase avec service_role_key (bypass RLS)
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

    const { item_id, disponible, jours } = await req.json()

    // Vérification des paramètres
    if (!item_id || typeof disponible !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants (item_id, disponible)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Durée de coupure (25/11/2026, Box Beyrouth) :
    //   jours absent ou 0 -> revient à minuit ce soir (comportement historique)
    //   jours = -1        -> « jusqu'à ce que je la rallume » (2999-12-31)
    //   jours = 1 à 30    -> revient au minuit qui ouvre (aujourd'hui à Paris + jours)
    // Rallumer (disponible = true) efface toujours la date.
    let indispo_jusqu_au: string | null = null
    if (!disponible && jours !== undefined && jours !== null && jours !== 0) {
      if (jours === -1) {
        indispo_jusqu_au = '2999-12-31'
      } else if (Number.isInteger(jours) && jours >= 1 && jours <= 30) {
        const auj = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
        const d = new Date(auj + 'T00:00:00Z')
        d.setUTCDate(d.getUTCDate() + jours)
        indispo_jusqu_au = d.toISOString().slice(0, 10)
      } else {
        return new Response(
          JSON.stringify({ error: 'Durée invalide (jours)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // UPDATE sécurisé
    const { data, error } = await supabase
      .from('menu_items')
      .update({ disponible, indispo_jusqu_au })
      .eq('id', item_id)
      .select()

    if (error) {
      console.error('❌ Erreur UPDATE menu_items:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Item introuvable', item_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Menu item ${item_id} → disponible: ${disponible}, jusqu'au: ${indispo_jusqu_au}`)

    return new Response(
      JSON.stringify({ success: true, data: data[0] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur toggle-menu-item:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
