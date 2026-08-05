-- Migration: Restaurer la policy INSERT sur orders (cassée)
-- Les clients doivent pouvoir créer des commandes via le flow normal
-- MAIS uniquement avec statut 'pending' (jamais directement 'payee')

-- Supprimer si elle existe déjà (en cas de doublon)
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_insert_anon" ON orders;

-- Anon peut INSERT uniquement des commandes pending (flow normal via index.html)
-- Ils ne peuvent PAS créer directement des commandes payees/acceptees
CREATE POLICY "orders_insert_anon" ON orders
  FOR INSERT
  WITH CHECK (statut = 'pending');
