-- Migration 012: Distribution pipeline improvements
-- Fixes schema gaps so singles, EPs, and albums all flow through admin review
-- before going live in the marketplace and being submitted to Ditto Music.

-- 1. Make track_id nullable (multi-track album releases have no single primary track)
alter table distribution_releases alter column track_id drop not null;

-- 2. Add distribution metadata columns needed for Ditto payload and admin review
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='user_id') then
    alter table distribution_releases
      add column user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='title') then
    alter table distribution_releases add column title text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='artist_name') then
    alter table distribution_releases add column artist_name text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='genre') then
    alter table distribution_releases add column genre text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='language_code') then
    alter table distribution_releases add column language_code text default 'en';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='release_type') then
    alter table distribution_releases add column release_type text default 'single';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='cover_url') then
    alter table distribution_releases add column cover_url text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='audio_url') then
    alter table distribution_releases add column audio_url text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='explicit') then
    alter table distribution_releases add column explicit boolean default false;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='release_date') then
    alter table distribution_releases add column release_date date;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='isrc') then
    alter table distribution_releases add column isrc text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='copyright_owner') then
    alter table distribution_releases add column copyright_owner text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='composer') then
    alter table distribution_releases add column composer text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='producer') then
    alter table distribution_releases add column producer text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='label_name') then
    alter table distribution_releases add column label_name text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='track_count') then
    alter table distribution_releases add column track_count int default 1;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='ecom_product_id') then
    alter table distribution_releases
      add column ecom_product_id uuid references ecom_products(id) on delete set null;
  end if;
end $$;

-- 3. Update RLS: artists need to insert and view their own releases
--    (original policy only allowed select via track ownership)
drop policy if exists "dist_releases_select_own" on distribution_releases;

create policy "dist_releases_select_own" on distribution_releases
  for select using (
    user_id = auth.uid()
    or (track_id is not null and exists (
      select 1 from tracks t where t.id = track_id and t.user_id = auth.uid()
    ))
  );

create policy "dist_releases_insert_own" on distribution_releases
  for insert with check (user_id = auth.uid());

create policy "dist_releases_update_own" on distribution_releases
  for update using (user_id = auth.uid());

-- 4. Index for the new user_id column
create index if not exists idx_distribution_releases_user_id
  on distribution_releases(user_id);
