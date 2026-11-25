-- SÉCURITÉ (25/11/2026, contre-audit) : un visiteur (clé anon publique) pouvait écrire TOUTES les
-- colonnes d'une commande (edenred_payment_id, paygreen_*, cancellation_*, archived…) et donc
-- faire valider une commande avec le paiement d'une autre, ou piéger l'admin.
-- Le site (index.html, insert orderData) n'écrit que ces 11 colonnes : on ne garde qu'elles.
-- Fonctions serveur (service_role) et admin connecté (authenticated) : inchangés.
revoke insert, update on public.orders from anon;
grant insert (numero, items, total, statut, heure_retrait, client_prenom, client_email, client_telephone, note, language, created_at) on public.orders to anon;
-- order_items : le site n'y écrit jamais (seules les fonctions serveur) → plus d'écriture publique.
drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert to authenticated with check (true);
revoke insert, update on public.order_items from anon;
