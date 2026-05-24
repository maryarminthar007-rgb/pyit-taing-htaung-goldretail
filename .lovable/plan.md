## Scope

Add authentication with 3 roles, goldsmith availability status, and a gemstone ledger to the existing Pyit Taing Htaung Gold Retail app.

## 1. Authentication & Roles

- Enable Email/Password + Google sign-in via Lovable Cloud.
- Add `profiles` table (auto-created on signup via trigger) and `user_roles` table with enum `app_role` = `super_admin | limited_admin | viewer`.
- Security-definer function `public.has_role(_user_id, _role)` for RLS.
- Tighten existing RLS on `goldsmiths`, `books`, `orders`, `products` (currently `public all`):
  - SELECT: any authenticated user.
  - INSERT/UPDATE: `super_admin` or `limited_admin`.
  - DELETE: `super_admin` only.
- Routes: `/login`, `/signup`. Wrap all data routes under `_authenticated` layout with `beforeLoad` redirect.
- First user to sign up is auto-promoted to `super_admin` (via trigger when `user_roles` is empty).
- Add `/admin/users` page (super_admin only) to assign/change roles.
- UI gating: hide Edit/Delete/Add buttons for viewers; hide Delete for limited_admin.

## 2. Goldsmith Work Status

- Add `work_status` column to `goldsmiths` (enum: `available | busy`), default `available`.
- Auto-derive on the dashboard (badge = `busy` when any order in any book has positive outstanding `due_gold`), but also allow manual override via a toggle on the profile.
- Show colored badge on goldsmith list, profile header, and dashboard summary cards.

## 3. Gemstone Ledger

- New table `gemstones`:
  - `id`, `created_at`, `entry_date`, `order_id` (nullable FK to orders), `job_reference` (text fallback),
  - `gemstone_name`, `gemstone_type`,
  - `weight`, `weight_unit` (enum: `carat | rati | gram`),
  - `quantity`, `unit_cost`, `setting_fee`, `total_cost` (generated/computed),
  - `supplier`, `notes`.
- New route `/gemstones` with table: filters by date range, order ref, gemstone name; running totals at bottom.
- Add "Gemstones" link to sidebar.
- On order detail page, show linked gemstones and an "Add gemstone" button that prefills order reference.

## 4. UI / Navigation

- Sidebar updates: add Gemstones, Users (super_admin only), Sign out.
- Dashboard adds: "Available goldsmiths" and "Busy goldsmiths" stat cards, plus total gemstone cost MTD.
- Responsive polish for tablet (sidebar collapsible at <1024px).

## Technical notes

- Migration creates: enum `app_role`, enum `gemstone_weight_unit`, enum `goldsmith_work_status`, `profiles`, `user_roles`, `gemstones`; trigger `handle_new_user` for profile creation + first-user-as-admin; `has_role` function; tightened RLS policies on all tables.
- Server functions (`createServerFn` + `requireSupabaseAuth`) for mutations; reads via the browser supabase client (RLS scoped).
- `attachSupabaseAuth` confirmed in `src/start.ts`.
- Google OAuth enabled via `supabase--configure_social_auth`.

Confirm and I'll implement.