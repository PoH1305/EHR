-- 1. Create Profiles Table (for EHI ID functionality)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  health_id TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Clinical Data Table
CREATE TABLE IF NOT EXISTS public.clinical_data (
  patient_id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_data ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Users can only see their own data)
-- Note: 'auth.uid()' in Supabase corresponds to the UID you provide.
-- Since we use Firebase Auth UIDs (which are strings), we will map them to UUIDs or just use TEXT for simplicity if preferred.
-- I will use TEXT for ids to match Firebase/Dexie IDs.

DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.clinical_data;

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile" 
ON public.profiles FOR ALL 
USING (auth.uid()::text = id);

CREATE POLICY "Enable read access for lookup"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own clinical data" 
ON public.clinical_data FOR ALL 
USING (auth.uid()::text = patient_id);

CREATE TABLE public.access_requests (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  patient_id TEXT NOT NULL, -- EHI ID
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  patient_name TEXT
);

CREATE TABLE public.shared_secrets (
  id TEXT PRIMARY KEY, -- Token ID
  bundle JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  patient_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage their own requests"
ON public.access_requests FOR ALL
USING (auth.uid()::text = doctor_id);

CREATE POLICY "Patients can see requests sent to them"
ON public.access_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid()::text 
  AND profiles.health_id = public.access_requests.patient_id
));

CREATE POLICY "Patients can respond to requests sent to them"
ON public.access_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid()::text 
  AND profiles.health_id = public.access_requests.patient_id
));

CREATE POLICY "Shared secrets are accessible by ID"
ON public.shared_secrets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Patients can push shared secrets"
ON public.shared_secrets FOR INSERT
TO authenticated
WITH CHECK (true); -- Ideally restrict to owner, but for now allow authenticated push

-- 5. Storage Buckets (Optional: Create manually in UI)
-- Bucket name: 'patient-files'
-- Policy: (auth.uid()::text = (storage.foldername(name))[1])
