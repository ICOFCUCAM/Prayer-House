-- 026_fix_competition_votes_fk.sql
-- competition_votes.entry_id currently has a FK to competition_entries (v1).
-- The app now uses competition_entries_v2, so votes for v2 entries fail the
-- FK check. Drop the FK constraint so entry_id works for both tables.
-- The unique constraints on (entry_id, session_id) and (entry_id, user_id)
-- still prevent duplicate votes; we don't need the FK for data integrity here.

do $$ begin
  -- Find and drop the FK constraint by name (it varies by migration tool)
  if exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    where tc.table_name       = 'competition_votes'
      and tc.constraint_type  = 'FOREIGN KEY'
      and kcu.column_name     = 'entry_id'
  ) then
    execute (
      select 'alter table competition_votes drop constraint ' || tc.constraint_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
      where tc.table_name      = 'competition_votes'
        and tc.constraint_type = 'FOREIGN KEY'
        and kcu.column_name    = 'entry_id'
      limit 1
    );
  end if;
end $$;
