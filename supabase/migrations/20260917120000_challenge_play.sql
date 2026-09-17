create table if not exists hoc_vui_private.challenge_rounds (
  round_date date primary key,
  timezone text not null default 'Asia/Ho_Chi_Minh' check (timezone = 'Asia/Ho_Chi_Minh'),
  status text not null default 'open' check (status in ('open', 'closed', 'empty')),
  target_contributions integer not null check (target_contributions between 10 and 60),
  current_contributions integer not null default 0 check (current_contributions >= 0),
  selected_question_count integer not null default 0 check (selected_question_count between 0 and 5),
  completed boolean not null default false,
  closes_at timestamptz not null,
  reward_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  voided_at timestamptz,
  selection_seed_version text not null default 'challenge-round-v1'
);

create table if not exists hoc_vui_private.challenge_round_items (
  id uuid primary key default gen_random_uuid(),
  round_date date not null references hoc_vui_private.challenge_rounds(round_date) on delete restrict,
  question_id uuid not null references hoc_vui_private.challenge_questions(id) on delete restrict,
  author_id uuid not null references hoc_vui_private.accounts(id) on delete restrict,
  position integer not null check (position between 1 and 5),
  featured_at timestamptz not null,
  selection_seed_version text not null,
  selection_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(selection_metadata) = 'object'),
  closed_at timestamptz,
  unique (round_date, question_id),
  unique (round_date, position)
);

create table if not exists hoc_vui_private.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  round_item_id uuid not null references hoc_vui_private.challenge_round_items(id) on delete restrict,
  round_date date not null references hoc_vui_private.challenge_rounds(round_date) on delete restrict,
  question_id uuid not null references hoc_vui_private.challenge_questions(id) on delete restrict,
  student_id uuid not null references hoc_vui_private.accounts(id) on delete restrict,
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 1 and 160),
  selected_option_id text not null check (char_length(trim(selected_option_id)) between 1 and 80),
  is_correct boolean not null,
  is_practice boolean not null default false,
  is_voided boolean not null default false,
  contribution smallint not null default 0 check (contribution in (0, 1)),
  answered_at timestamptz not null,
  constraint challenge_attempts_contribution_matches_state check (
    contribution = case when is_correct and not is_practice and not is_voided then 1 else 0 end
  ),
  unique (round_item_id, student_id),
  unique (student_id, idempotency_key)
);

create table if not exists hoc_vui_private.challenge_reactions (
  round_item_id uuid not null references hoc_vui_private.challenge_round_items(id) on delete restrict,
  actor_id uuid not null references hoc_vui_private.accounts(id) on delete restrict,
  reaction_type text not null check (reaction_type in ('interesting', 'learned', 'clear_explanation', 'thanks')),
  created_at timestamptz not null default now(),
  idempotency_key text,
  primary key (round_item_id, actor_id, reaction_type),
  check (idempotency_key is null or char_length(trim(idempotency_key)) between 1 and 160)
);

create table if not exists hoc_vui_private.challenge_reports (
  id uuid primary key default gen_random_uuid(),
  round_item_id uuid not null references hoc_vui_private.challenge_round_items(id) on delete restrict,
  reporter_id uuid not null references hoc_vui_private.accounts(id) on delete restrict,
  reason text not null check (reason in ('answer_or_source', 'unclear', 'inappropriate')),
  details text check (details is null or char_length(details) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'voided')),
  idempotency_key text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_reason text check (resolution_reason is null or char_length(trim(resolution_reason)) between 1 and 500),
  check (idempotency_key is null or char_length(trim(idempotency_key)) between 1 and 160),
  unique (round_item_id, reporter_id, reason)
);

