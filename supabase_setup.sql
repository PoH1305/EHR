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

CREATE POLICY "Users can manage their own clinical data" 
ON public.clinical_data FOR ALL 
USING (auth.uid()::text = patient_id);

-- 5. Storage Buckets (Optional: Create manually in UI)
-- Bucket name: 'patient-files'
-- Policy: (auth.uid()::text = (storage.foldername(name))[1])
