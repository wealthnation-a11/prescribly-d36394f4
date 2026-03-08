

# Prescribly App Review

## Overall Impression

Prescribly is a comprehensive telehealth platform with an impressive scope. It covers patients, doctors, hospitals/facilities, herbal practitioners, and admin -- all with dedicated dashboards, role-based access, and a subscription model. The architecture is solid: React + Supabase with proper auth, RLS, edge functions, and role separation via `user_roles` table with a `has_role()` security definer function.

Here is my honest assessment across key areas:

---

## What is Working Well

- **Role-based architecture** is properly implemented with a separate `user_roles` table and `has_role()` RPC function -- this follows security best practices
- **Subscription guard** correctly gates patient features and exempts admins, doctors, and legacy users
- **Landing page** is well-structured with clear sections: hero, features, pricing, testimonials, certifications, FAQ, and footer -- all mobile-responsive
- **Multi-portal design** (patient, doctor, herbal practitioner, facility, admin) with dedicated sidebars and layouts
- **i18n support** with 6 languages
- **PWA + Capacitor** setup for mobile deployment
- **Lazy loading** on all pages except the landing page -- good for performance
- **Edge functions** for sensitive operations (AI diagnosis, payments, prescriptions)

---

## Security Issues (Critical)

The security scan found **2 errors and 8 warnings**:

1. **Email exposure** -- `blog_comments` table exposes `author_email` to unauthenticated users via an overly permissive RLS policy
2. **Medical record forgery** -- Any authenticated user (including patients) can insert fake `doctor_overrides` records attributed to any doctor. This is a serious medical data integrity issue
3. **Unprotected call logs** -- `patient_call_logs` table may lack RLS entirely
4. **Practitioner PII exposure** -- `herbal_practitioners` table exposes email, phone, and license numbers to all authenticated users
5. **Emergency flag abuse** -- Any user can create emergency flags for arbitrary diagnosis sessions
6. **AI audit log pollution** -- Any user can insert fake confidence logs
7. **Leaked password protection disabled** -- Should be enabled in Supabase auth settings
8. **Postgres version** needs security patches

---

## Code Quality Observations

- **AuthContext** fetches profile from `profiles` table but role checks use `user_roles` table via RPC -- this dual approach works but the `userProfile.role` field on the profile could become stale or inconsistent with the `user_roles` table
- **Login page** makes multiple `supabase.auth.getUser()` calls in sequence (lines 72, 80) instead of reusing the result -- minor inefficiency
- **LandingPage** is ~900 lines -- could benefit from splitting into smaller section components
- **Yearly pricing tab** uses `md:grid-cols-3` without the `sm:` breakpoint used in the monthly tab -- slight inconsistency in responsive behavior

---

## UX/Design Notes

- The "Nearby Hospitals" section shows "No hospitals found nearby" with a location-off icon, which could feel empty for new visitors -- consider showing featured hospitals as a fallback
- The "Our Promise" and "Testimonials" sections both use `bg-secondary/30`, creating a visual merge -- they look like one continuous section
- Footer social links (LinkedIn, Instagram, Twitter) appear to be placeholder `#` links
- The FAQ section and lower landing page sections (Contact, CTA, Footer) are not mobile-responsive like the upper sections -- they use fixed `text-4xl` and `py-20` without responsive variants

---

## Recommendations (Priority Order)

1. **Fix the 2 critical security errors** -- blog comment email exposure and doctor override forgery
2. **Enable leaked password protection** in Supabase auth settings
3. **Add RLS to `patient_call_logs`** table
4. **Tighten RLS** on `emergency_flags`, `ai_confidence_logs`, and `herbal_practitioners`
5. **Make lower landing page sections responsive** (FAQ, Contact, CTA, Footer use hardcoded sizes)
6. **Split LandingPage.tsx** into smaller components for maintainability
7. **Add fallback content** for the "Nearby Hospitals" section when no hospitals are found
8. **Deduplicate the `getUser()` calls** in the login flow

---

## Summary

The app is feature-rich and well-architected for a health-tech platform. The biggest concern is the security vulnerabilities -- particularly the ability for any authenticated user to forge medical records and the exposure of personal data. These should be addressed before any production launch. The frontend code quality is good, with proper use of lazy loading, role guards, and responsive design in most sections.

