-- 17/09/2026 : d'ou vient la commande (campagne Google Ads lancee ce jour).
-- Le front capte gclid/gbraid/wbraid + utm_* a l'arrivee sur le site (localStorage 30 j),
-- create-payment les valide et les ecrit ici ; send-telegram-notification les affiche a Paco.
alter table orders add column if not exists attribution jsonb;
comment on column orders.attribution is 'Origine de la visite : {gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, captured_at}. NULL = visite directe / inconnue.';

-- Compter vite les commandes venues d'une pub Google : where attribution->>'gclid' is not null
create index if not exists idx_orders_attribution_gclid on orders ((attribution->>'gclid')) where attribution is not null;
