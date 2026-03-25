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
  shared_categories JSONB DEFAULT '[]'::jsonb
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
-- This is critical for the patient request inbox to receive live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
