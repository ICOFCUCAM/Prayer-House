-- 029_competition_submissions.sql
-- Create competition_submissions table used by socialPublisher.ts for
-- tracking approved competition entries that are published to social platforms.
-- Also add music_streams RLS that was missing from migration 002.

-- ── competition_submissions ───────────────────────────────────────────────────
create table if not exists competition_submissions (
  id                   uuid primary key default gen_random_uuid(),
  creator_id           uuid references auth.users(id) on delete set null,
  competition_id       uuid,
  entry_id             uuid,           -- links to competition_entries_v2
  title                text not null,
  description          text,
  audio_url            text,
  video_url            text,
  cover_art            text,
  status               text not null default 'pending'
                       check (status in ('pending', 'approved', 'rejected', 'published')),
  social_urls          jsonb,
  social_published_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_comp_submissions_creator   on competition_submissions(creator_id);
create index if not exists idx_comp_submissions_status    on competition_submissions(status);
create index if not exists idx_comp_submissions_published on competition_submissions(social_published_at);

alter table competition_submissions enable row level security;

-- Creators can read their own submissions
create policy "comp_submissions_creator_read"
  on competition_submissions for select
  using (creator_id = auth.uid());

-- Creators can insert their own submissions
create policy "comp_submissions_creator_insert"
  on competition_submissions for insert
  with check (creator_id = auth.uid());

-- Admins can manage all submissions
create policy "comp_submissions_admin_all"
  on competition_submissions for all
  using (
    (select raw_user_meta_data->>'role'
     from auth.users where id = auth.uid()) = 'admin'
  );

-- ── music_streams: add missing RLS ───────────────────────────────────────────
-- music_streams was created in migration 002 without RLS.
alter table music_streams enable row level security;

-- Anyone can insert a stream event (anonymous listeners have null listener_id)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'music_streams'
      and policyname = 'music_streams_insert_all'
  ) then
    execute $p$
      create policy "music_streams_insert_all"
        on music_streams for insert
        with check (true)
    $p$;
  end if;
end $$;

-- Artists can read stream data for their own tracks
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'music_streams'
      and policyname = 'music_streams_artist_select'
  ) then
    execute $p$
      create policy "music_streams_artist_select"
        on music_streams for select
        using (
          exists (
            select 1 from tracks
            where tracks.id = music_streams.track_id
              and tracks.artist_id = auth.uid()
          )
        )
    $p$;
  end if;
end $$;

-- Admins can read all streams
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'music_streams'
      and policyname = 'music_streams_admin_all'
  ) then
    execute $p$
      create policy "music_streams_admin_all"
        on music_streams for all
        using (
          (select raw_user_meta_data->>'role'
           from auth.users where id = auth.uid()) = 'admin'
        )
    $p$;
  end if;
end $$;
