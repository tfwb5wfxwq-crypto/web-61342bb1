-- 02/10/2026 — NON APPLIQUÉE.
-- Le job pg_cron n°3 `system-heartbeat-daily` appelle la fonction via net.http_post SANS
-- timeout_milliseconds → pg_net coupe à 5 000 ms par défaut. Le 02/10 à 08:00 l'appel a
-- été coupé à 5 s (« HTTP Request/Response 4941 ms »). Le nouveau heartbeat fait jusqu'à
-- 3 essais du site espacés de 20 s (pire cas ≈ 50 s) → on passe à 60 s.
--
-- On RÉÉCRIT la commande existante au lieu de la recopier : elle contient la clé
-- service_role, qui ne doit apparaître dans AUCUN fichier du dépôt.
-- Idempotent : ne fait rien si le timeout est déjà là ; refuse si le format a changé.
do $$
declare
  v_jobid bigint;
  v_cmd   text;
  v_old   constant text := $q$body:='{}'::jsonb$q$;
  v_new   constant text := $q$body:='{}'::jsonb,
    timeout_milliseconds:=60000$q$;
begin
  select jobid, command into v_jobid, v_cmd
    from cron.job where jobname = 'system-heartbeat-daily';
  if v_jobid is null then
    raise exception 'job system-heartbeat-daily introuvable : rien modifié';
  end if;
  if v_cmd like '%timeout_milliseconds%' then
    raise notice 'timeout déjà présent sur le job %, rien à faire', v_jobid;
    return;
  end if;
  if position(v_old in v_cmd) = 0 then
    raise exception 'format de commande inattendu sur le job % : rien modifié', v_jobid;
  end if;
  perform cron.alter_job(job_id := v_jobid, command := replace(v_cmd, v_old, v_new));
  raise notice 'job % : timeout_milliseconds := 60000 ajouté', v_jobid;
end $$;

-- Vérification (masque la clé) :
-- select jobid, regexp_replace(command, 'Bearer [A-Za-z0-9._-]+', 'Bearer <MASQUE>')
--   from cron.job where jobname = 'system-heartbeat-daily';
