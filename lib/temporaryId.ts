import { db } from './db'
import type { TemporaryRecord, VitalReading } from './types'

/**
 * Generates a Temporary ID in the format: TEMP-YYYY-NNNN
 * Example: TEMP-2026-0045
 */
export async function generateTemporaryId(): Promise<string> {
  const year = new Date().getFullYear()
  const records = await db.temporary_records
    .where('tempId')
    .startsWith(`TEMP-${year}`)
    .toArray()
  
  const nextNumber = (records.length + 1).toString().padStart(4, '0')
  return `TEMP-${year}-${nextNumber}`
}

/**
 * Creates a new Temporary Record for an unidentified patient.
 */
export async function createTemporaryRecord(data: {
  approximateAge: number | null
  gender: 'male' | 'female' | 'unknown'
  condition: string
  doctorId: string
  notes?: string
}): Promise<TemporaryRecord> {
  const tempId = await generateTemporaryId()
  
  const record: TemporaryRecord = {
    tempId,
    arrivalTime: new Date().toISOString(),
    approximateAge: data.approximateAge,
    gender: data.gender,
    condition: data.condition,
    vitals: [],
    treatmentsGiven: [],
    doctorId: data.doctorId,
    notes: data.notes || '',
    status: 'ACTIVE',
    mergedToPatientId: null,
    mergedAt: null
  }
  
  await db.temporary_records.add(record)
  return record
}

/**
 * Appends vitals or treatments to an active temporary record.
 */
export async function updateTemporaryRecord(
  tempId: string, 
  updates: Partial<Pick<TemporaryRecord, 'vitals' | 'treatmentsGiven' | 'notes'>>
) {
  const record = await db.temporary_records.get(tempId)
  if (!record || record.status !== 'ACTIVE') throw new Error('Record not found or already closed')
  
  await db.temporary_records.update(tempId, updates)
}

/**
 * Merges a temporary record into a real patient profile.
 * All temporary clinical data is preserved in the audit trail.
 */
export async function mergeTemporaryRecord(tempId: string, patientId: string): Promise<boolean> {
  const record = await db.temporary_records.get(tempId)
  if (!record || record.status !== 'ACTIVE') return false
  
  // 1. Mark as merged
  await db.temporary_records.update(tempId, {
    status: 'MERGED',
    mergedToPatientId: patientId,
    mergedAt: new Date().toISOString()
  })
  
  // 2. In a real system, we would move resources (vitals, treatments) to the real patientId.
  // For this demo, we'll simulate this by adding clinical notes to the real patient profile.
  const mergeNote = `[MERGED FROM ${tempId}] 
Condition: ${record.condition}
Treatments: ${record.treatmentsGiven.join(', ')}
Notes: ${record.notes}`

  await db.clinical_notes.add({
    id: crypto.randomUUID(),
    patientId,
    doctorId: record.doctorId,
    doctorName: 'Emergency System',
    timestamp: new Date().toISOString(),
    content: mergeNote,
    type: 'EMERGENCY_NOTE',
    tags: ['EMERGENCY', 'MERGE', tempId]
  })

  // 3. Log the merge event
  // (Actual logging happens in the API route or via clinical store)
  
  return true
}
