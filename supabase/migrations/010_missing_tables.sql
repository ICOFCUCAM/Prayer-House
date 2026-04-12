-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010 — Missing tables required by application code
-- Covers: ecom_products, ecom_orders, user_subscriptions, user_notifications,
--         membership_tiers, fan_subscriptions, content_reactions,
--         push_subscriptions, stream_events, stream_geo, track_likes,
--         content_reports, mpesa_transactions, social_accounts,
--         creator_balances, presaves / presave_emails
-- All statements are idempotent (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── E-commerce: products ──────────────────────────────────────────────────────

create table if not exists ecom_products (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid references auth.users(id) on delete cascade,
  title           text not null,
  handle          text unique,
  product_type    text,                      -- 'Music' | 'Book' | 'Audiobook' | 'Video' | 'Podcast'
  description     text,
  body_html       text,
  audio_url       text,
  cover_url       text,
  cover_image_url text,
  price           integer not null default 0, -- cents
  compare_at_price integer,
  genre           text,
  language        text,
  explicit        boolean default false,
  release_date    date,
  duration_minutes integer,
  episode_number  integer,
  category        text,
  isbn            text,
  upc             text,
  metadata        jsonb default '{}',
  status          text default 'active',
  is_featured     boolean default false,
  tags            text[],
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_ecom_products_vendor   on ecom_products(vendor_id);
create index if not exists idx_ecom_products_type     on ecom_products(product_type);
create index if not exists idx_ecom_products_genre    on ecom_products(genre);
create index if not exists idx_ecom_products_lang     on ecom_products(language);
create index if not exists idx_ecom_products_created  on ecom_products(created_at desc);

alter table ecom_products enable row level security;
create policy if not exists "ecom_products_public_read"
  on ecom_products for select using (status = 'active');
create policy if not exists "ecom_products_vendor_all"
  on ecom_products for all using (vendor_id = auth.uid());

-- ── E-commerce: orders ────────────────────────────────────────────────────────

create table if not exists ecom_orders (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users(id) on delete set null,
  customer_name           text,
  customer_email          text,
  shipping_address        jsonb default '{}',
  billing_address         jsonb default '{}',
  items                   jsonb not null default '[]',
  subtotal_cents          integer not null default 0,
  tax_cents               integer not null default 0,
  total_cents             integer not null default 0,
  payment_method          text,              -- 'card' | 'paypal' | 'mpesa' | 'mtn' | 'airtel'
  payment_status          text default 'pending', -- 'pending' | 'paid' | 'failed' | 'refunded'
  fulfillment_status      text default 'unfulfilled',
  stripe_payment_intent_id text,
  stripe_session_id       text,
  paypal_order_id         text,
  paypal_capture_id       text,
  mpesa_checkout_request_id text,
  mpesa_ref               text,
  paid_at                 timestamptz,
  notes                   text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index if not exists idx_ecom_orders_user       on ecom_orders(user_id);
create index if not exists idx_ecom_orders_status     on ecom_orders(payment_status);
create index if not exists idx_ecom_orders_created    on ecom_orders(created_at desc);
create index if not exists idx_ecom_orders_stripe_pi  on ecom_orders(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

alter table ecom_orders enable row level security;
create policy if not exists "ecom_orders_owner_read"
  on ecom_orders for select using (user_id = auth.uid());
create policy if not exists "ecom_orders_insert_auth"
  on ecom_orders for insert with check (user_id = auth.uid() or user_id is null);

-- ── Subscriptions (platform plans: free / pro / premium) ─────────────────────

create table if not exists user_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid unique references auth.users(id) on delete cascade,
  plan                  text not null default 'free',
  status                text not null default 'active', -- 'active' | 'cancelled' | 'past_due' | 'trialing'
  stripe_customer_id    text,
  stripe_subscription_id text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_user_subs_user   on user_subscriptions(user_id);
create index if not exists idx_user_subs_stripe on user_subscriptions(stripe_customer_id) where stripe_customer_id is not null;

alter table user_subscriptions enable row level security;
create policy if not exists "user_subs_owner"
  on user_subscriptions for all using (user_id = auth.uid());

-- ── In-app notifications ──────────────────────────────────────────────────────

create table if not exists user_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null default 'info',  -- 'info' | 'success' | 'warning' | 'new_follower' | 'new_comment' etc.
  title      text not null,
  body       text,
  url        text,
  read       boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_user_notif_user    on user_notifications(user_id, created_at desc);
create index if not exists idx_user_notif_unread  on user_notifications(user_id) where read = false;

alter table user_notifications enable row level security;
create policy if not exists "user_notif_owner"
  on user_notifications for all using (user_id = auth.uid());

-- ── Creator fan membership tiers ─────────────────────────────────────────────

create table if not exists membership_tiers (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  description      text,
  price_usd        numeric(10,2) not null default 5.00,
  perks            text[] default '{}',
  color            text default '#FFB800',
  is_active        boolean default true,
  subscriber_count integer default 0,
  stripe_price_id  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_membership_tiers_creator on membership_tiers(creator_id);

alter table membership_tiers enable row level security;
create policy if not exists "membership_tiers_public_read"
  on membership_tiers for select using (is_active = true);
create policy if not exists "membership_tiers_creator_all"
  on membership_tiers for all using (creator_id = auth.uid());

-- ── Fan subscriptions (fan → tier) ───────────────────────────────────────────

create table if not exists fan_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  fan_id                 uuid not null references auth.users(id) on delete cascade,
  tier_id                uuid not null references membership_tiers(id) on delete cascade,
  status                 text default 'active',  -- 'active' | 'cancelled' | 'past_due'
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now(),
  unique(fan_id, tier_id)
);

create index if not exists idx_fan_subs_fan  on fan_subscriptions(fan_id);
create index if not exists idx_fan_subs_tier on fan_subscriptions(tier_id);

alter table fan_subscriptions enable row level security;
create policy if not exists "fan_subs_owner"
  on fan_subscriptions for all using (fan_id = auth.uid());

-- Maintain subscriber_count on membership_tiers
create or replace function update_tier_subscriber_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    update membership_tiers set subscriber_count = subscriber_count + 1 where id = new.tier_id;
  elsif tg_op = 'UPDATE' then
    if old.status != 'active' and new.status = 'active' then
      update membership_tiers set subscriber_count = subscriber_count + 1 where id = new.tier_id;
    elsif old.status = 'active' and new.status != 'active' then
      update membership_tiers set subscriber_count = greatest(subscriber_count - 1, 0) where id = new.tier_id;
    end if;
  elsif tg_op = 'DELETE' and old.status = 'active' then
    update membership_tiers set subscriber_count = greatest(subscriber_count - 1, 0) where id = old.tier_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_tier_subscriber_count on fan_subscriptions;
create trigger trg_tier_subscriber_count
after insert or update or delete on fan_subscriptions
for each row execute function update_tier_subscriber_count();

-- ── Content reactions (emoji) ─────────────────────────────────────────────────

create table if not exists content_reactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  content_id   text not null,
  content_type text not null,
  reaction     text not null,
  created_at   timestamptz default now(),
  unique(user_id, content_id, content_type, reaction)
);

create index if not exists idx_content_reactions_content on content_reactions(content_id, content_type);
create index if not exists idx_content_reactions_user    on content_reactions(user_id);

alter table content_reactions enable row level security;
create policy if not exists "content_reactions_public_read"
  on content_reactions for select using (true);
create policy if not exists "content_reactions_owner_write"
  on content_reactions for insert with check (user_id = auth.uid());
create policy if not exists "content_reactions_owner_delete"
  on content_reactions for delete using (user_id = auth.uid());

-- ── Web push subscriptions ────────────────────────────────────────────────────

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_push_subs_user     on push_subscriptions(user_id);
create index if not exists idx_push_subs_endpoint on push_subscriptions(endpoint);

alter table push_subscriptions enable row level security;
create policy if not exists "push_subs_owner"
  on push_subscriptions for all using (user_id = auth.uid());

-- ── Stream analytics events ───────────────────────────────────────────────────

create table if not exists stream_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  track_id     uuid references tracks(id) on delete cascade,
  platform     text,
  country      text,
  skipped      boolean default false,
  skip_at_pct  integer,                   -- 0–100 percentage when skipped
  duration_pct integer,                   -- how far they listened (0–100)
  revenue_cents integer default 0,
  played_at    timestamptz default now()
);

create index if not exists idx_stream_events_track   on stream_events(track_id);
create index if not exists idx_stream_events_user    on stream_events(user_id);
create index if not exists idx_stream_events_played  on stream_events(played_at desc);
create index if not exists idx_stream_events_platform on stream_events(platform);

alter table stream_events enable row level security;
create policy if not exists "stream_events_insert_any"
  on stream_events for insert with check (true);
create policy if not exists "stream_events_owner_read"
  on stream_events for select using (user_id = auth.uid());

-- ── Stream geography aggregates ───────────────────────────────────────────────

create table if not exists stream_geo (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  country    text not null,
  streams    integer not null default 0,
  period     text default 'all_time',     -- 'all_time' | '30d' | '7d'
  updated_at timestamptz default now(),
  unique(user_id, country, period)
);

create index if not exists idx_stream_geo_user on stream_geo(user_id);

alter table stream_geo enable row level security;
create policy if not exists "stream_geo_owner_read"
  on stream_geo for select using (user_id = auth.uid());

-- ── Track likes ───────────────────────────────────────────────────────────────

create table if not exists track_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  track_id   uuid not null references tracks(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, track_id)
);

create index if not exists idx_track_likes_track on track_likes(track_id);
create index if not exists idx_track_likes_user  on track_likes(user_id);

alter table track_likes enable row level security;
create policy if not exists "track_likes_public_read"
  on track_likes for select using (true);
create policy if not exists "track_likes_owner_write"
  on track_likes for insert with check (user_id = auth.uid());
create policy if not exists "track_likes_owner_delete"
  on track_likes for delete using (user_id = auth.uid());

-- ── Content moderation reports ────────────────────────────────────────────────

create table if not exists content_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid references auth.users(id) on delete set null,
  reporter_email   text,
  reported_user_id uuid references auth.users(id) on delete set null,
  content_id       text,
  content_type     text,                   -- 'track' | 'book' | 'video' | 'comment' | 'profile'
  content_title    text,
  url              text,
  reason           text not null,          -- 'spam' | 'copyright' | 'hate' | 'explicit' | 'other'
  description      text,
  status           text default 'pending', -- 'pending' | 'reviewed' | 'dismissed' | 'removed'
  type             text,                   -- 'dmca' | 'abuse' | 'spam'
  dmca_notice      text,
  notes            text,
  created_at       timestamptz default now(),
  resolved_at      timestamptz
);

