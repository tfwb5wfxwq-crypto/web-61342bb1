-- Box Beyrouth : « pas dispo pendant plusieurs jours » (option A validée par Ludo le 25/11/2026).
--
-- Avant : un plat coupé dans l'admin (disponible = false) revenait TOUJOURS en vente à minuit
-- (cron reset-menu-disponibilite). Paco ne fait pas la Box tous les jours : il veut la couper
-- pour 2 ou 3 jours, ou jusqu'à ce qu'il la rallume.
--
-- indispo_jusqu_au = date (heure de Paris) à laquelle le plat revient en vente, à minuit.
--   NULL        -> comportement d'avant : revient à minuit ce soir
--   2999-12-31  -> « jusqu'à ce que je la rallume » (jamais remis automatiquement)
--   autre date  -> reste coupé jusqu'au minuit qui ouvre cette date
-- Rallumer le plat à la main (edge function toggle-menu-item) remet la colonne à NULL.

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS indispo_jusqu_au date;

COMMENT ON COLUMN public.menu_items.indispo_jusqu_au IS
  'Date (Europe/Paris) de remise en vente automatique. NULL = minuit ce soir. 2999-12-31 = jamais (rallumage manuel).';

-- Coeur du reset, séparé pour pouvoir être testé avec une date choisie.
CREATE OR REPLACE FUNCTION public.remettre_menu_en_vente(p_jour date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n integer;
BEGIN
  UPDATE menu_items
     SET disponible = TRUE,
         indispo_jusqu_au = NULL
   WHERE disponible = FALSE
     AND actif = TRUE
     AND (indispo_jusqu_au IS NULL OR indispo_jusqu_au <= p_jour);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.remettre_menu_en_vente(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remettre_menu_en_vente(date) FROM anon;
REVOKE ALL ON FUNCTION public.remettre_menu_en_vente(date) FROM authenticated;

-- Même signature que la version du 02/09 : le job pg_cron n'a pas à changer.
CREATE OR REPLACE FUNCTION public.reset_menu_disponibilite()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n integer;
BEGIN
  -- pg_cron tourne en UTC (22h et 23h) : on ne garde que le passage qui tombe à minuit à Paris.
  IF EXTRACT(HOUR FROM (now() AT TIME ZONE 'Europe/Paris')) <> 0 THEN
    RETURN 0;
  END IF;

  n := public.remettre_menu_en_vente((now() AT TIME ZONE 'Europe/Paris')::date);
  RAISE LOG 'reset_menu_disponibilite: % plat(s) remis en vente', n;
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.reset_menu_disponibilite() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_menu_disponibilite() FROM anon;
REVOKE ALL ON FUNCTION public.reset_menu_disponibilite() FROM authenticated;
