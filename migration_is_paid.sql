-- Add is_paid column to expenses table (default true to assume existing records are paid)
alter table expenses add column is_paid boolean default true;

-- Ensure is_settled is effectively deprecated or we can drop it, but keeping it doesn't hurt. 
-- We will ignore it in the calculations as requested.
