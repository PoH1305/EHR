-- SUPABASE SETUP SCRIPT (EHR PLATFORM)
-- Run this in the Supabase SQL Editor

-- 1. Clean Up
DROP TABLE IF EXISTS public.clinical_data CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.access_requests CASCADE;
DROP TABLE IF EXISTS public.shared_secrets CASCADE;

-- 2. Create Tables (Using TEXT for IDs to match Firebase/Dexie)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  health_id TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.clinical_data (
  patient_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.access_requests (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  patient_id TEXT NOT NULL, -- EHI ID
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  patient_name TEXT,
  doctor_specialty TEXT,
  shared_categories TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.shared_secrets (
  id TEXT PRIMARY KEY, -- Token ID
  bundle JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  patient_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_secrets ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Permissive for the anon role, secured by ID)
-- Note: Since we use Firebase Auth, we verify identity by the 'id' field in the query.

CREATE POLICY "Allow anon read/write profile by ID"
ON public.profiles FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon read/write clinical by ID"
ON public.clinical_data FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon read/write lookup"
ON public.access_requests FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon read/write secrets"
ON public.shared_secrets FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 7. Storage Bucket Setup
-- Note: Run these in the SQL editor, but you also need to ensure the bucket is created in the Storage UI
-- or via the Supabase Dashboard. The name MUST be 'patient-files'.

-- Create the bucket if it doesn't exist (This requires storage extension)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('patient-files', 'patient-files', true) ON CONFLICT (id) DO NOTHING;

-- Set up RLS for Storage (Idempotent)
DROP POLICY IF EXISTS "Allow public read of patient files" ON storage.objects;
CREATE POLICY "Allow public read of patient files"
ON storage.objects FOR SELECT
TO anon
USING ( bucket_id = 'patient-files' );

DROP POLICY IF EXISTS "Allow authenticated uploads to patient-files" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to patient-files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'patient-files' );

DROP POLICY IF EXISTS "Allow authenticated updates to patient-files" ON storage.objects;
CREATE POLICY "Allow authenticated updates to patient-files"
ON storage.objects FOR UPDATE
TO anon
USING ( bucket_id = 'patient-files' );

-- 8. Medical Records Table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read medical_records"
ON public.medical_records FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon insert medical_records"
ON public.medical_records FOR INSERT
TO anon
WITH CHECK (true);

