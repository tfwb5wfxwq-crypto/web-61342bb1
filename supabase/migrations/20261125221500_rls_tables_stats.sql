-- SÉCURITÉ (25/11/2026, audit) : 3 tables lisibles et modifiables par n'importe quel visiteur
-- (clé anon publique). email_opens contient des adresses IP.
-- Écritures : seulement par les tâches planifiées (cron, propriétaire de la table) et les
-- fonctions serveur (clé service_role) : toutes deux passent outre la RLS → aucun impact.
-- L'admin connecté (rôle authenticated) garde la lecture (onglet archives).

alter table public.email_opens     enable row level security;
alter table public.order_analytics enable row level security;
alter table public.archive_logs    enable row level security;

revoke all on public.email_opens, public.order_analytics, public.archive_logs from anon;

drop policy if exists "admin lit email_opens" on public.email_opens;
drop policy if exists "admin lit order_analytics" on public.order_analytics;
drop policy if exists "admin lit archive_logs" on public.archive_logs;

create policy "admin lit email_opens"     on public.email_opens     for select to authenticated using (true);
create policy "admin lit order_analytics" on public.order_analytics for select to authenticated using (true);
create policy "admin lit archive_logs"    on public.archive_logs    for select to authenticated using (true);
