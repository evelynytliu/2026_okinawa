-- 1. Create the notes table
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text,
  img_url text
);

-- 2. Enable Row Level Security (RLS)
alter table public.notes enable row level security;

-- 3. Create a policy that allows all operations for everyone (Public)
-- Adjust this if you want stricter security
create policy "Enable all operations for all users"
on public.notes
for all
using (true)
with check (true);

-- 4. (Optional) Ensure 'images' bucket exists for image uploads
-- Run this if you haven't set up the storage bucket yet
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- 5. Set up storage policies for 'images' bucket
create policy "Images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'images' );

create policy "Anyone can upload images"
on storage.objects for insert
with check ( bucket_id = 'images' );
