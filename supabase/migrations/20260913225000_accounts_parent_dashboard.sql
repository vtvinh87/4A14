create extension if not exists pgcrypto;

create schema if not exists hoc_vui_private;

create table if not exists hoc_vui_private.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9]{3,16}$'),
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  role text not null check (role in ('student', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  credential_version integer not null default 1 check (credential_version > 0),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz
);

create table if not exists hoc_vui_private.credentials (
  owner_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  kind text not null check (kind in ('student', 'parent', 'admin')),
  hash text not null,
  salt text not null,
  algorithm text not null,
  must_change boolean not null default false,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, kind)
);

create table if not exists hoc_vui_private.auth_sessions (
  token_hash text primary key,
  id uuid not null unique default gen_random_uuid(),
  account_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  mode text not null check (mode in ('full', 'change-only')),
  change_kind text check (change_kind in ('student', 'parent')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  credential_version integer not null check (credential_version > 0),
  parent_grant_until timestamptz,
  parent_grant_hash text,
  constraint change_kind_required_for_change_only check ((mode = 'change-only' and change_kind is not null) or (mode = 'full' and change_kind is null))
);

create table if not exists hoc_vui_private.learning_runs (
  run_id uuid primary key,
  student_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^lesson-[0-9]{2}$'),
  lesson_version integer not null check (lesson_version > 0),
  device_id text not null check (length(device_id) between 1 and 128),
  status text not null check (status in ('active', 'completed', 'abandoned')) default 'active',
  state jsonb not null,
  generation bigint not null default 0 check (generation >= 0),
  last_sequence integer not null default 0 check (last_sequence >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists hoc_vui_private.learning_events (
  event_id uuid primary key,
  run_id uuid not null references hoc_vui_private.learning_runs(run_id) on delete cascade,
  student_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in ('run_started', 'discovery_done', 'hint_used', 'answer_submitted', 'next', 'heartbeat')),
  lesson_id text not null check (lesson_id ~ '^lesson-[0-9]{2}$'),
  lesson_version integer not null check (lesson_version > 0),
  device_id text not null check (length(device_id) between 1 and 128),
  activity_id text,
  response jsonb,
  hint_used boolean not null default false,
  correct boolean,
  client_time timestamptz,
  received_at timestamptz not null default now(),
  generation bigint not null default 0 check (generation >= 0),
  visible boolean not null default false,
  interactive boolean not null default false,
  unique (run_id, sequence)
);

create table if not exists hoc_vui_private.progress_snapshots (
  student_id uuid primary key references hoc_vui_private.accounts(id) on delete cascade,
  schema_version integer not null default 1,
  revision bigint not null default 0 check (revision >= 0),
  generation bigint not null default 0 check (generation >= 0),
  content_version text not null default 'lesson-content-v1',
  snapshot jsonb not null,
  legacy_imported boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists hoc_vui_private.migration_receipts (
  fingerprint text not null,
  student_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  status text not null check (status in ('previewed', 'imported', 'rejected')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (fingerprint, student_id)
);

create table if not exists hoc_vui_private.admin_audits (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references hoc_vui_private.accounts(id),
  action text not null,
  subject_id uuid references hoc_vui_private.accounts(id),
  result text not null check (result in ('success', 'failure')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_account_idx on hoc_vui_private.auth_sessions (account_id, expires_at);
create index if not exists learning_runs_student_idx on hoc_vui_private.learning_runs (student_id, updated_at desc);
create index if not exists learning_events_student_time_idx on hoc_vui_private.learning_events (student_id, received_at desc);
create index if not exists learning_events_run_idx on hoc_vui_private.learning_events (run_id, sequence);
create index if not exists admin_audits_actor_time_idx on hoc_vui_private.admin_audits (actor_id, created_at desc);

-- Keep upgrades from an earlier draft migration safe while retaining one source file.
alter table hoc_vui_private.learning_events add column if not exists lesson_id text;
alter table hoc_vui_private.learning_events add column if not exists lesson_version integer;
alter table hoc_vui_private.learning_events add column if not exists device_id text;
alter table hoc_vui_private.auth_sessions add column if not exists parent_grant_hash text;
alter table hoc_vui_private.progress_snapshots add column if not exists legacy_imported boolean not null default false;
alter table hoc_vui_private.learning_events add column if not exists visible boolean not null default false;
alter table hoc_vui_private.learning_events add column if not exists interactive boolean not null default false;

alter table hoc_vui_private.accounts enable row level security;
alter table hoc_vui_private.credentials enable row level security;
alter table hoc_vui_private.auth_sessions enable row level security;
alter table hoc_vui_private.learning_runs enable row level security;
alter table hoc_vui_private.learning_events enable row level security;
alter table hoc_vui_private.progress_snapshots enable row level security;
alter table hoc_vui_private.migration_receipts enable row level security;
alter table hoc_vui_private.admin_audits enable row level security;

revoke all on schema hoc_vui_private from public, anon, authenticated;
revoke all on all tables in schema hoc_vui_private from public, anon, authenticated;
revoke all on all sequences in schema hoc_vui_private from public, anon, authenticated;
