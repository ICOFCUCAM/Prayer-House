-- 028_ecom_orders_policies.sql
-- Add admin read/write policy for ecom_orders and ecom_order_items.
-- The existing policies only allow buyers to read their own orders.
-- Admins need to read all orders for the revenue stats query and for
-- order management / refund processing.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'ecom_orders'
      and policyname = 'ecom_orders_admin_all'
  ) then
    execute $p$
      create policy "ecom_orders_admin_all"
        on ecom_orders for all
        using (
          (select raw_user_meta_data->>'role'
           from auth.users where id = auth.uid()) = 'admin'
        )
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'ecom_order_items'
      and policyname = 'ecom_order_items_admin_all'
  ) then
    execute $p$
      create policy "ecom_order_items_admin_all"
        on ecom_order_items for all
        using (
          (select raw_user_meta_data->>'role'
           from auth.users where id = auth.uid()) = 'admin'
        )
    $p$;
  end if;
end $$;
