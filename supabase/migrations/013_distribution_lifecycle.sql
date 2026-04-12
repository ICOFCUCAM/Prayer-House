-- Migration 013: Full distribution lifecycle upgrade
-- Adds new status values, release_reviews, distributor_exports
-- Adds territories + contributors columns

-- ── 1. Extend distribution_releases.status CHECK ─────────────────────────────
alter table distribution_releases drop constraint if exists distribution_releases_status_check;
alter table distribution_releases add constraint distribution_releases_status_check
  check (status in (
    -- new lifecycle
    'draft', 'submitted', 'under_review', 'changes_requested',
    'approved', 'sent_to_ditto', 'distributed', 'live', 'rejected',
    -- legacy values kept for backward compatibility
    'pending_admin_review', 'approved_for_distribution',
    'submitted_to_ditto', 'priority_distribution_queue'
  ));

-- ── 2. Add territories column ─────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='territories') then
    alter table distribution_releases add column territories text[] default '{}'::text[];
  end if;
end $$;

-- ── 3. Add reviewed_at column ─────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='reviewed_at') then
    alter table distribution_releases add column reviewed_at timestamptz;
  end if;
end $$;

-- ── 4. Fix tracks.status CHECK to include 'pending' ──────────────────────────
alter table tracks drop constraint if exists tracks_status_check;
alter table tracks add constraint tracks_status_check
  check (status in ('draft','pending','pending_review','approved','rejected','live'));

-- ── 5. Add contributors column to tracks ─────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='tracks' and column_name='contributors') then
    alter table tracks add column contributors jsonb default '[]'::jsonb;
  end if;
end $$;

-- ── 6. Add isrc column to tracks ─────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='tracks' and column_name='isrc') then
    alter table tracks add column isrc text;
  end if;
end $$;

-- ── 7. Create release_reviews table ──────────────────────────────────────────
create table if not exists release_reviews (
  id         uuid primary key default gen_random_uuid(),
  release_id uuid not null references distribution_releases(id) on delete cascade,
  admin_id   uuid references auth.users(id) on delete set null,
  action     text not null check (action in (
    'submitted','under_review','changes_requested',
    'approved','rejected','sent_to_ditto','distributed','live'
  )),
  notes      text,
  created_at timestamptz default now()
);
create index if not exists idx_release_reviews_release_id on release_reviews(release_id);
create index if not exists idx_release_reviews_admin_id   on release_reviews(admin_id);

-- ── 8. Create distributor_exports table ──────────────────────────────────────
create table if not exists distributor_exports (
  id             uuid primary key default gen_random_uuid(),
  release_id     uuid not null references distribution_releases(id) on delete cascade,
  distributor    text not null default 'ditto',
  export_status  text not null default 'pending'
                 check (export_status in ('pending','processing','submitted','failed')),
  export_payload jsonb,
  response       jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_distributor_exports_release_id on distributor_exports(release_id);

-- ── 9. RLS — release_reviews ─────────────────────────────────────────────────
alter table release_reviews enable row level security;

-- Artist can see reviews for their own releases
create policy "release_reviews_artist_select" on release_reviews
  for select using (
    exists (
      select 1 from distribution_releases dr
      where dr.id = release_id and dr.user_id = auth.uid()
    )
  );

-- Admins have full access
create policy "release_reviews_admin_all" on release_reviews
  using (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- ── 10. RLS — distributor_exports ────────────────────────────────────────────
alter table distributor_exports enable row level security;

create policy "distributor_exports_artist_select" on distributor_exports
  for select using (
    exists (
      select 1 from distribution_releases dr
      where dr.id = release_id and dr.user_id = auth.uid()
    )
  );

create policy "distributor_exports_admin_all" on distributor_exports
  using (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- ── 11. Realtime ──────────────────────────────────────────────────────────────
alter publication supabase_realtime add table release_reviews;
alter publication supabase_realtime add table distributor_exports;
