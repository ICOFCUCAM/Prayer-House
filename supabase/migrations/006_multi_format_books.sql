-- ============================================================
-- WANKONG — Multi-format & Multi-source Book Publishing
-- Adds format flags, per-format prices, Amazon URLs,
-- source selectors, external URLs, and visibility controls
-- to ecom_products.
-- Run: check column existence before each ALTER to stay
-- idempotent on repeated deployments.
-- ============================================================

-- ── Format availability flags ────────────────────────────────
alter table ecom_products
  add column if not exists has_ebook     boolean not null default false,
  add column if not exists has_audiobook boolean not null default false,
  add column if not exists has_softcover boolean not null default false,
  add column if not exists has_hardcover boolean not null default false;

-- ── Per-format prices ────────────────────────────────────────
alter table ecom_products
  add column if not exists ebook_price     numeric(10,2),
  add column if not exists audiobook_price numeric(10,2),
  add column if not exists softcover_price numeric(10,2),
  add column if not exists hardcover_price numeric(10,2);

-- ── Amazon direct-purchase URLs ──────────────────────────────
alter table ecom_products
  add column if not exists amazon_softcover_url text,
  add column if not exists amazon_hardcover_url text;

-- ── Multi-source fields ──────────────────────────────────────
-- source: 'wankong' (checkout), 'amazon' (Amazon link), 'external' (any URL)
alter table ecom_products
  add column if not exists softcover_source text
    check (softcover_source in ('wankong', 'amazon', 'external')),
  add column if not exists hardcover_source text
    check (hardcover_source in ('wankong', 'amazon', 'external'));

-- External purchase URLs (used when source = 'external')
alter table ecom_products
  add column if not exists softcover_external_url text,
  add column if not exists hardcover_external_url text;

-- ── Visibility controls (admin can hide a format from store) ─
alter table ecom_products
  add column if not exists softcover_visible boolean not null default true,
  add column if not exists hardcover_visible boolean not null default true;

-- ── Audiobook narrator & duration ────────────────────────────
-- (used by AudiobooksCollectionPage)
alter table ecom_products
  add column if not exists narrator         text,
  add column if not exists duration_minutes integer;

-- ── competition_notifications table ─────────────────────────
-- (used by TalentArenaPage Notify Me button)
create table if not exists competition_notifications (
  id             uuid primary key default gen_random_uuid(),
  competition_id text not null,
  user_id        uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (competition_id, user_id)
);

alter table competition_notifications enable row level security;

create policy "Users manage own notifications"
  on competition_notifications for all
  using (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_ecom_has_ebook
  on ecom_products(has_ebook) where has_ebook = true;

create index if not exists idx_ecom_has_audiobook
  on ecom_products(has_audiobook) where has_audiobook = true;

create index if not exists idx_ecom_has_softcover
  on ecom_products(has_softcover) where has_softcover = true;

create index if not exists idx_ecom_has_hardcover
  on ecom_products(has_hardcover) where has_hardcover = true;
