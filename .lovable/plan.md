# What's Left in Prescribly (Aside from Payment)

After reviewing the entire codebase, here is a comprehensive audit of gaps, incomplete features, and cleanup needed:

---

## ✅ 1. Doctor-Side: Home Visit Request Management — DONE

- Created `/doctor/home-visits` page with full view/accept/reject/in_transit/complete workflow
- Added "Home Visits" link to DoctorSidebar
- Patient notifications on accept/reject

---

## ✅ 2. Admin: Facility Management — DONE

- Created FacilityManagement component with full CRUD (add/edit/delete)
- Added "Facilities" section to AdminSidebar and AdminDashboard
- Search/filter by type, stats display

---

## ✅ 3. Admin: Registration Code Verification Dashboard — DONE

- Created RegistrationCodeVerification component
- Search by code/patient/facility, confirm as used
- Added "Reg. Codes" section to AdminSidebar and AdminDashboard

---

## ✅ 5. Doctor Home Visit Tracking Status — DONE

- Created HomeVisitTracker component showing progress steps (pending → accepted → in_transit → completed)
- Added to patient UserDashboard

---

## ✅ 6. Ratings System — DONE

- Created `doctor_reviews` table with RLS policies
- Created DoctorRatingModal component (1-5 stars + comment)
- Updates doctor's average rating and total_reviews

---

## 7. Doctor Notification for New Appointments Missing Real-time Push

**Status:** Not yet implemented  
**What's needed:** Trigger send-push-notification edge function client-side after booking

---

## ✅ 8. Landing Page "Hospitals Near You" — DONE

- Seeded 10 sample facilities (hospitals, pharmacies, clinics) in Nigeria
- NearbyHospitals carousel should now show data

---

## Priority Recommendation


| Priority | Item                                    | Status |
| -------- | --------------------------------------- | ------ |
| High     | Doctor home visit request management    | ✅ Done |
| High     | Admin facility management (CRUD)        | ✅ Done |
| Medium   | Registration code verification UI       | ✅ Done |
| Medium   | Patient home visit tracking             | ✅ Done |
| Medium   | Seed sample facilities data             | ✅ Done |
| Low      | Doctor rating system                    | ✅ Done |
| Low      | Real-time push for doctor notifications | Pending |
