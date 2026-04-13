-- Migration 021: Chart History
-- Stores daily chart positions so the ChartsPage can show rank changes (▲▼).

create table if not exists chart_history (
  id         uuid primary key default gen_random_uuid(),
  track_id   uuid not null references tracks(id) on delete cascade,
  genre      text not null default 'all',
  language   text not null default 'all',
  rank       integer not null,
  chart_date date not null default current_date,
  unique (track_id, genre, language, chart_date)
);

create index if not exists idx_chart_history_date   on chart_history(chart_date desc);
create index if not exists idx_chart_history_track  on chart_history(track_id);
create index if not exists idx_chart_history_filter on chart_history(genre, language, chart_date desc);

alter table chart_history enable row level security;

-- Anyone can read chart history (public data)
create policy "chart_history_public_read" on chart_history
  for select using (true);

-- Service role / edge functions can write
create policy "chart_history_service_insert" on chart_history
  for insert with check (true);

create policy "chart_history_service_update" on chart_history
  for update using (true);
