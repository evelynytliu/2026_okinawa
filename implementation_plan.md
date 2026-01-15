# Okinawa 2026 Trip App - Implementation Plan

## 1. Project Overview
A design-first, mobile-friendly web application for the Okinawa 2026 trip group (16 people).
**Goal**: Visualize itinerary progress, track expenses by family unit, and provide quick access to trip details.
**Aesthetic**: "Okinawa Literary" (日式文青風) - High quality, intuitive, logical.

## 2. Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Vanilla CSS (CSS Modules) for maximum control.
- **Data Persistence**:
  - **Supabase**: Real-time database for shared Itinerary and Expenses.
  - **Edit Mode**: A toggle to prevent accidental edits (Admin/Edit mode).
- **Icons**: `lucide-react`.

## 3. Data Structure (Based on Notion)
- **Members**: Grouped by Family (Ting, Lin, Lei, Individuals).
- **Itinerary**: Daily breakdown with locations and activities.
- **Expenses**:
  - Categories: Accommodation, Transport, Food, Activities, Shopping.
  - Shared cost splitting logic (by head, by family, or custom).

## 4. Implementation Steps

### Step 1: Foundation & Design System (Completed)
- [x] Initialize Next.js App.
- [x] Install `lucide-react`.
- [x] Define Design Tokens in `globals.css`.
- [x] Create `data.js` with extracted Notion content.

### Step 2: Core Components (Completed)
- [x] `Navbar`: Bottom navigation.
- [x] `Dashboard`: Countdowns and Budget.
- [x] `ExpenseModal`: Add form created at `/expenses/add`.

### Step 3: Itinerary View (Completed)
- [x] Timeline visualization.
- [x] Edit Mode toggle available.

### Step 4: Expense Management (Advanced)
- [x] Detailed list view.
- [x] Summary by family/person.
- [ ] **Advanced Features**:
    - [ ] Import current expenses from Notion (with specific Payer & Note).
    - [ ] "Debt Matrix": Calculate who paid whom and settlement status.
    - [ ] "Split By": Ability to specify who the expense is for (Beneficiaries).

### Step 5: Enhanced Itinerary & Accommodation
- [ ] **Address & Maps**:
    - [ ] Store `address`, `google_map_url`, `note` in Itinerary.
    - [ ] Add "Copy Address" and "Open Map" buttons.
- [ ] **Accommodation Section**:
    - [ ] Display Room Allocation (Who sleeps where).

### Step 6: Supabase Integration (Real)
- [ ] Switch `data.js` to use the fully enriched Notion data.
- [ ] Update `handleResetData` to seed `expenses` table too.
- [ ] Connect all read/write operations to Supabase.
## 5. Supabase Integration (Future)
## 5. Supabase Integration
- Refer to `supabase_setup.md` for database creation and table schemas.
- Once `.env.local` is populated, the `supabase.js` client will be active.
- Need to switch `data.js` mocks to real `supabase.from('...').select()` calls in `useEffect`.
