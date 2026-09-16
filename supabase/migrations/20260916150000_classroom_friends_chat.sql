create table if not exists hoc_vui_private.classroom_presence (
  account_id uuid primary key references hoc_vui_private.accounts(id) on delete cascade,
  last_seen timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists hoc_vui_private.classroom_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  recipient_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint classroom_messages_distinct_accounts check (sender_id <> recipient_id)
);

create index if not exists classroom_presence_last_seen_idx on hoc_vui_private.classroom_presence (last_seen desc);
create index if not exists classroom_messages_recipient_unread_idx on hoc_vui_private.classroom_messages (recipient_id, sender_id) where read_at is null;
create index if not exists classroom_messages_conversation_idx on hoc_vui_private.classroom_messages (sender_id, recipient_id, created_at);
create index if not exists classroom_messages_conversation_reverse_idx on hoc_vui_private.classroom_messages (recipient_id, sender_id, created_at);
create index if not exists classroom_messages_sender_time_idx on hoc_vui_private.classroom_messages (sender_id, created_at);

alter table hoc_vui_private.classroom_presence enable row level security;
alter table hoc_vui_private.classroom_messages enable row level security;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.classroom_presence
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

do $$
begin
  create policy hoc_vui_runtime_all on hoc_vui_private.classroom_messages
    for all to hoc_vui_runtime using (true) with check (true);
exception when duplicate_object then null;
end
$$;

revoke all on schema hoc_vui_private from public, anon, authenticated, service_role;
revoke all on table hoc_vui_private.classroom_presence, hoc_vui_private.classroom_messages from public, anon, authenticated, service_role;
