-- Badge « Populaire » v2 (04/11 18h15) : jamais sur les boissons ; la Box Express peut l'avoir (en plus de « Nouveau »)
CREATE OR REPLACE FUNCTION public.calcul_populaires()
RETURNS TABLE(id bigint, nom text, commandes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  MAX_SITE   CONSTANT int     := 3;     -- 3 badges maximum sur tout le site
  MIN_CMD    CONSTANT int     := 5;     -- au moins 5 commandes sur 30 jours
  AVANCE     CONSTANT numeric := 1.25;  -- au moins 25 % devant le 2e de la catégorie
  CAT_BOISSONS CONSTANT bigint := 7;    -- jamais de badge sur les boissons (demande de Ludo 04/11 18h11)
  CAT_SANDWICH CONSTANT bigint := 1;    -- les sandwichs choisis dans les formules comptent aussi
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _choix(id bigint, nom text, commandes bigint) ON COMMIT DROP;
  TRUNCATE _choix;

  WITH cmd AS (
    SELECT o.items FROM orders o
    WHERE o.created_at > now() - interval '30 days'
      AND o.statut IN ('recuperee', 'acceptee', 'prete', 'en_preparation', 'payee', 'paid')
      AND jsonb_typeof(o.items) = 'array'
  ),
  direct AS (   -- articles commandés directement
    SELECT (it->>'id')::bigint AS item_id, COALESCE((it->>'qty')::int, 1) AS n
    FROM cmd, jsonb_array_elements(cmd.items) it
    WHERE (it->>'id') ~ '^[0-9]+$'
  ),
  dans_formule AS (   -- sandwichs choisis dans une formule (par leur nom exact)
    SELECT m.id AS item_id, COALESCE((it->>'qty')::int, 1) AS n
    FROM cmd, jsonb_array_elements(cmd.items) it,
         jsonb_array_elements_text(CASE WHEN jsonb_typeof(it->'components') = 'array' THEN it->'components' ELSE '[]'::jsonb END) c
    JOIN menu_items m ON m.nom = c AND m.categorie_id = CAT_SANDWICH AND m.actif
  ),
  total AS (
    SELECT t.item_id, SUM(t.n)::bigint AS n FROM (SELECT * FROM direct UNION ALL SELECT * FROM dans_formule) t GROUP BY t.item_id
  ),
  rang AS (
    SELECT m.id, m.nom, m.categorie_id, t.n,
           row_number() OVER (PARTITION BY m.categorie_id ORDER BY t.n DESC, m.id) AS r,
           lead(t.n) OVER (PARTITION BY m.categorie_id ORDER BY t.n DESC, m.id) AS second
    FROM total t JOIN menu_items m ON m.id = t.item_id
    WHERE m.actif AND m.categorie_id <> CAT_BOISSONS
  )
  INSERT INTO _choix
  SELECT rang.id, rang.nom, rang.n FROM rang
  WHERE r = 1 AND n >= MIN_CMD AND n >= AVANCE * COALESCE(second, 0)
  ORDER BY n DESC
  LIMIT MAX_SITE;

  -- On ne touche qu'aux lignes qui changent (pas de bruit dans le temps réel de la tablette)
  UPDATE menu_items m SET populaire = false WHERE m.populaire AND m.id NOT IN (SELECT _choix.id FROM _choix);
  UPDATE menu_items m SET populaire = true  WHERE NOT m.populaire AND m.id IN (SELECT _choix.id FROM _choix);

  RETURN QUERY SELECT _choix.id, _choix.nom, _choix.commandes FROM _choix ORDER BY _choix.commandes DESC;
END;
$function$;

