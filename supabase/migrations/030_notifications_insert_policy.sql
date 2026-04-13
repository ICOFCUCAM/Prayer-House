-- 030_notifications_insert_policy.sql
-- The user_notif_owner policy uses FOR ALL, which means INSERT also
-- requires user_id = auth.uid(). This blocks:
--   - Admin DMCA/suspension notifications (insert for other users)
--   - Release queue approval/rejection notifications
--   - Pre-save artist notifications
--   - Distribution status notifications
--
-- Fix: add a dedicated INSERT policy that allows any authenticated user
-- to notify any other user (notifications from admins, system, or other users).
-- The owner-read policy already ensures each user can only READ their own.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'user_notifications'
      and policyname = 'user_notif_insert_auth'
  ) then
    execute $p$
      create policy "user_notif_insert_auth"
        on user_notifications for insert
        with check (auth.uid() is not null)
    $p$;
  end if;
end $$;
