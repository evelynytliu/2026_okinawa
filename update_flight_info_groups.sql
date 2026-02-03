-- Change group_id to group_ids (array) for multi-group support
do $$
begin
  -- Add group_ids column if not exists
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='flight_info' and column_name='group_ids') then
    alter table public.flight_info add column group_ids text[];
  end if;
end
$$;

-- Migrate existing group_id data to group_ids array
update public.flight_info 
set group_ids = array[group_id] 
where group_id is not null and (group_ids is null or array_length(group_ids, 1) = 0);
