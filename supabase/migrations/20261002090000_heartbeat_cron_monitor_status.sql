-- 02/10/2026 — NON APPLIQUÉE (à lancer AVANT de déployer system-heartbeat, cf. rapport).
-- La ligne « 🔄 Cron moniteur : ✅ actif » du heartbeat était écrite EN DUR : elle ne
-- testait rien. Cette fonction lui donne de quoi la rendre vraie :
--   - le job pg_cron `monitor-pending-orders` (jobid 2, toutes les 2 min) est-il actif ?
--   - quand a-t-il réussi pour la dernière fois ? (cron.job_run_details)
--   - quand la fonction edge a-t-elle répondu 200 pour la dernière fois ?
--     (net._http_response, conservé ~6 h par pg_net ; la réponse du moniteur
--      commence toujours par {"checked": — c'est ainsi qu'on la reconnaît)
-- Lecture seule. SECURITY DEFINER car les schémas cron/net ne sont pas exposés à
-- l'API ; exécutable UNIQUEMENT par service_role (le heartbeat), jamais par anon.
create or replace function public.heartbeat_cron_monitor()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'jobid', j.jobid,
    'jobname', j.jobname,
    'active', j.active,
    'dernier_ok', (
      select max(d.end_time) from cron.job_run_details d
       where d.jobid = j.jobid and d.status = 'succeeded'
         and d.start_time > now() - interval '1 day'),
    'echecs_1h', (
      select count(*) from cron.job_run_details d
       where d.jobid = j.jobid and d.status <> 'succeeded'
         and d.start_time > now() - interval '1 hour'),
    'derniere_reponse_200', (
      select max(r.created) from net._http_response r
       where r.status_code = 200 and r.content like '{"checked":%'),
    'maintenant', now()
  )
  from cron.job j
  where j.jobname = 'monitor-pending-orders'
$$;

revoke all on function public.heartbeat_cron_monitor() from public, anon, authenticated;
grant execute on function public.heartbeat_cron_monitor() to service_role;

comment on function public.heartbeat_cron_monitor() is
  'Etat reel du cron monitor-pending-orders pour system-heartbeat (02/10/2026). Lecture seule.';
