-- Add 'group_id' column to flight_info table for per-group organization
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='flight_info' and column_name='group_id') then
    alter table public.flight_info add column group_id text;
  end if;
end
$$;

-- The group_id values will match the analysis group IDs:
-- 'ting_family' for 婷家
-- 'lin_family' for 琳家
-- 'lei_family' for 蕾家
-- 'g_mei', 'g_hui', 'g_yan', 'g_peng' for individuals
