-- Migration 024: Notification preferences per user
-- Stores per-user toggle settings for email and push notifications.

create table if not exists notification_preferences (
  user_id             uuid primary key references auth.users(id) on delete cascade,

  -- Email toggles
  email_new_release   boolean not null default true,
  email_competition   boolean not null default true,
  email_payout        boolean not null default true,
  email_comment       boolean not null default false,
  email_follow        boolean not null default false,
  email_newsletter    boolean not null default true,

  -- Push toggles
  push_new_release    boolean not null default true,
  push_competition    boolean not null default true,
  push_payout         boolean not null default true,
  push_comment        boolean not null default true,
  push_follow         boolean not null default true,

  updated_at          timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "notif_prefs_owner" on notification_preferences
  for all using (user_id = auth.uid());