create table if not exists hoc_vui_private.challenge_events (
  event_id uuid primary key,
  student_id uuid not null references hoc_vui_private.accounts(id) on delete restrict,
  event_type text not null check (event_type ~ '^challenge\.[a-z_]+$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null,
  local_date date not null,
  source text not null check (char_length(trim(source)) between 1 and 80),
  source_version text not null check (char_length(trim(source_version)) between 1 and 80),
  created_at timestamptz not null default now()
);

create unique index if not exists challenge_reactions_actor_idempotency_idx
  on hoc_vui_private.challenge_reactions (actor_id, idempotency_key)
  where idempotency_key is not null;
create unique index if not exists challenge_reports_reporter_idempotency_idx
  on hoc_vui_private.challenge_reports (reporter_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists challenge_rounds_status_idx on hoc_vui_private.challenge_rounds (status, round_date);
create index if not exists challenge_round_items_question_idx on hoc_vui_private.challenge_round_items (question_id, round_date);
create index if not exists challenge_round_items_day_idx on hoc_vui_private.challenge_round_items (round_date, position);
create index if not exists challenge_attempts_item_student_idx on hoc_vui_private.challenge_attempts (round_item_id, student_id);
create index if not exists challenge_attempts_student_day_idx on hoc_vui_private.challenge_attempts (student_id, round_date);
create index if not exists challenge_attempts_day_contribution_idx on hoc_vui_private.challenge_attempts (round_date, contribution) where is_voided = false;
create index if not exists challenge_reactions_item_idx on hoc_vui_private.challenge_reactions (round_item_id, reaction_type);
create index if not exists challenge_reports_open_idx on hoc_vui_private.challenge_reports (status, round_item_id) where status = 'open';
create index if not exists challenge_events_student_day_idx on hoc_vui_private.challenge_events (student_id, local_date, event_type);

create or replace function hoc_vui_private.challenge_play_require_student()
returns trigger
language plpgsql
as $$
declare
  account_id uuid;
  account_role text;
begin
  if tg_table_name = 'challenge_round_items' then
    account_id := new.author_id;
  elsif tg_table_name = 'challenge_attempts' then
    account_id := new.student_id;
  elsif tg_table_name = 'challenge_reactions' then
    account_id := new.actor_id;
  elsif tg_table_name = 'challenge_reports' then
    account_id := new.reporter_id;
  else
    account_id := new.student_id;
  end if;
  select role into account_role from hoc_vui_private.accounts where id = account_id;
  if account_role is distinct from 'student' then
    raise exception 'challenge_actor_must_be_student';
  end if;
  return new;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'challenge_round_items_author_student_trg' and tgrelid = 'hoc_vui_private.challenge_round_items'::regclass) then
    create trigger challenge_round_items_author_student_trg
      before insert or update of author_id on hoc_vui_private.challenge_round_items
      for each row execute function hoc_vui_private.challenge_play_require_student();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'challenge_attempts_student_trg' and tgrelid = 'hoc_vui_private.challenge_attempts'::regclass) then
    create trigger challenge_attempts_student_trg
      before insert or update of student_id on hoc_vui_private.challenge_attempts
      for each row execute function hoc_vui_private.challenge_play_require_student();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'challenge_reactions_actor_student_trg' and tgrelid = 'hoc_vui_private.challenge_reactions'::regclass) then
    create trigger challenge_reactions_actor_student_trg
      before insert or update of actor_id on hoc_vui_private.challenge_reactions
      for each row execute function hoc_vui_private.challenge_play_require_student();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'challenge_reports_reporter_student_trg' and tgrelid = 'hoc_vui_private.challenge_reports'::regclass) then
    create trigger challenge_reports_reporter_student_trg
      before insert or update of reporter_id on hoc_vui_private.challenge_reports
      for each row execute function hoc_vui_private.challenge_play_require_student();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'challenge_events_student_trg' and tgrelid = 'hoc_vui_private.challenge_events'::regclass) then
    create trigger challenge_events_student_trg
      before insert or update of student_id on hoc_vui_private.challenge_events
      for each row execute function hoc_vui_private.challenge_play_require_student();
  end if;
end
$$;

alter table hoc_vui_private.challenge_rounds enable row level security;
alter table hoc_vui_private.challenge_round_items enable row level security;
alter table hoc_vui_private.challenge_attempts enable row level security;
alter table hoc_vui_private.challenge_reactions enable row level security;
alter table hoc_vui_private.challenge_reports enable row level security;
alter table hoc_vui_private.challenge_events enable row level security;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_rounds
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_round_items
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_attempts
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_reactions
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_reports
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_events
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

revoke all on table hoc_vui_private.challenge_rounds, hoc_vui_private.challenge_round_items,
  hoc_vui_private.challenge_attempts, hoc_vui_private.challenge_reactions,
  hoc_vui_private.challenge_reports, hoc_vui_private.challenge_events
  from public, anon, authenticated, service_role;
