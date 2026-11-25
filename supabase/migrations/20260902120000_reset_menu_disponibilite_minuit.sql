-- Remise en vente automatique des ruptures de stock, chaque nuit a minuit (Europe/Paris).
--
-- Paco desactive un plat dans la journee quand il n'en a plus : cela ecrit
-- menu_items.disponible = false (bouton de l'admin -> edge function toggle-menu-item).
-- Sans ce mecanisme, le plat reste indisponible tant que personne ne le rallume.
--
-- /!\ La colonne `actif` n'est JAMAIS touchee : c'est elle qui retire un plat
--     du menu de facon durable. Un plat retire volontairement ne ressuscite pas.

CREATE OR REPLACE FUNCTION public.reset_menu_disponibilite()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n integer;
BEGIN
  -- pg_cron tourne en UTC. Minuit a Paris tombe a 22h UTC l'ete et 23h UTC
  -- l'hiver : on planifie les deux heures et on ne retient que la bonne.
  -- Ainsi le passage a l'heure d'hiver ne decale rien.
  IF EXTRACT(HOUR FROM (now() AT TIME ZONE 'Europe/Paris')) <> 0 THEN
    RETURN 0;
  END IF;

  UPDATE menu_items
     SET disponible = TRUE
   WHERE disponible = FALSE
     AND actif = TRUE;

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE LOG 'reset_menu_disponibilite: % plat(s) remis en vente', n;
  RETURN n;
END;
$fn$;

-- Personne ne doit pouvoir l'appeler depuis le site : uniquement le cron.
REVOKE ALL ON FUNCTION public.reset_menu_disponibilite() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_menu_disponibilite() FROM anon;
REVOKE ALL ON FUNCTION public.reset_menu_disponibilite() FROM authenticated;

SELECT cron.schedule(
  'reset-menu-disponibilite',
  '0 22,23 * * *',
  $cron$SELECT public.reset_menu_disponibilite();$cron$
);
