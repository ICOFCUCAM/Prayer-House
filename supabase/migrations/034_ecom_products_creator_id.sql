-- 034_ecom_products_creator_id.sql
-- The ecom_products table was created with vendor_id as the owner column,
-- but the application code uniformly uses creator_id to filter products
-- (FollowFeed, PersonalizedSections, ArtistPublicPage, Creator Analytics, etc.).
--
-- This migration adds creator_id as an alias column and backfills it from
-- vendor_id. New inserts should set both vendor_id and creator_id to user.id.
-- Also adds a vendor (text) column used in PersonalizedSections for display.

-- Add creator_id (uuid) if it doesn't exist
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ecom_products' and column_name = 'creator_id'
  ) then
    alter table ecom_products
      add column creator_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- Backfill creator_id from vendor_id for existing rows
update ecom_products
set creator_id = vendor_id
where creator_id is null and vendor_id is not null;

create index if not exists idx_ecom_products_creator on ecom_products(creator_id);

-- Add vendor (text) display name column used in product listings
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ecom_products' and column_name = 'vendor'
  ) then
    alter table ecom_products add column vendor text;
  end if;
end $$;

-- Add stream_count column used in AppLayout for trending product fetch
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ecom_products' and column_name = 'stream_count'
  ) then
    alter table ecom_products add column stream_count bigint not null default 0;
  end if;
end $$;

-- Update the vendor all-access policy to also match creator_id for backward
-- compatibility with existing code that inserts only creator_id
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ecom_products' and policyname = 'ecom_products_creator_all'
  ) then
    execute $p$
      create policy "ecom_products_creator_all" on ecom_products for all
      using (
        vendor_id = auth.uid() or creator_id = auth.uid()
      )
      with check (
        vendor_id = auth.uid() or creator_id = auth.uid()
      )
    $p$;
  end if;
end $$;
