-- The API owns the custom username/PIN authorization model. Keep the
-- database role separate from the migration owner and expose no table through
-- the Supabase Data API roles.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hoc_vui_runtime') then
    create role hoc_vui_runtime
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit
      nologin;
  else
    alter role hoc_vui_runtime
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit;
  end if;
end
$$;

grant usage on schema hoc_vui_private to hoc_vui_runtime;
grant select, insert, update, delete on all tables in schema hoc_vui_private to hoc_vui_runtime;
grant usage, select on all sequences in schema hoc_vui_private to hoc_vui_runtime;

alter default privileges for role postgres in schema hoc_vui_private
  grant select, insert, update, delete on tables to hoc_vui_runtime;
alter default privileges for role postgres in schema hoc_vui_private
  grant usage, select on sequences to hoc_vui_runtime;

revoke all on schema hoc_vui_private from public, anon, authenticated, service_role;
revoke all on all tables in schema hoc_vui_private from public, anon, authenticated, service_role;
revoke all on all sequences in schema hoc_vui_private from public, anon, authenticated, service_role;

-- The API validates the same owner in both columns. Keep that invariant true
-- even if a future write path bypasses the application service.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_runs_run_student_unique'
      and conrelid = 'hoc_vui_private.learning_runs'::regclass
  ) then
    alter table hoc_vui_private.learning_runs
      add constraint learning_runs_run_student_unique unique (run_id, student_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_events_run_student_fkey'
      and conrelid = 'hoc_vui_private.learning_events'::regclass
  ) then
    alter table hoc_vui_private.learning_events
      add constraint learning_events_run_student_fkey
      foreign key (run_id, student_id)
      references hoc_vui_private.learning_runs (run_id, student_id)
      on delete cascade;
  end if;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts',
    'credentials',
    'auth_sessions',
    'learning_runs',
    'learning_events',
    'progress_snapshots',
    'migration_receipts',
    'admin_audits'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'hoc_vui_private'
        and tablename = table_name
        and policyname = 'hoc_vui_runtime_all'
    ) then
      execute format(
        'create policy hoc_vui_runtime_all on hoc_vui_private.%I for all to hoc_vui_runtime using (true) with check (true)',
        table_name
      );
    end if;
  end loop;
end
$$;
