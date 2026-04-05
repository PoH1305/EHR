import { supabase } from './supabase'

/**
 * Uploads a file to Supabase Storage under a patient-specific path.
 * IMPORTANT: patientId MUST be the Supabase Auth UID (UUID), not the Health ID.
 */
export async function uploadMedicalFile(
  patientId: string, // Standardized to Auth UID
  fileId: string,
  file: Blob | File,
  uploaderId?: string // Optional: Supabase Auth UID of the uploader (Doctor)
): Promise<{ publicUrl: string; storagePath: string }> {
  // NEW ARCHITECTURE:
  // Patient-only: {patientId}/{fileId}
  // Doctor-for-patient: {doctorId}/for-patient/{patientId}/{fileId}
  const filePath = uploaderId 
    ? `${uploaderId}/for-patient/${patientId}/${fileId}`
    : `${patientId}/${fileId}`
  
  const { data, error: uploadError } = await supabase.storage
    .from(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'Patient-Files')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'Patient-Files')
    .getPublicUrl(filePath)
  
  return { publicUrl, storagePath: filePath }
}

/**
 * Helper to convert a local blob URL back to a Blob for upload.
 */
export async function blobUrlToBlob(blobUrl: string): Promise<Blob> {
  const response = await fetch(blobUrl)
  return await response.blob()
}
