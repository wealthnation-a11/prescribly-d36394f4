

# Prescribly Booking System Overhaul

This is a large, multi-phase feature set. Here is a structured plan covering database, backend, and frontend changes.

---

## Phase 1: Database Schema (Migration)

Create new tables for hospitals/clinics/pharmacies, home visit requests, and registration codes:

```sql
-- Facilities table (hospitals, clinics, pharmacies)
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'clinic', 'pharmacy')),
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Home visit requests with medical form data
CREATE TABLE public.home_visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symptoms TEXT NOT NULL,
  illness_duration TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'emergency')),
  image_url TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_transit', 'completed', 'cancelled')),
  estimated_arrival TEXT,
  consultation_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Registration codes for clinic/hospital/pharmacy visits
CREATE TABLE public.registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  qr_data TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Add `latitude` and `longitude` columns to the existing `profiles` table and `doctors` table (if not present) via ALTER TABLE.

Create a Postgres function for Haversine distance filtering:

```sql
CREATE OR REPLACE FUNCTION public.nearby_doctors(
  user_lat DOUBLE PRECISION, user_lon DOUBLE PRECISION, radius_miles DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE(doctor_user_id UUID, distance_miles DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT d.user_id, 
    3959 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) 
    * cos(radians(p.longitude) - radians(user_lon)) 
    + sin(radians(user_lat)) * sin(radians(p.latitude))) AS distance_miles
  FROM doctors d
  JOIN profiles p ON d.user_id = p.user_id
  WHERE d.verification_status = 'approved'
    AND d.offers_home_service = true
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  HAVING 3959 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) 
    * cos(radians(p.longitude) - radians(user_lon)) 
    + sin(radians(user_lat)) * sin(radians(p.latitude))) <= radius_miles
  ORDER BY distance_miles;
$$;

CREATE OR REPLACE FUNCTION public.nearby_facilities(
  user_lat DOUBLE PRECISION, user_lon DOUBLE PRECISION, 
  radius_miles DOUBLE PRECISION DEFAULT 25, facility_type TEXT DEFAULT NULL
)
RETURNS TABLE(facility_id UUID, distance_miles DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT f.id,
    3959 * acos(cos(radians(user_lat)) * cos(radians(f.latitude)) 
    * cos(radians(f.longitude) - radians(user_lon)) 
    + sin(radians(user_lat)) * sin(radians(f.latitude))) AS distance_miles
  FROM facilities f
  WHERE f.is_active = true
    AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL
    AND (facility_type IS NULL OR f.type = facility_type)
  HAVING 3959 * acos(cos(radians(user_lat)) * cos(radians(f.latitude)) 
    * cos(radians(f.longitude) - radians(user_lon)) 
    + sin(radians(user_lat)) * sin(radians(f.latitude))) <= radius_miles
  ORDER BY distance_miles;
$$;
```

RLS policies for all new tables (patients see own records, doctors see requests assigned to them, facilities are publicly readable).

---

## Phase 2: Booking Landing Page (3 Options)

Replace the current BookAppointment page content with a **mode selector** screen. When a user navigates to `/book-appointment`, they see 3 large, modern, mobile-friendly cards:

1. **Chat or Call a Doctor** -- icon: MessageCircle/Video, gradient card
2. **Home Visit** -- icon: Home, gradient card  
3. **Clinic / Hospital / Pharmacy Visit** -- icon: Building, gradient card

Clicking each card navigates to a sub-view (using state or nested routes).

### Option 1: Chat or Call a Doctor
- Reuse existing doctor list and booking flow (current "Book New" tab logic)
- Show doctor cards with: Name, Specialty, Rating, Price
- Payment required before consultation
- Chat/audio/video call options after payment
- Doctor notification on booking

### Option 2: Home Visit
- Use browser geolocation to get user lat/lng
- Call `nearby_doctors()` RPC to find doctors within 25 miles
- Show doctor cards with: Name, Specialty, Rating, Home Visit Price, Estimated distance
- On select doctor, show **medical intake form**: Symptoms, Duration, Age, Gender, Urgency, Image upload (optional), Address (auto-filled, editable)
- Submit creates `home_visit_request` record
- Doctor reviews form and accepts/rejects
- On accept: payment processed, booking confirmed, tracking status shown

### Option 3: Clinic / Hospital / Pharmacy Visit
- Use browser geolocation
- Call `nearby_facilities()` RPC with optional type filter
- Show facility cards with filters (Hospital / Clinic / Pharmacy)
- On select facility: generate unique 6-character registration code + QR code data
- Store in `registration_codes` table
- Display code + QR code to user
- User takes code to facility physically

---

## Phase 3: Landing Page -- "Hospitals Near You" Carousel

After the Certification section on the landing page:
- Add a new section titled "Hospitals Near You"
- Auto-detect user location via existing `useGeolocation` hook
- Query `nearby_facilities()` for hospitals
- Horizontal scrollable carousel using `embla-carousel-react` (already installed)
- Each card: Logo, Name, Distance, Short description, "Book Now" button (links to `/book-appointment` with facility pre-selected)

---

## Phase 4: New Files

| File | Purpose |
|------|---------|
| `src/pages/BookingModeSelector.tsx` | The 3-button landing screen |
| `src/pages/booking/ChatWithDoctor.tsx` | Option 1 flow |
| `src/pages/booking/HomeVisit.tsx` | Option 2 flow with medical form |
| `src/pages/booking/FacilityVisit.tsx` | Option 3 flow with code/QR generation |
| `src/components/booking/DoctorCard.tsx` | Reusable doctor card component |
| `src/components/booking/FacilityCard.tsx` | Reusable facility card component |
| `src/components/booking/MedicalIntakeForm.tsx` | Home visit medical form |
| `src/components/booking/RegistrationCodeDisplay.tsx` | QR + code display |
| `src/components/landing/NearbyHospitals.tsx` | Landing page carousel section |
| `src/hooks/useNearbyDoctors.ts` | Hook calling `nearby_doctors()` RPC |
| `src/hooks/useNearbyFacilities.ts` | Hook calling `nearby_facilities()` RPC |

---

## Phase 5: Route Updates

Update `App.tsx`:
- `/book-appointment` renders `BookingModeSelector`
- `/book-appointment/chat` renders `ChatWithDoctor`
- `/book-appointment/home-visit` renders `HomeVisit`
- `/book-appointment/facility` renders `FacilityVisit`

All wrapped in `PatientRoute`.

---

## Technical Notes

- QR codes will be generated client-side using a lightweight library or canvas-based approach
- Registration codes: 6-char alphanumeric, generated via `crypto.randomUUID().slice(0,6).toUpperCase()`
- Browser geolocation API (`navigator.geolocation`) used for lat/lng with fallback to IP-based detection via existing `GeoLocationService`
- Image upload for home visit form uses existing `chat-files` storage bucket
- Existing appointment notification triggers will be extended for home visit requests

This is a substantial feature set. I recommend implementing it in phases, starting with the database schema and the 3-button booking page, then building each option flow incrementally.

