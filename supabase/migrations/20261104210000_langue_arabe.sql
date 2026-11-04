-- Version arabe (04/11/2026) : les commandes et demandes de devis peuvent être en arabe.
-- Additif : fr et en restent acceptés comme avant.
-- Retour arrière (seulement s'il n'existe aucune ligne en 'ar') :
--   ALTER TABLE public.orders DROP CONSTRAINT orders_language_check;
--   ALTER TABLE public.orders ADD CONSTRAINT orders_language_check CHECK (language IN ('fr','en'));
--   (idem quote_requests_language_check)
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND pg_get_constraintdef(oid) ILIKE '%language%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE public.orders ADD CONSTRAINT orders_language_check CHECK (language IN ('fr','en','ar'));

  SELECT conname INTO c FROM pg_constraint WHERE conrelid = 'public.quote_requests'::regclass AND pg_get_constraintdef(oid) ILIKE '%language%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.quote_requests DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE public.quote_requests ADD CONSTRAINT quote_requests_language_check CHECK (language IN ('fr','en','ar'));
END $$;
