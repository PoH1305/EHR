import { supabase } from './supabase'

/**
 * Uploads a file to Supabase Storage under a patient-specific path.
 * IMPORTANT: patientId MUST be the Supabase Auth UID (UUID), not the Health ID.
 */
export async function uploadMedicalFile(
  patientId: string, // Standardized to Auth UID
  fileId: string,
  file: Blob | File
): Promise<{ publicUrl: string; storagePath: string }> {
  const filePath = `${patientId}/${fileId}`
  
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
