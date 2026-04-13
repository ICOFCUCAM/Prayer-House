-- 031_ecom_missing_tables.sql
-- Create missing e-commerce tables: collections, product_collections,
-- product_variants, and order_items.
-- All statements are idempotent (IF NOT EXISTS).

-- ── ecom_collections ─────────────────────────────────────────────────────────
create table if not exists ecom_collections (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  handle      text not null unique,       -- URL slug (e.g. 'trending', 'books')
  description text,
  image_url   text,
  is_visible  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_ecom_collections_handle on ecom_collections(handle);

alter table ecom_collections enable row level security;

-- Public read
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_collections' and policyname = 'ecom_collections_public_read'
  ) then
    execute $p$ create policy "ecom_collections_public_read" on ecom_collections for select using (is_visible = true) $p$;
  end if;
end $$;

-- Admins can manage collections
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_collections' and policyname = 'ecom_collections_admin_all'
  ) then
    execute $p$
      create policy "ecom_collections_admin_all" on ecom_collections for all
      using ((select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin')
    $p$;
  end if;
end $$;

-- Seed default collections if table is empty
insert into ecom_collections (title, handle, description, is_visible, sort_order)
select title, handle, description, is_visible, sort_order from (values
  ('Trending',        'trending',      'Top trending content this week',       true,  1),
  ('Featured',        'featured',      'Editor''s picks',                       true,  2),
  ('Music',           'music',         'Music releases',                        true,  3),
  ('Books',           'books',         'Books and e-books',                     true,  4),
  ('Videos',          'videos',        'Video content',                         true,  5),
  ('Podcasts',        'podcasts',      'Podcast episodes',                      true,  6),
  ('Talent Arena',    'talent-arena',  'Competition performances',              true,  7),
  ('New Releases',    'new-releases',  'Latest releases',                       true,  8)
) as t(title, handle, description, is_visible, sort_order)
where not exists (select 1 from ecom_collections);

-- ── ecom_product_collections ─────────────────────────────────────────────────
create table if not exists ecom_product_collections (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references ecom_collections(id) on delete cascade,
  product_id    uuid not null references ecom_products(id) on delete cascade,
  position      integer not null default 0,
  added_at      timestamptz not null default now(),
  unique (collection_id, product_id)
);

create index if not exists idx_ecom_pc_collection on ecom_product_collections(collection_id);
create index if not exists idx_ecom_pc_product    on ecom_product_collections(product_id);

alter table ecom_product_collections enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_product_collections' and policyname = 'ecom_pc_public_read'
  ) then
    execute $p$ create policy "ecom_pc_public_read" on ecom_product_collections for select using (true) $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_product_collections' and policyname = 'ecom_pc_admin_all'
  ) then
    execute $p$
      create policy "ecom_pc_admin_all" on ecom_product_collections for all
      using ((select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin')
    $p$;
  end if;
end $$;

-- ── ecom_product_variants ────────────────────────────────────────────────────
-- Variants represent different purchase options (e.g. ebook vs audiobook bundle)
create table if not exists ecom_product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references ecom_products(id) on delete cascade,
  title        text not null,              -- e.g. "E-book", "Audio + E-book Bundle"
  price        numeric(10,2) not null default 0,
  compare_at   numeric(10,2),             -- strike-through price
  sku          text,
  available    boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_ecom_variants_product on ecom_product_variants(product_id);

alter table ecom_product_variants enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_product_variants' and policyname = 'ecom_variants_public_read'
  ) then
    execute $p$ create policy "ecom_variants_public_read" on ecom_product_variants for select using (available = true) $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_product_variants' and policyname = 'ecom_variants_vendor_all'
  ) then
    execute $p$
      create policy "ecom_variants_vendor_all" on ecom_product_variants for all
      using (
        exists (
          select 1 from ecom_products
          where ecom_products.id = ecom_product_variants.product_id
            and ecom_products.vendor_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

-- ── ecom_order_items ─────────────────────────────────────────────────────────
create table if not exists ecom_order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references ecom_orders(id) on delete cascade,
  product_id uuid references ecom_products(id) on delete set null,
  variant_id uuid references ecom_product_variants(id) on delete set null,
  title      text not null,
  price      integer not null default 0,   -- in cents
  quantity   integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_ecom_oi_order   on ecom_order_items(order_id);
create index if not exists idx_ecom_oi_product on ecom_order_items(product_id);

alter table ecom_order_items enable row level security;

-- Buyers can read items from their own orders
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_order_items' and policyname = 'ecom_oi_buyer_read'
  ) then
    execute $p$
      create policy "ecom_oi_buyer_read" on ecom_order_items for select
      using (
        exists (
          select 1 from ecom_orders
          where ecom_orders.id = ecom_order_items.order_id
            and ecom_orders.user_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

-- Any authenticated user can insert order items (fulfillment path)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ecom_order_items' and policyname = 'ecom_oi_insert_auth'
  ) then
    execute $p$
      create policy "ecom_oi_insert_auth" on ecom_order_items for insert
      with check (auth.uid() is not null)
    $p$;
  end if;
end $$;
