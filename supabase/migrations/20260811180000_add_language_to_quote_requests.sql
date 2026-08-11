-- Migration : langue de la demande de devis traiteur
-- Meme principe que orders.language, ajoute en avril : on enregistre la langue
-- du visiteur au moment de la demande, pour que l email de confirmation parte
-- dans la langue ou il a rempli le formulaire.
--
-- STRICTEMENT ADDITIF. Colonne NOT NULL avec DEFAULT 'fr' : les demandes deja
-- enregistrees prennent 'fr', ce qui est exact puisque le site n existait qu en
-- francais jusqu ici. Rejouer la migration ne fait rien.

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'fr'
  CHECK (language IN ('fr', 'en'));

COMMENT ON COLUMN quote_requests.language IS
  'Langue du visiteur au moment de la demande (fr ou en). Utilisee par send-quote-confirmation pour l email client.';
