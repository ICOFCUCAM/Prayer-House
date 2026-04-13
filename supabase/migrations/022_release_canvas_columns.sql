-- Migration 022: Add canvas / video fields to distribution_releases
-- Supports the canvas generation pipeline and Spotify Canvas delivery.

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'distribution_releases' and column_name = 'video_url'
  ) then
    alter table distribution_releases add column video_url text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'distribution_releases' and column_name = 'canvas_ready'
  ) then
    alter table distribution_releases add column canvas_ready boolean not null default false;
  end if;
end $$;

comment on column distribution_releases.video_url    is 'Optional short video clip used to generate Spotify Canvas / Apple Motion artwork';
comment on column distribution_releases.canvas_ready is 'True once canvas assets have been generated and stored in distribution_canvas_assets';
