-- Add 'img_urls' column to flight_info table if it handles multiple images
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='flight_info' and column_name='img_urls') then
    alter table public.flight_info add column img_urls text[];
  end if;
end
$$;

-- Sync legacy img_url to new img_urls
update public.flight_info 
set img_urls = array[img_url] 
where img_url is not null and (img_urls is null or array_length(img_urls, 1) = 0);