create index if not exists idx_content_reports_status  on content_reports(status);
create index if not exists idx_content_reports_created on content_reports(created_at desc);

alter table content_reports enable row level security;
create policy if not exists "content_reports_insert_any"
  on content_reports for insert with check (true);
create policy if not exists "content_reports_reporter_read"
  on content_reports for select using (reporter_id = auth.uid());

-- ── M-Pesa transactions ───────────────────────────────────────────────────────

create table if not exists mpesa_transactions (
  id                   uuid primary key default gen_random_uuid(),
  checkout_request_id  text not null unique,
  merchant_request_id  text,
  order_id             uuid references ecom_orders(id) on delete set null,
  phone                text,
  amount               numeric(10,2),
  mpesa_ref            text,
  result_code          text,
  result_desc          text,
  status               text default 'pending', -- 'pending' | 'success' | 'failed'
  raw_payload          jsonb,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_mpesa_tx_checkout on mpesa_transactions(checkout_request_id);
create index if not exists idx_mpesa_tx_order    on mpesa_transactions(order_id);

alter table mpesa_transactions enable row level security;
create policy if not exists "mpesa_tx_service_role_only"
  on mpesa_transactions for all using (false); -- only accessible via service role

-- ── Social OAuth accounts ─────────────────────────────────────────────────────

create table if not exists social_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  platform      text not null,             -- 'youtube' | 'instagram' | 'twitter' | 'facebook'
  platform_uid  text,
  username      text,
  access_token  text not null,
  refresh_token text,
  token_expiry  timestamptz,
  scopes        text[],
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, platform)
);

