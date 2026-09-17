create or replace function hoc_vui_private.challenge_options_are_valid(options_json jsonb, expected_correct_id text)
returns boolean
language plpgsql
immutable
as $$
declare
  option_json jsonb;
  option_id text;
  option_text text;
  option_ids text[] := '{}';
begin
  if jsonb_typeof(options_json) <> 'array' or jsonb_array_length(options_json) <> 4 then
    return false;
  end if;

  for option_json in select value from jsonb_array_elements(options_json) loop
    if jsonb_typeof(option_json) <> 'object' or not (option_json ? 'id') or not (option_json ? 'text') then
      return false;
    end if;
    option_id := option_json->>'id';
    option_text := option_json->>'text';
    if char_length(trim(option_id)) < 1 or char_length(trim(option_text)) not between 1 and 140 then
      return false;
    end if;
    if option_id = any(option_ids) then
      return false;
    end if;
    option_ids := array_append(option_ids, option_id);
  end loop;

  return expected_correct_id = any(option_ids);
end
$$;

create table if not exists hoc_vui_private.challenge_questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  source_fact_id text not null,
  source_version text not null,
  lesson_id text not null check (lesson_id ~ '^lesson-[0-9]{2}$'),
  lesson_title text not null check (char_length(trim(lesson_title)) between 1 and 160),
  prompt text not null check (char_length(prompt) between 20 and 240),
  options jsonb not null,
  correct_option_id text not null,
  explanation text not null check (char_length(explanation) between 20 and 500),
  status text not null default 'pending_parent_review' check (status in ('draft', 'pending_parent_review', 'approved', 'featured', 'closed', 'withdrawn', 'voided', 'archived')),
  revision integer not null default 1 check (revision > 0),
  created_local_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  featured_at timestamptz,
  closed_at timestamptz,
  review_reason text check (review_reason is null or char_length(trim(review_reason)) between 1 and 500),
  withdrawn_at timestamptz,
  voided_at timestamptz,
  constraint challenge_questions_options_valid check (hoc_vui_private.challenge_options_are_valid(options, correct_option_id))
);

create table if not exists hoc_vui_private.challenge_question_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references hoc_vui_private.challenge_questions(id) on delete cascade,
  revision integer not null check (revision > 0),
  decision text not null check (decision in ('approve', 'request_revision')),
  reason text check (reason is null or char_length(trim(reason)) between 1 and 500),
  reviewer_student_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  reviewer_scope text not null default 'parent_grant' check (reviewer_scope = 'parent_grant'),
  created_at timestamptz not null default now(),
  unique (question_id, revision)
);

create table if not exists hoc_vui_private.challenge_preferences (
  student_id uuid primary key references hoc_vui_private.accounts(id) on delete cascade,
  can_create boolean not null default true,
  can_participate boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists challenge_questions_author_day_idx on hoc_vui_private.challenge_questions (author_id, created_local_date);
create index if not exists challenge_questions_status_day_idx on hoc_vui_private.challenge_questions (status, created_local_date, reviewed_at);
create index if not exists challenge_questions_source_idx on hoc_vui_private.challenge_questions (source_fact_id, source_version);
create index if not exists challenge_questions_featured_idx on hoc_vui_private.challenge_questions (featured_at desc) where featured_at is not null;
create index if not exists challenge_question_reviews_question_idx on hoc_vui_private.challenge_question_reviews (question_id, revision, created_at);

create or replace function hoc_vui_private.challenge_require_student_account()
returns trigger
language plpgsql
as $$
declare
  account_id uuid;
  account_role text;
begin
  if tg_table_name = 'challenge_questions' then
    account_id := new.author_id;
  elsif tg_table_name = 'challenge_preferences' then
    account_id := new.student_id;
  else
    account_id := new.reviewer_student_id;
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
  if not exists (select 1 from pg_trigger where tgname = 'challenge_questions_author_student_trg' and tgrelid = 'hoc_vui_private.challenge_questions'::regclass) then
    create trigger challenge_questions_author_student_trg
      before insert or update of author_id on hoc_vui_private.challenge_questions
      for each row execute function hoc_vui_private.challenge_require_student_account();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'challenge_question_reviews_reviewer_student_trg' and tgrelid = 'hoc_vui_private.challenge_question_reviews'::regclass) then
    create trigger challenge_question_reviews_reviewer_student_trg
      before insert or update of reviewer_student_id on hoc_vui_private.challenge_question_reviews
      for each row execute function hoc_vui_private.challenge_require_student_account();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'challenge_preferences_student_trg' and tgrelid = 'hoc_vui_private.challenge_preferences'::regclass) then
    create trigger challenge_preferences_student_trg
      before insert or update of student_id on hoc_vui_private.challenge_preferences
      for each row execute function hoc_vui_private.challenge_require_student_account();
  end if;
end
$$;

alter table hoc_vui_private.challenge_questions enable row level security;
alter table hoc_vui_private.challenge_question_reviews enable row level security;
alter table hoc_vui_private.challenge_preferences enable row level security;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_questions
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_question_reviews
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.challenge_preferences
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

revoke all on table hoc_vui_private.challenge_questions, hoc_vui_private.challenge_question_reviews, hoc_vui_private.challenge_preferences from public, anon, authenticated, service_role;
