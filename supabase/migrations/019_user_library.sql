-- Migration 019: User Library + Purchase Fulfillment
-- Tracks which products a user has purchased/unlocked and grants content access.

-- ── 1. user_library — content a user has access to ───────────────────────────
create table if not exists user_library (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid references ecom_products(id) on delete set null,
  order_id    uuid references ecom_orders(id) on delete set null,
  access_type text not null default 'purchase'
              check (access_type in ('purchase', 'subscription', 'gift', 'promo', 'free')),
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz,          -- null = lifetime access
  unique (user_id, product_id)      -- one access row per user per product
);

create index if not exists idx_user_library_user     on user_library(user_id);
create index if not exists idx_user_library_product  on user_library(product_id);
create index if not exists idx_user_library_order    on user_library(order_id);

alter table user_library enable row level security;

-- Users can read their own library
create policy "user_library_owner_read" on user_library
  for select using (user_id = auth.uid());

-- Users can insert their own library rows (fulfillment runs as the buyer)
create policy "user_library_owner_insert" on user_library
  for insert with check (user_id = auth.uid());

-- Admins can manage all library rows
create policy "user_library_admin_all" on user_library
  for all using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = auth.uid()
    )
  );

-- ── 2. vendor_id on ecom_products (if not already present) ───────────────────
-- Stores the seller's auth.users UUID so earnings can be credited on purchase.
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ecom_products' and column_name = 'vendor_id'
  ) then
    alter table ecom_products add column vendor_id uuid references auth.users(id) on delete set null;
    create index if not exists idx_ecom_products_vendor on ecom_products(vendor_id);
  end if;
end $$;

-- ── 3. fulfillment_status index on ecom_orders ────────────────────────────────
create index if not exists idx_ecom_orders_fulfillment
  on ecom_orders(fulfillment_status);
