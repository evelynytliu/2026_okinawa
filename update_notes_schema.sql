-- 1. Create table if not exists (with multi-image support)
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text,
  img_url text, -- legacy column
  img_urls text[] -- new array column
);

-- 2. Add 'img_urls' column if 'notes' table existed but didn't have it
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='notes' and column_name='img_urls') then
    alter table public.notes add column img_urls text[];
  end if;
end
$$;

-- 3. Enable Row Level Security (RLS)
alter table public.notes enable row level security;

-- 4. Create a policy that allows all operations for everyone (Public)
drop policy if exists "Enable all operations for all users" on public.notes;
create policy "Enable all operations for all users"
on public.notes
for all
using (true)
with check (true);

-- 5. Helper to sync old img_url to new img_urls (optional)
update public.notes 
set img_urls = array[img_url] 
where img_url is not null and (img_urls is null or array_length(img_urls, 1) = 0);
