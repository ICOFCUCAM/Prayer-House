-- 027_profiles_policies.sql
-- Fix profiles RLS policies:
-- 1. Add public read policy so profile cards, FeaturedCreators, etc. can
--    display other users' public profile info.
-- 2. Add admin policy so admins can suspend/unsuspend any user.
-- All statements are idempotent.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_public_read'
  ) then
    execute $p$
      create policy "profiles_public_read"
        on profiles for select
        using (true)
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_admin_all'
  ) then
    execute $p$
      create policy "profiles_admin_all"
        on profiles for all
        using (
          (select raw_user_meta_data->>'role'
           from auth.users where id = auth.uid()) = 'admin'
        )
    $p$;
  end if;
end $$;