create index if not exists idx_social_accounts_user on social_accounts(user_id);

alter table social_accounts enable row level security;
create policy if not exists "social_accounts_owner"
  on social_accounts for all using (user_id = auth.uid());

-- ── Creator wallet balances (materialised summary) ───────────────────────────

create table if not exists creator_balances (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  available_cents     integer not null default 0,
  pending_cents       integer not null default 0,
  subscriptions_cents integer not null default 0,
  distributions_cents integer not null default 0,
  tips_cents          integer not null default 0,
  competitions_cents  integer not null default 0,
  lifetime_cents      integer not null default 0,
  updated_at          timestamptz default now()
);

alter table creator_balances enable row level security;
create policy if not exists "creator_balances_owner"
  on creator_balances for all using (user_id = auth.uid());

-- ── Pre-saves ─────────────────────────────────────────────────────────────────

create table if not exists presaves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  release_id uuid,
  platform   text default 'spotify',
  created_at timestamptz default now(),
  unique(user_id, release_id)
);

create table if not exists presave_emails (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  release_id uuid,
  created_at timestamptz default now(),
  unique(email, release_id)
);

create index if not exists idx_presaves_release on presaves(release_id);
create index if not exists idx_presave_emails_release on presave_emails(release_id);

alter table presaves enable row level security;
create policy if not exists "presaves_owner"
  on presaves for all using (user_id = auth.uid());

