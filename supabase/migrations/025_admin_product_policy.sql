-- 025_admin_product_policy.sql
-- Add admin RLS policy for ecom_products (content moderation)
-- and creator_earnings (withdrawal approval).
-- All statements are idempotent.

-- ── ecom_products: admin can update any product ────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'ecom_products'
      and policyname = 'ecom_products_admin_all'
  ) then
    execute $p$
      create policy "ecom_products_admin_all"
        on ecom_products for all
        using (
          (select raw_user_meta_data->>'role'
           from auth.users where id = auth.uid()) = 'admin'
        )
    $p$;
  end if;
end $$;

-- ── creator_earnings: admin can update withdrawal status ───────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'creator_earnings'
      and policyname = 'creator_earnings_admin_all'
  ) then
    execute $p$
      create policy "creator_earnings_admin_all"
        on creator_earnings for all
        using (
          (select raw_user_meta_data->>'role'
           from auth.users where id = auth.uid()) = 'admin'
        )
    $p$;
  end if;
end $$;
