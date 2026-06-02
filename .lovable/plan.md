## 1. Women's Health entry screen with 3 options

Currently tapping **Women's Health** drops the user straight into the cycle home (or onboarding). Add a dedicated landing screen at `/womens-health` that shows three premium cards:

1. **Cycle Tracking** → `/womens-health/home`
2. **Pregnancy** → `/womens-health/pregnancy`
3. **Baby Growth** → `/womens-health/baby-growth`

Changes:
- In `src/pages/WomensHealth.tsx`, add a new `WHEntry` component (3 gradient cards, Flower2 / Heart / Baby icons, pink/blue/purple tokens, framer-motion stagger).
- Change the index route from `WHHome` → `WHEntry`.
- Move existing cycle home to `/womens-health/home`.
- Pregnancy and Baby Growth tiles route to existing `/pregnancy` and `/baby-growth` sub-routes already inside the module.
- Add a small "Back to Women's Health" link in `WHLayout` header when not on the entry route.

## 2. Remove "Access Denied" screen after login/register

The `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) and `Dashboard.tsx` show a full "Access Denied / Role Not Assigned" page when the role hasn't synced yet after a fresh signup/login. This is what the user is hitting.

Fix:
- In `ProtectedRoute.tsx`, replace every "Access Denied" / "Role Not Assigned" return with a silent `<Navigate>`:
  - No role yet → keep showing the loading spinner (give role-sync trigger time) instead of an error screen.
  - Wrong role (admin/doctor/patient mismatch) → `<Navigate to="/dashboard" replace />` so the `Dashboard` page routes them to the correct home.
- In `src/pages/Dashboard.tsx`, replace the "Role Not Assigned" screen with the same loading spinner + auto-retry; if still missing after ~2s, fall through to `/user-dashboard` (default patient route).
- Keep the role-sync DB trigger as-is — no backend changes.

## Technical details

- Files touched: `src/pages/WomensHealth.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/Dashboard.tsx`.
- No DB migration, no auth config change.
- No new dependencies.
- Pregnancy mode toggle (the existing `save({ mode: "pregnancy" })` call on the home) is preserved but moved behind the **Pregnancy** entry card.

## Out of scope

- No changes to login/register forms themselves.
- No changes to subscription gating (still applies after the entry screen).
