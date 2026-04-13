-- 033_missing_tables.sql
-- Create three tables referenced in the codebase but missing from all
-- prior migrations: follows, product_comments, podcast_episodes.

-- ── follows ───────────────────────────────────────────────────────────────────
-- User-to-user follow graph used by FollowFeed and PersonalizedSections.
create table if not exists follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id)
);

create index if not exists idx_follows_follower  on follows(follower_id);
create index if not exists idx_follows_following on follows(following_id);

alter table follows enable row level security;

-- Anyone can see who follows whom (public social graph)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'follows' and policyname = 'follows_public_read'
  ) then
    execute $p$ create policy "follows_public_read" on follows for select using (true) $p$;
  end if;
end $$;

-- A user can follow/unfollow (insert/delete their own rows)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'follows' and policyname = 'follows_own_insert'
  ) then
    execute $p$
      create policy "follows_own_insert" on follows for insert
      with check (follower_id = auth.uid())
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'follows' and policyname = 'follows_own_delete'
  ) then
    execute $p$
      create policy "follows_own_delete" on follows for delete
      using (follower_id = auth.uid())
    $p$;
  end if;
end $$;

-- ── product_comments ─────────────────────────────────────────────────────────
-- Comments on ecom_products, used by CommentsSection component.
create table if not exists product_comments (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references ecom_products(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  likes      integer not null default 0,
  user_name  text,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_comments_product on product_comments(product_id);
create index if not exists idx_product_comments_user    on product_comments(user_id);

alter table product_comments enable row level security;

-- Anyone can read comments on visible products
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_comments' and policyname = 'product_comments_public_read'
  ) then
    execute $p$ create policy "product_comments_public_read" on product_comments for select using (true) $p$;
  end if;
end $$;

-- Authenticated users can post comments
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_comments' and policyname = 'product_comments_auth_insert'
  ) then
    execute $p$
      create policy "product_comments_auth_insert" on product_comments for insert
      with check (auth.uid() is not null and user_id = auth.uid())
    $p$;
  end if;
end $$;

-- Users can update (like) and delete their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_comments' and policyname = 'product_comments_own_update'
  ) then
    execute $p$
      create policy "product_comments_own_update" on product_comments for update
      using (user_id = auth.uid())
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_comments' and policyname = 'product_comments_own_delete'
  ) then
    execute $p$
      create policy "product_comments_own_delete" on product_comments for delete
      using (user_id = auth.uid())
    $p$;
  end if;
end $$;

-- Admins can moderate (delete any comment)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_comments' and policyname = 'product_comments_admin_all'
  ) then
    execute $p$
      create policy "product_comments_admin_all" on product_comments for all
      using (
        (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
      )
    $p$;
  end if;
end $$;

-- ── podcast_episodes ─────────────────────────────────────────────────────────
-- Individual episodes for podcast products, used by PodcastPage.
create table if not exists podcast_episodes (
  id           uuid primary key default gen_random_uuid(),
  podcast_id   uuid not null references ecom_products(id) on delete cascade,
  title        text not null,
  description  text,
  audio_url    text,
  duration_s   integer,
  episode_num  integer,
  season_num   integer not null default 1,
  cover_url    text,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists idx_podcast_episodes_podcast    on podcast_episodes(podcast_id);
create index if not exists idx_podcast_episodes_published  on podcast_episodes(published_at);

alter table podcast_episodes enable row level security;

-- Anyone can read episodes of published podcasts
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'podcast_episodes' and policyname = 'podcast_episodes_public_read'
  ) then
    execute $p$
      create policy "podcast_episodes_public_read" on podcast_episodes for select
      using (
        exists (
          select 1 from ecom_products
          where ecom_products.id = podcast_episodes.podcast_id
            and ecom_products.status = 'active'
        )
      )
    $p$;
  end if;
end $$;

-- Podcast creator can manage their episodes
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'podcast_episodes' and policyname = 'podcast_episodes_creator_all'
  ) then
    execute $p$
      create policy "podcast_episodes_creator_all" on podcast_episodes for all
      using (
        exists (
          select 1 from ecom_products
          where ecom_products.id = podcast_episodes.podcast_id
            and ecom_products.vendor_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

-- Admins can manage all episodes
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'podcast_episodes' and policyname = 'podcast_episodes_admin_all'
  ) then
    execute $p$
      create policy "podcast_episodes_admin_all" on podcast_episodes for all
      using (
        (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
      )
    $p$;
  end if;
end $$;
