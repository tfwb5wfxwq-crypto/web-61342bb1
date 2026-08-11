-- Migration : version anglaise du menu
-- But : afficher le menu en anglais sans jamais toucher aux donnees francaises.
--
-- STRICTEMENT ADDITIF. On AJOUTE deux colonnes, on ne modifie ni ne supprime
-- aucune colonne existante. Les colonnes nom et description ne bougent pas.
--
-- Pourquoi c est sans risque pour le site actuel :
--   · le site lit nom et description, il continuera de les lire ;
--   · les nouvelles colonnes sont NULL par defaut. Le code cote site retombe
--     sur le francais quand la traduction est vide, donc meme un plat ajoute
--     par Paco sans traduction s affichera correctement, en francais ;
--   · IF NOT EXISTS : rejouer cette migration ne fait rien.
--
-- ATTENTION pour la suite : nom reste la CLE utilisee par le code
-- (FORMULE_CONFIG[item.nom], comparaisons a 'Formule 3' et 'Ayran', et le nom
-- recopie dans la commande). nom_en ne sert QU A L AFFICHAGE.

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS nom_en TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_en TEXT;

COMMENT ON COLUMN menu_items.nom_en IS
  'Nom affiche en anglais. AFFICHAGE UNIQUEMENT : le code compare et stocke toujours menu_items.nom. Vide = repli sur nom.';
COMMENT ON COLUMN menu_items.description_en IS
  'Description affichee en anglais. Vide = repli sur description.';
