import Dexie, { type Table } from 'dexie'
import type { 
  PatientProfile, 
  VitalSeries, 
  ConsentToken, 
  AuditEvent, 
  AccessRequest,
  ClinicalNote,
  MedicalImage,
  RiskAnalysis,
  PatientAttachment,
  TemporaryRecord
} from './types'
import type { Condition, MedicationRequest, AllergyIntolerance } from 'fhir/r4'

export class ClinicalNodeDB extends Dexie {
  patient_profiles!: Table<PatientProfile>
  vitals!: Table<VitalSeries & { patientId: string }>
  conditions!: Table<Condition & { patientId: string }>
  medications!: Table<MedicationRequest & { patientId: string }>
  allergies!: Table<AllergyIntolerance & { patientId: string }>
  observations!: Table<any & { patientId: string }>
  diagnostic_reports!: Table<any & { patientId: string }>
  immunizations!: Table<any & { patientId: string }>
  procedures!: Table<any & { patientId: string }>
  clinical_notes!: Table<ClinicalNote>
  medical_images!: Table<MedicalImage>
  patient_attachments!: Table<PatientAttachment>
  risk_analysis!: Table<RiskAnalysis>
  consent_tokens!: Table<ConsentToken>
  audit_log!: Table<AuditEvent>
  access_requests!: Table<AccessRequest>
  temporary_records!: Table<TemporaryRecord>

  constructor() {
    super('EHIClinicalNode')
    this.version(5).stores({
      patient_profiles: 'id, healthId',
      vitals: '++id, patientId, type',
      conditions: 'id, patientId',
      medications: 'id, patientId',
      allergies: 'id, patientId',
      observations: '++id, patientId',
      diagnostic_reports: '++id, patientId',
      immunizations: '++id, patientId',
      procedures: '++id, patientId',
      clinical_notes: 'id, patientId, doctorId',
      medical_images: 'id, patientId, doctorId',
      patient_attachments: 'id, patientId, category',
      risk_analysis: 'id, patientId, scoreName',
      consent_tokens: 'id, patientId, status',
      audit_log: '++id, timestamp, type, userId',
      access_requests: 'id, doctorId, patientId, status',
      temporary_records: 'tempId, doctorId, status'
    })
  }
}

// Ensure we only initialize Dexie on the client
const isClient = typeof window !== 'undefined'

export const db = isClient ? new ClinicalNodeDB() : null as unknown as ClinicalNodeDB

export async function seedDatabase() {
  // Database seeding disabled for production readiness.
  // We want a clean slate for real FHIR data ingestion.
  return
}
