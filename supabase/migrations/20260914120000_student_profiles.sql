alter table hoc_vui_private.accounts
  add column if not exists avatar_id text;

alter table hoc_vui_private.accounts
  add column if not exists birth_date date;

alter table hoc_vui_private.accounts
  add column if not exists birthday_wishes_enabled boolean;

update hoc_vui_private.accounts
set avatar_id = coalesce(avatar_id, 'fox-scout'),
    birthday_wishes_enabled = coalesce(birthday_wishes_enabled, false);

alter table hoc_vui_private.accounts
  alter column avatar_id set default 'fox-scout',
  alter column avatar_id set not null,
  alter column birthday_wishes_enabled set default false,
  alter column birthday_wishes_enabled set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_avatar_id_check'
      and conrelid = 'hoc_vui_private.accounts'::regclass
  ) then
    alter table hoc_vui_private.accounts
      add constraint accounts_avatar_id_check
      check (avatar_id in ('fox-scout', 'fox-sunny', 'fox-leaf', 'fox-night'));
  end if;
end
$$;
