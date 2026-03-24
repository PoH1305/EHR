import { storage_db } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

/**
 * Uploads a file (Blob or File) to Firebase Storage under a patient-specific path.
 * Returns the public download URL.
 */
export async function uploadMedicalFile(
  patientId: string,
  fileId: string,
  file: Blob | File
): Promise<string> {
  if (!storage_db) throw new Error('Firebase Storage not initialized')

  const storageRef = ref(storage_db, `patients/${patientId}/files/${fileId}`)
  const snapshot = await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(snapshot.ref)
  
  return downloadURL
}

/**
 * Helper to convert a local blob URL back to a Blob for upload.
 */
export async function blobUrlToBlob(blobUrl: string): Promise<Blob> {
  const response = await fetch(blobUrl)
  return await response.blob()
}
