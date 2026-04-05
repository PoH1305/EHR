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
  reason TEXT,
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
  metadata JSONB DEFAULT '{}',
  UNIQUE(doctor_id, patient_id, record_id, permission_type)
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_access_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Helper Functions (SECURITY DEFINER bypasses RLS to break circular dependencies)

-- Returns the health_id for a given user id (bypasses profiles RLS)
CREATE OR REPLACE FUNCTION get_user_health_id(p_user_id TEXT)
RETURNS TEXT AS $$
  SELECT health_id FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the user_id (Auth UID) for a given health_id (bypasses profiles RLS)
CREATE OR REPLACE FUNCTION get_user_id_by_health_id(p_health_id TEXT)
RETURNS TEXT AS $$
  SELECT id FROM public.profiles WHERE health_id = p_health_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns TRUE if doctor has an approved access request for a patient_id (bypasses access_requests RLS)
-- Handles both Auth UID and Health ID as inputs
DROP FUNCTION IF EXISTS has_approved_access(text,text) CASCADE;
CREATE OR REPLACE FUNCTION public.has_approved_access(p_doctor_id TEXT, p_patient_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- UNIFIED IDENTITY MODEL: 
  -- We strictly use the Supabase Auth UID for all database relationships.
  -- The Health ID (EHI-...) is resolved at the app layer during search.
  RETURN EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE doctor_id = p_doctor_id
    AND patient_id = p_patient_id
    AND status = 'APPROVED'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Policies (Strict row level security — no circular dependencies)

-- PROFILES
DROP POLICY IF EXISTS "Allow anon read/write profile by ID" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert/update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow doctors to read approved patient profiles" ON public.profiles;
-- User can read and write their own profile
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
CREATE POLICY "Allow users to read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "Allow users to insert/update own profile" ON public.profiles;
CREATE POLICY "Allow users to insert/update own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text);

-- Profile Discovery (UNIFIED IDENTITY MODEL)
-- We allow all authenticated users to read profiles for discovery (linking Health ID to UID).
-- Sensitive medical data is kept in clinical_data, not in the profiles table.
DROP POLICY IF EXISTS "Allow profile discovery" ON public.profiles;
CREATE POLICY "Allow profile discovery" ON public.profiles FOR SELECT TO authenticated USING (true);

-- CLINICAL DATA (Standardized on Auth UID)
DROP POLICY IF EXISTS "Allow anon read/write clinical by ID" ON public.clinical_data;
DROP POLICY IF EXISTS "Allow patient to read own clinical data" ON public.clinical_data;
DROP POLICY IF EXISTS "Allow patient to insert own clinical data" ON public.clinical_data;
DROP POLICY IF EXISTS "Allow patient to update own clinical data" ON public.clinical_data;
DROP POLICY IF EXISTS "Allow doctors to read approved clinical data" ON public.clinical_data;
DROP POLICY IF EXISTS "Allow doctors to insert approved clinical data" ON public.clinical_data;
DROP POLICY IF EXISTS "Allow doctors to update approved clinical data" ON public.clinical_data;

-- Patient can read/write own data (patient_id is Auth UID)
DROP POLICY IF EXISTS "Allow patient to read own clinical data" ON public.clinical_data;
CREATE POLICY "Allow patient to read own clinical data" ON public.clinical_data FOR SELECT TO authenticated USING (patient_id = auth.uid()::text);

DROP POLICY IF EXISTS "Allow patient to insert own clinical data" ON public.clinical_data;
CREATE POLICY "Allow patient to insert own clinical data" ON public.clinical_data FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid()::text);

DROP POLICY IF EXISTS "Allow patient to update own clinical data" ON public.clinical_data;
CREATE POLICY "Allow patient to update own clinical data" ON public.clinical_data FOR UPDATE TO authenticated USING (patient_id = auth.uid()::text);

-- Doctors can read/insert/update clinical data if they have approved access
DROP POLICY IF EXISTS "Allow doctors to read approved clinical data" ON public.clinical_data;
CREATE POLICY "Allow doctors to read approved clinical data" ON public.clinical_data FOR SELECT TO authenticated USING (
  has_approved_access(auth.uid()::text, patient_id)
);

DROP POLICY IF EXISTS "Allow doctors to insert approved clinical data" ON public.clinical_data;
CREATE POLICY "Allow doctors to insert approved clinical data" ON public.clinical_data FOR INSERT TO authenticated WITH CHECK (
  has_approved_access(auth.uid()::text, patient_id)
);

DROP POLICY IF EXISTS "Allow doctors to update approved clinical data" ON public.clinical_data;
CREATE POLICY "Allow doctors to update approved clinical data" ON public.clinical_data FOR UPDATE TO authenticated USING (
  has_approved_access(auth.uid()::text, patient_id)
);

