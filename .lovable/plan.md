
# Women's Health Module — Implementation Plan

A new premium module inside Prescribly (not a separate app) covering menstrual cycle tracking, fertility, daily health logging, and a full pregnancy journey — inspired by Flo, Ovia, and The Bump.

## 1. Navigation & Entry Points

- Add a **"Women's Health"** entry in `AppSidebar.tsx` (patient sidebar) and as a tile on `UserDashboard.tsx`.
- New top-level route `/womens-health` with nested sub-routes and a sticky bottom tab bar (mobile-first) for: **Home · Calendar · Insights · Logs · Profile**.
- Pregnancy Mode toggle in profile flips the Home tab from Cycle Dashboard → Pregnancy Dashboard, and adds **Baby Growth** + **Pregnancy Calendar** tabs.

## 2. Pages / Routes

```text
/womens-health                      → Home (Cycle OR Pregnancy dashboard, mode-aware)
/womens-health/calendar             → Monthly cycle calendar
/womens-health/insights             → AI-style analytics dashboard
/womens-health/logs                 → Daily Health Log hub
/womens-health/profile              → Women's profile + settings
/womens-health/log-period           → Period logging form
/womens-health/fertility            → Fertility Tracker
/womens-health/pregnancy/onboarding → LMP / Due-date setup
/womens-health/pregnancy/baby-growth→ Week 1–40 timeline
/womens-health/pregnancy/calendar   → Pregnancy milestones
/womens-health/pregnancy/insights   → Weight, sleep, water charts
```

## 3. Design System Additions

Extend `index.css` + `tailwind.config.ts` with semantic tokens (HSL):
- `--wh-pink` (#FF6FAE), `--wh-pink-soft`, `--wh-blue` (#0066FF Prescribly Blue), `--wh-purple` (ovulation), `--wh-green` (fertile), `--wh-bg` (#F5F7FA).
- Gradient tokens `--gradient-wh-hero` (pink→blue), shadow `--shadow-wh-card`.
- Rounded-2xl cards, soft shadows, Framer Motion fade/scale transitions. Full dark-mode pairing.

## 4. Components (`src/components/womens-health/`)

- `WHLayout.tsx` — header + bottom tab bar
- `CycleRing.tsx` — large circular SVG progress (day X of Y, fertility status)
- `NextPeriodCard.tsx`, `QuickActionsGrid.tsx`, `TodaySummary.tsx`
- `CycleCalendar.tsx` — month view with color-coded day cells, tap-to-log
- `PeriodLogForm.tsx` (flow, pain slider, mood, symptom multi-select)
- `DailyLogSection.tsx` (mood/energy/sleep/weight/water/exercise/notes)
- `FertilityTimeline.tsx`, `ConceptionChart.tsx` (Recharts line)
- `InsightsCharts.tsx` (cycle history bar, symptom frequency, mood line)
- `PregnancyRing.tsx`, `BabySizeCard.tsx`, `BabyDevelopmentCard.tsx`
- `WeekTimeline.tsx` (Week 1–40 scrollable with illustrations)
- `PregnancyHealthLog.tsx`, `MilestoneList.tsx`

## 5. Hooks (`src/hooks/`)

- `useWomensProfile` — load/save women_profile, mode (cycle | pregnancy)
- `useCycle` — current cycle day, predicted next period, fertile window, ovulation (calculated from cycle_records + avg cycle/period length)
- `useFertility` — status (low/medium/high/ovulation), conception % curve
- `usePregnancy` — current week, trimester, days remaining (from LMP or due date)
- `useBabyGrowth` — fetch baby_growth_data for current week
- `useDailyHealthLog` — upsert per date
- `useWHInsights` — aggregations for charts

Cycle/fertility math kept in `src/lib/cycleMath.ts` (pure, unit-testable). Pregnancy math in `src/lib/pregnancyMath.ts`.

## 6. Database (single migration via `supabase--migration`)

New tables in `public`, all strict RLS (owner-only, authenticated), with GRANTs to `authenticated` + `service_role` (no anon):

- `women_profiles` (user_id PK, mode, height_cm, weight_kg, avg_cycle_length, avg_period_length, last_period_start, due_date, lmp_date, notifications_enabled, language)
- `cycle_records` (user_id, cycle_start_date, cycle_end_date, period_length)
- `period_logs` (user_id, log_date, flow, pain_level, mood, symptoms text[])
- `symptom_logs` (user_id, log_date, symptom, severity, notes)
- `fertility_predictions` (user_id, cycle_start_date, ovulation_date, fertile_window_start, fertile_window_end, conception_probability jsonb)
- `pregnancy_profiles` (user_id PK, lmp_date, due_date, current_week, trimester, started_at)
- `pregnancy_logs` (user_id, log_date, weight_kg, water_glasses, sleep_hours, exercise_minutes, symptoms text[], mood, notes)
- `baby_growth_data` (week int PK, size_comparison, length_cm, weight_g, milestones text[], illustration_key) — seeded 1–40, world-readable SELECT to authenticated
- `daily_health_logs` (user_id, log_date, mood, energy, sleep_hours, weight_kg, water_glasses, exercise_minutes, notes) — unique (user_id, log_date)
- `insights_reports` (user_id, period_start, period_end, report_type, payload jsonb, generated_at)

Seed `baby_growth_data` for all 40 weeks in the same migration.

Reuse existing `has_role` for any admin read paths. Add `update_updated_at_column` triggers.

## 7. Animations & UX

- Framer Motion page transitions (fade + 8px slide).
- `CycleRing` and `PregnancyRing` animate stroke-dashoffset on mount.
- Bottom tab bar: animated active indicator (layoutId).
- Skeleton loaders for all data cards.
- Toasts on save via existing `use-toast`.

## 8. Out of Scope (this pass)

- Push reminders for period/ovulation (uses existing wellnessAlarm infra later).
- AI-generated narrative insights (placeholder rule-based insights now; LLM later).
- Sharing pregnancy card image export.

## 9. Acceptance Checklist

- Sidebar + dashboard entry visible to patients.
- All 13 pages routable, mobile-first at 411px, dark mode clean.
- Cycle math correct for a 28-day default and custom lengths.
- Pregnancy week auto-computes from LMP or due date.
- All writes persist to Supabase and survive reload.
- RLS verified: a second user cannot read another's logs.

## Technical Notes

- Charts: Recharts (already in deps).
- Calendar: build lightweight custom grid (no new dep) using `date-fns`.
- Baby illustrations: use emoji + size-comparison food emoji initially; image assets can replace later without schema change (`illustration_key`).
- All colors via HSL semantic tokens; no raw hex in components.
