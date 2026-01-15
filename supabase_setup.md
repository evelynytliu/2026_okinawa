# Supabase Setup for Okinawa 2026 App

Since you need real-time syncing for all 16 members to see updates (itinerary changes, new expenses), we will use Supabase as the backend.

## Step 1: Create Supabase Project
1.  Go to [supabase.com](https://supabase.com) and create a new project.
2.  Name it `okinawa-2026` (or similar).
3.  Set a database password and save it.
4.  Wait for the database to provision.

## Step 2: Get Credentials
1.  Go to **Project Settings** -> **API**.
2.  Copy the `Project URL` and `anon public key`.
3.  Create a file named `.env.local` in your project root `d:\Projects\2026_okinawa`.
4.  Add the content:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    ```

## Step 3: Create Tables (SQL Editor)
Go to the **SQL Editor** in Supabase sidebar and run the following script to set up the database structure.

```sql
-- 1. LOCATIONS (Master Data)
-- Stores the details of each spot. Edit here to update images/addresses globally.
create table locations (
  id text primary key, -- e.g. 'naha_airport'
  name text not null,
  address text,
  img_url text,
  details text
);

-- 2. ITINERARY DAYS (Schedule Headers)
-- Stores the title and date for each day.
create table itinerary_days (
  day_number int primary key,
  date_display text,
  title text
);

-- 3. ITINERARY ITEMS (The Schedule)
-- Links a day to a location with specific notes/ordering.
create table itinerary_items (
  id uuid default gen_random_uuid() primary key,
  day_number int references itinerary_days(day_number),
  location_id text references locations(id),
  sort_order int,
  note text -- Specific note for this visit (e.g. "Arrive at 10:00")
);

-- 2. EXPENSES TABLE
-- Stores consumption/spending details.
create table expenses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  amount numeric not null,
  currency text default 'TWD',
  category text, -- 'transport', 'food', etc.
  payer_id text, -- 'ting_family', 'lin_family', etc. (from our defined IDs)
  beneficiaries jsonb, -- Array of IDs who this expense is for
  date timestamp with time zone default timezone('utc'::text, now()),
  note text
);

-- 3. SETTINGS / APP STATE
-- Store global trip details if we want them editable (Budget total, dates).
create table app_settings (
  key text primary key,
  value jsonb
);

-- 4. ENABLE REALTIME
-- This allows the app to update instantly when someone changes something.
alter publication supabase_realtime add table itinerary;
alter publication supabase_realtime add table expenses;

-- 5. INITIAL SEED DATA (Optional - can be added via app later, but good to start)
-- You can run the inserts based on your Notion data if you wish, or we can build an "Import" button in the app.
```

## Step 4: Disable RLS (Temporarily for Simplicity)
Since this is a private family app and we want everyone to easily edit without complex login flows initially, we can disable Row Level Security (RLS) or create a policy that allows public access (if you prefer no login).
*   **Option A (Easiest)**: Go to **Table Editor** -> Is hover over each table -> "Edit Table" -> Uncheck "Enable Row Level Security" (Ignore warnings for now).
*   **Option B (Better)**: Keep RLS enabled and run this SQL:
    ```sql
    create policy "Enable access for all users" on itinerary for all using (true);
    create policy "Enable access for all users" on expenses for all using (true);
    create policy "Enable access for all users" on app_settings for all using (true);
    ```

Once you have done this, please let me know, and I will proceed with connecting the app!