-- ACCESS REQUESTS
DROP POLICY IF EXISTS "Allow anon read/write lookup" ON public.access_requests;
DROP POLICY IF EXISTS "Allow doctor read/write own requests" ON public.access_requests;
DROP POLICY IF EXISTS "Allow patient to view and update incoming requests" ON public.access_requests;
-- Doctors can insert their own requests and see their own requests
DROP POLICY IF EXISTS "Allow doctor read/write own requests" ON public.access_requests;
CREATE POLICY "Allow doctor read/write own requests" ON public.access_requests FOR ALL TO authenticated USING (doctor_id = auth.uid()::text) WITH CHECK (doctor_id = auth.uid()::text);

-- Patients can read and update requests targeted at them
DROP POLICY IF EXISTS "Allow patient to view and update incoming requests" ON public.access_requests;
CREATE POLICY "Allow patient to view and update incoming requests" ON public.access_requests FOR ALL TO authenticated USING (
  patient_id = get_user_health_id(auth.uid()::text)
) WITH CHECK (
  patient_id = get_user_health_id(auth.uid()::text)
);

-- SHARED SECRETS
DROP POLICY IF EXISTS "Allow anon read/write secrets" ON public.shared_secrets;
DROP POLICY IF EXISTS "Allow authenticated read/write secrets" ON public.shared_secrets;
DROP POLICY IF EXISTS "Allow authenticated read/write secrets" ON public.shared_secrets;
CREATE POLICY "Allow authenticated read/write secrets" ON public.shared_secrets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RECORD ACCESS PERMISSIONS
DROP POLICY IF EXISTS "Allow anon read/write permissions" ON public.record_access_permissions;
DROP POLICY IF EXISTS "Allow doctors to read permissions" ON public.record_access_permissions;
DROP POLICY IF EXISTS "Allow patients to read/write permissions" ON public.record_access_permissions;
CREATE POLICY "Allow doctors to manage permissions" ON public.record_access_permissions FOR ALL TO authenticated USING (
  doctor_id = auth.uid()::text AND (
    has_approved_access(auth.uid()::text, patient_id)
  )
) WITH CHECK (
  doctor_id = auth.uid()::text AND (
    has_approved_access(auth.uid()::text, patient_id)
  )
);

DROP POLICY IF EXISTS "Allow patients to read/write permissions" ON public.record_access_permissions;
CREATE POLICY "Allow patients to read/write permissions" ON public.record_access_permissions FOR ALL TO authenticated USING (
  patient_id = auth.uid()::text
) WITH CHECK (
  patient_id = auth.uid()::text
);

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.record_access_permissions;

-- 7. Storage Bucket Setup (Standardized on Auth UID)
-- Patients can read their own files. They can also read files in doctor folders if they are the target patient.
-- Storage path structure for doctor files: {doctor_uid}/for-patient/{patient_uid}/{file_id}
DROP POLICY IF EXISTS "Allow patient to read own files" ON storage.objects;
CREATE POLICY "Allow patient to read own files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'Patient-Files' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    has_approved_access(auth.uid()::text, (storage.foldername(name))[1]) OR
    (
      (storage.foldername(name))[2] = 'for-patient' AND
      (storage.foldername(name))[3] = auth.uid()::text
    )
  )
);

-- Patients can only upload to their own folder.
-- Doctors can only upload to their own folder (which includes the /for-patient/ subfolder).
DROP POLICY IF EXISTS "Allow patient to upload own files" ON storage.objects;
CREATE POLICY "Allow patient to upload own files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'Patient-Files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Update policy follows the same ownership rules.
DROP POLICY IF EXISTS "Allow patient to update own files" ON storage.objects;
CREATE POLICY "Allow patient to update own files" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'Patient-Files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

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

DROP POLICY IF EXISTS "Allow anon read medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Allow authenticated read own medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Allow authenticated insert own medical_records" ON public.medical_records;
CREATE POLICY "Allow authenticated read own medical_records" ON public.medical_records FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Allow authenticated insert own medical_records" ON public.medical_records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Allow anon delete medical_records" ON public.medical_records;
-- DELETION IS STRICTLY PROHIBITED ON THE AUDIT LOG

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    UPDATE public.record_access_permissions
    SET is_revoked = TRUE
    WHERE id = v_perm_id;
    v_has_access := FALSE;
  ELSE
    v_has_access := TRUE;
  END IF;

  -- 3. Log the access attempt (Immutable Audit)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Auto-Revoke on Expiry Helper
CREATE OR REPLACE FUNCTION revoke_expired_permissions()
RETURNS VOID AS $$
BEGIN
  UPDATE public.record_access_permissions
  SET is_revoked = TRUE
  WHERE expires_at <= NOW() AND is_revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
