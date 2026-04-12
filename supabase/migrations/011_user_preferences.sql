-- Migration 011: user_preferences table
-- Stores onboarding preferences (genres, languages, content types) per user.

create table if not exists user_preferences (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  genres         text[]    default '{}',
  languages      text[]    default '{}',
  content_types  text[]    default '{}',
  onboarded      boolean   default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table user_preferences enable row level security;

create policy "prefs_select_own" on user_preferences
  for select using (auth.uid() = user_id);

create policy "prefs_upsert_own" on user_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_user_preferences_user_id on user_preferences(user_id);