-- ── Add missing columns to existing tables (safe, idempotent) ────────────────

-- ecom_products: vendor_id alias (some queries use vendor_id, others creator_id)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='ecom_products' and column_name='vendor_id') then
    alter table ecom_products add column vendor_id uuid references auth.users(id) on delete cascade;
  end if;
end $$;

-- distribution_releases: columns used by UploadAlbumPage
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='distribution_releases' and column_name='title') then
    alter table distribution_releases add column title text;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='distribution_releases' and column_name='artist_name') then
    alter table distribution_releases add column artist_name text;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='distribution_releases' and column_name='cover_url') then
    alter table distribution_releases add column cover_url text;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='distribution_releases' and column_name='description') then
    alter table distribution_releases add column description text;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='distribution_releases' and column_name='release_type') then
    alter table distribution_releases add column release_type text default 'single';
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='distribution_releases' and column_name='label') then
    alter table distribution_releases add column label text;
  end if;
end $$;

-- profiles: banned column for admin moderation
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='banned') then
    alter table profiles add column banned boolean default false;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='suspended') then
    alter table profiles add column suspended boolean default false;
  end if;
end $$;

-- creator_earnings: columns used by WalletView withdraw form
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='creator_earnings' and column_name='amount_cents') then
    alter table creator_earnings add column amount_cents integer;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='creator_earnings' and column_name='description') then
    alter table creator_earnings add column description text;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='creator_earnings' and column_name='method') then
    alter table creator_earnings add column method text;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='creator_earnings' and column_name='phone') then
    alter table creator_earnings add column phone text;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='creator_earnings' and column_name='status') then
    alter table creator_earnings add column status text default 'completed';
  end if;
end $$;

-- tracks: columns used by UploadMusicPage / UploadAlbumPage
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='tracks' and column_name='track_number') then
    alter table tracks add column track_number integer;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='tracks' and column_name='release_id') then
    alter table tracks add column release_id uuid;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='tracks' and column_name='bpm') then
    alter table tracks add column bpm integer;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='tracks' and column_name='lyrics') then
    alter table tracks add column lyrics text;
  end if;
end $$;

-- ── Realtime: enable for tables that use live subscriptions ───────────────────

alter publication supabase_realtime add table user_notifications;
alter publication supabase_realtime add table content_reactions;
alter publication supabase_realtime add table competition_entries_v2;
