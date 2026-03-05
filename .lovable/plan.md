# What's Left in Prescribly (Aside from Payment)

After reviewing the entire codebase, here is a comprehensive audit of gaps, incomplete features, and cleanup needed:

---

## 1. Doctor-Side: No Home Visit Request Management

**Problem:** Patients can submit home visit requests (`home_visit_requests` table), but doctors have **no UI to view, accept, or reject** these requests. The `MedicalIntakeForm` inserts records, but nothing on the doctor side reads them.

**What's needed:**

- A "Home Visit Requests" section in the Doctor Dashboard or a new page under `/doctor/home-visits`
- Show pending requests with the medical intake form data (symptoms, urgency, address, image)
- Accept/reject buttons that update the request status
- Notification to patient on accept/reject
- Add link in `DoctorSidebar`

---

## 2. Admin: No Facility Management

**Problem:** The `facilities` table exists but there is **no admin UI to add, edit, or delete** hospitals, clinics, and pharmacies. The Facility Visit page and Landing Page carousel will show nothing until facilities are seeded.

**What's needed:**

- Admin dashboard section: "Facility Management" (CRUD for facilities with name, type, address, lat/lng, logo, description, phone)
- Add to `AdminSidebar`
- Optionally seed sample facility data via migration

---

## 3. Admin: No Registration Code Verification Dashboard

**Problem:** Facility visit generates registration codes, but there's **no facility/admin dashboard** to look up and confirm visit codes. The `registration_codes` table has a `status` field but no UI to mark codes as "used."

**What's needed:**

- Admin or facility-facing page to search by code and mark as confirmed
- Show patient info, facility, expiration, and status

---

---

## 5. Doctor Home Visit Tracking Status

**Problem:** The plan specifies showing "tracking status" after a home visit is accepted, but **no tracking UI exists** for patients to see the status progression (pending -> accepted -> in_transit -> completed).

**What's needed:**

- Patient-facing view showing their active home visit requests and current status
- Could be a section on the user dashboard or under `/book-appointment/home-visit`

---

## 6. Ratings System Not Connected

**Problem:** Doctor cards show a `rating` field, but there is **no patient UI to rate a doctor** after a completed consultation. The `doctors` table has `rating` and `total_reviews` columns but no review submission flow.

**What's needed:**

- Post-consultation rating prompt (1-5 stars + optional comment)
- Update `doctors.rating` and `doctors.total_reviews` on submission

---

## 7. Doctor Notification for New Appointments Missing Real-time Push

**Problem:** The `notify_appointment_changes()` trigger inserts into the `notifications` table, but there's no **real-time push notification** (browser/native) sent to the doctor when a new appointment or home visit request arrives.

**What's needed:**

- Trigger the `send-push-notification` edge function from the appointment trigger or call it client-side after booking

---

## 8. Landing Page "Hospitals Near You" Has No Data

**Problem:** The `NearbyHospitals` carousel on the landing page queries the `facilities` table, which is empty. Without seeded data or an admin facility management tool, this section shows nothing.

**What's needed:**

- Seed sample facilities OR build the admin facility CRUD first
- Consider showing a fallback message when no facilities are found

---

## Priority Recommendation


| Priority | Item                                    | Effort |
| -------- | --------------------------------------- | ------ |
| High     | Doctor home visit request management    | Medium |
| High     | Admin facility management (CRUD)        | Medium |
| &nbsp;   | &nbsp;                                  | &nbsp; |
| Medium   | Registration code verification UI       | Low    |
| Medium   | Patient home visit tracking             | Low    |
| Medium   | Seed sample facilities data             | Low    |
| Low      | Doctor rating system                    | Medium |
| Low      | Real-time push for doctor notifications | Low    |


Would you like me to start implementing these? I'd recommend tackling them in priority order, starting with the doctor home visit management and admin facility CRUD.