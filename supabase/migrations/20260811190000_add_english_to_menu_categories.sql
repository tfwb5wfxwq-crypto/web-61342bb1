-- Migration : version anglaise des categories du menu
-- Meme principe strictement additif que menu_items : on AJOUTE une colonne,
-- rien n est modifie ni supprime. nom reste la donnee, nom_en sert uniquement
-- a l affichage, et un nom_en vide fait retomber sur le francais.

ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS nom_en TEXT;

COMMENT ON COLUMN menu_categories.nom_en IS
  'Nom de categorie affiche en anglais. AFFICHAGE UNIQUEMENT. Vide = repli sur nom.';
