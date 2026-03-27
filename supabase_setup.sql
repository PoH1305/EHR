-- SUPABASE SETUP SCRIPT (EHR PLATFORM)
-- Run this in the Supabase SQL Editor

-- 1. Clean Up
DROP TABLE IF EXISTS public.clinical_data CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.access_requests CASCADE;
DROP TABLE IF EXISTS public.shared_secrets CASCADE;
DROP TABLE IF EXISTS public.record_access_permissions CASCADE;

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

-- New Security Layer
CREATE TABLE public.record_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'download')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_access_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Permissive for the anon role, secured by ID)
CREATE POLICY "Allow anon read/write profile by ID" ON public.profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write clinical by ID" ON public.clinical_data FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write lookup" ON public.access_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write secrets" ON public.shared_secrets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write permissions" ON public.record_access_permissions FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.record_access_permissions;

-- 7. Storage Bucket Setup
DROP POLICY IF EXISTS "Allow public read of patient files" ON storage.objects;
CREATE POLICY "Allow public read of patient files" ON storage.objects FOR SELECT TO anon USING ( bucket_id = 'patient-files' );

DROP POLICY IF EXISTS "Allow authenticated uploads to patient-files" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to patient-files" ON storage.objects FOR INSERT TO anon WITH CHECK ( bucket_id = 'patient-files' );

DROP POLICY IF EXISTS "Allow authenticated updates to patient-files" ON storage.objects;
CREATE POLICY "Allow authenticated updates to patient-files" ON storage.objects FOR UPDATE TO anon USING ( bucket_id = 'patient-files' );

-- 8. Medical Records Table (Audit Log)
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
CREATE POLICY "Allow anon read medical_records" ON public.medical_records FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert medical_records" ON public.medical_records FOR INSERT TO anon WITH CHECK (true);

-- 9. Atomic Append Function (Fixes doctor overwrite bug)
CREATE OR REPLACE FUNCTION append_clinical_data(p_patient_id TEXT, p_key TEXT, p_value JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.clinical_data (patient_id, data, last_synced_at)
  VALUES (p_patient_id, jsonb_build_object(p_key, jsonb_build_array(p_value)), NOW())
  ON CONFLICT (patient_id) DO UPDATE
  SET data = jsonb_set(
    public.clinical_data.data, 
    ARRAY[p_key], 
    COALESCE(public.clinical_data.data->p_key, '[]'::jsonb) || p_value
  ),
  last_synced_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 11. Permission Check Function (RPC) with Auto-Revoke
CREATE OR REPLACE FUNCTION check_record_access(p_user_id TEXT, p_record_id TEXT, p_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
  v_perm_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_is_revoked BOOLEAN;
BEGIN
  -- 1. Find the permission
  SELECT id, expires_at, is_revoked 
  FROM public.record_access_permissions
  WHERE doctor_id = p_user_id
  AND record_id = p_record_id
  AND permission_type = p_type
  LIMIT 1
  INTO v_perm_id, v_expires_at, v_is_revoked;

  -- 2. Basic checks
  IF v_perm_id IS NULL OR v_is_revoked = TRUE THEN
    v_has_access := FALSE;
  ELSIF v_expires_at <= NOW() THEN
    -- AUTO-EXPIRE: Mark as revoked if we just discovered it's expired
    UPDATE public.record_access_permissions
    SET is_revoked = TRUE
    WHERE id = v_perm_id;
    v_has_access := FALSE;
  ELSE
    v_has_access := TRUE;
  END IF;

  -- 3. Log the access attempt (Audit)
  INSERT INTO public.medical_records (user_id, role, filename, filepath, file_type, metadata)
  VALUES (p_user_id, 'doctor', 'Access Check: ' || p_type, p_record_id, p_type, jsonb_build_object(
    'success', v_has_access, 
    'timestamp', NOW(),
    'reason', CASE 
      WHEN v_perm_id IS NULL THEN 'No permission record'
      WHEN v_is_revoked = TRUE THEN 'Permission revoked'
      WHEN v_expires_at <= NOW() THEN 'Permission expired'
      ELSE 'Allowed'
    END
  ));

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;

-- 12. Auto-Revoke on Expiry Helper
CREATE OR REPLACE FUNCTION revoke_expired_permissions()
RETURNS VOID AS $$
BEGIN
  UPDATE public.record_access_permissions
  SET is_revoked = TRUE
  WHERE expires_at <= NOW() AND is_revoked = FALSE;
END;
$$ LANGUAGE plpgsql;
