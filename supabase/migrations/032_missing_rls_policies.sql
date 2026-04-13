-- 032_missing_rls_policies.sql
-- Five tables in migration 003 had RLS enabled but zero policies, meaning
-- Supabase denied ALL access to them at runtime.
-- This migration adds the minimum required read + admin-write policies.

-- ── book_translations ─────────────────────────────────────────────────────────
-- Book owners can read translations for their own products; admins manage all.
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'book_translations' and policyname = 'book_translations_owner_read'
  ) then
    execute $p$
      create policy "book_translations_owner_read" on book_translations for select
      using (
        exists (
          select 1 from ecom_products
          where ecom_products.id = book_translations.book_id
            and ecom_products.creator_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'book_translations' and policyname = 'book_translations_admin_all'
  ) then
    execute $p$
      create policy "book_translations_admin_all" on book_translations for all
      using (
        (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
      )
    $p$;
  end if;
end $$;

-- ── competition_transcripts ───────────────────────────────────────────────────
-- Anyone can read completed transcripts (public captions); admins manage all.
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'competition_transcripts' and policyname = 'comp_transcripts_public_read'
  ) then
    execute $p$
      create policy "comp_transcripts_public_read" on competition_transcripts for select
      using (status = 'done')
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'competition_transcripts' and policyname = 'comp_transcripts_admin_all'
  ) then
    execute $p$
      create policy "comp_transcripts_admin_all" on competition_transcripts for all
      using (
        (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
      )
    $p$;
  end if;
end $$;

-- ── competition_subtitles ─────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'competition_subtitles' and policyname = 'comp_subtitles_public_read'
  ) then
    execute $p$
      create policy "comp_subtitles_public_read" on competition_subtitles for select
      using (status = 'done')
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'competition_subtitles' and policyname = 'comp_subtitles_admin_all'
  ) then
    execute $p$
      create policy "comp_subtitles_admin_all" on competition_subtitles for all
      using (
        (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
      )
    $p$;
  end if;
end $$;

-- ── competition_clips ─────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'competition_clips' and policyname = 'comp_clips_public_read'
  ) then
    execute $p$
      create policy "comp_clips_public_read" on competition_clips for select
      using (status = 'done')
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'competition_clips' and policyname = 'comp_clips_admin_all'
  ) then
    execute $p$
      create policy "comp_clips_admin_all" on competition_clips for all
      using (
        (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
      )
    $p$;
  end if;
end $$;

-- ── distribution_canvas_assets ────────────────────────────────────────────────
-- Release owner can read their own assets; admins manage all.
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'distribution_canvas_assets' and policyname = 'canvas_assets_owner_read'
  ) then
    execute $p$
      create policy "canvas_assets_owner_read" on distribution_canvas_assets for select
      using (
        exists (
          select 1 from distribution_releases
          where distribution_releases.id = distribution_canvas_assets.release_id
            and distribution_releases.user_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'distribution_canvas_assets' and policyname = 'canvas_assets_admin_all'
  ) then
    execute $p$
      create policy "canvas_assets_admin_all" on distribution_canvas_assets for all
      using (
        (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
      )
    $p$;
  end if;
end $$;
