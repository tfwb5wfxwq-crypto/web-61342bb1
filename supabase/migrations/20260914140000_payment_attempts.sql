-- Distinguer "s'est arrete avant de payer" de "carte refusee par la banque".
-- L'information existait deja dans la reponse PayGreen (tableau transactions) mais
-- n'etait ni lue ni conservee : impossible de compter sur la duree.
-- Mesure du 14/09/2026 : sur 21 jours, TOUS les paiements "expired" avaient 0 transaction.
alter table orders add column if not exists payment_attempts int;
alter table orders add column if not exists payment_last_tx_status text;
comment on column orders.payment_attempts is 'Nombre de transactions PayGreen : 0 = le client n a jamais saisi de carte.';
comment on column orders.payment_last_tx_status is 'Statut de la derniere transaction PayGreen (refused, captured...).';
