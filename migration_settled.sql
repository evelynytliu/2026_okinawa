-- Add is_settled column to expenses table
alter table expenses add column is_settled boolean default false;

-- Add updated_at if missing (optional but good practice)
-- alter table expenses add column updated_at timestamp with time zone default timezone('utc'::text, now());
