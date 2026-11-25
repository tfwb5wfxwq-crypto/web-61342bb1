-- SÉCURITÉ (25/11/2026, audit approfondi) : formats imposés aux champs écrits par le visiteur,
-- utilisés ensuite dans les mails, Telegram et l'admin. Mesuré sur toutes les commandes réelles :
-- numéro toujours « 1234 AB », prénom ≤ 19 car., heure ≤ 17 car., note ≤ 111 car.
-- NOT VALID : les anciennes lignes ne sont pas revérifiées (toutes conformes de toute façon).
alter table public.orders drop constraint if exists orders_numero_format;
alter table public.orders add constraint orders_numero_format check (numero ~ '^[0-9]{4} [A-Z]{2}$') not valid;
alter table public.orders drop constraint if exists orders_champs_texte;
alter table public.orders add constraint orders_champs_texte check (
  coalesce(length(client_prenom), 0) <= 80 and coalesce(client_prenom, '') !~ '[<>"`]'
  and coalesce(length(heure_retrait), 0) <= 40 and coalesce(heure_retrait, '') !~ '[<>"`]'
  and coalesce(length(client_telephone), 0) <= 30 and coalesce(client_telephone, '') !~ '[<>"`]'
  and coalesce(length(client_email), 0) <= 200 and coalesce(client_email, '') !~ '[<>"`\s]'
  and coalesce(length(note), 0) <= 1000
) not valid;
