import type { Patient, Observation, Condition, MedicationRequest, AllergyIntolerance, DiagnosticReport, Bundle, Immunization, Procedure } from 'fhir/r4'
import { z } from 'zod'

// ────────────────────────────────────────────────────────────────
// Re-export FHIR R4 types for convenience
// ────────────────────────────────────────────────────────────────

export type FHIRPatient = Patient
export type FHIRObservation = Observation
export type FHIRCondition = Condition
export type FHIRMedicationRequest = MedicationRequest
export type FHIRAllergyIntolerance = AllergyIntolerance
export type FHIRDiagnosticReport = DiagnosticReport
export type FHIRBundle = Bundle
export type FHIRImmunization = Immunization
export type FHIRProcedure = Procedure
export type FHIRResource = Patient | Observation | Condition | MedicationRequest | AllergyIntolerance | DiagnosticReport | Immunization | Procedure

// ────────────────────────────────────────────────────────────────
// App-specific types
// ────────────────────────────────────────────────────────────────

export interface PatientProfile {
  id: string
  healthId: string
  name: string
  birthDate: string
  gender: 'male' | 'female' | 'other' | 'unknown'
  bloodGroup: string
  emergencyContact: EmergencyContact
  photoUrl: string | null
  createdAt: string
  lastAccessAt: string
  address?: string | undefined
  city?: string | undefined
  pincode?: string | undefined
  pastSurgeries?: string | undefined
  organDonor?: 'Yes' | 'No' | 'Unspecified' | undefined
  insuranceId?: string | undefined
  age?: number | string | undefined
  location?: string | undefined
}

export interface DoctorProfile {
  id: string // Firebase UID
  name: string
  email: string
  licenseNumber: string
  specialty: DoctorSpecialty
  isVerified: boolean
  createdAt: string
  lastActiveAt: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface VitalSeries {
  type: 'heartRate' | 'bloodPressureSystolic' | 'bloodPressureDiastolic' | 'oxygenSaturation' | 'temperature' | 'weight' | 'glucose'
  unit: string
  readings: VitalReading[]
  latestValue: number
  trend: 'rising' | 'falling' | 'stable'
  anomalous: boolean
}

export interface VitalReading {
  timestamp: string
  value: number
  source: 'SMART on FHIR' | 'Manual Entry' | 'Device Sync'
}

// ────────────────────────────────────────────────────────────────
// Audit types
// ────────────────────────────────────────────────────────────────

export type AuditEventType =
  | 'ACCESS'
  | 'SHARE'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'RECORD_VIEWED'
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'AI_SUMMARY_GENERATED'
  | 'EMERGENCY_ACCESS_TRIGGERED'
  | 'EMERGENCY_ACCESS_EXTENDED'
  | 'EMERGENCY_ACCESS_EXPIRED'
  | 'EMERGENCY_ACCESS_DISPUTED'
  | 'EMERGENCY_FIELD_VIEWED'
  | 'TEMP_ID_CREATED'
  | 'TEMP_ID_MERGED'
  | 'EMERGENCY_AUTH_FAILED'
  | 'SECURITY_ALERT'
  | 'BIOMETRIC_UNLOCK'
  | 'KEY_GENERATED'
  | 'EXPORT_DATA'

export interface TemporaryRecord {
  tempId: string
  arrivalTime: string
  approximateAge: number | null
  gender: 'male' | 'female' | 'unknown'
  condition: string
  vitals: VitalReading[]
  treatmentsGiven: string[]
  doctorId: string
  notes: string
  status: 'ACTIVE' | 'MERGED' | 'CLOSED'
  mergedToPatientId: string | null
  mergedAt: string | null
}

export interface AuditEvent {
  id: string
  type: AuditEventType
  timestamp: string
  userId: string
  description: string
  metadata: Record<string, unknown>
  hash: string
  previousHash: string
}

export interface DisplayAuditEvent extends AuditEvent {
  relativeTime: string
  displayHash: string
  iconName: string
  colorToken: string
}

export interface AuditChainVerification {
  valid: boolean
  brokenAt: number | null
  message: string
  totalEvents: number
  verifiedEvents: number
}

// ────────────────────────────────────────────────────────────────
// Consent types
// ────────────────────────────────────────────────────────────────

export type ConsentTokenStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING'

export interface ConsentToken {
  id: string
  patientId: string
  recipientName: string
  recipientId: string
  specialty: DoctorSpecialty
  grantedAt: string
  expiresAt: string
  ttlSeconds: number
  allowedCategories: string[]
  emergencyAccess: boolean
  status: ConsentTokenStatus
  revokedAt: string | null
  revocationReason: string | null
  accessCount: number
  lastAccessedAt: string | null
  tokenHash: string
  patientName?: string | undefined
  allowedFiles?: string[]
  allowedBodySystems?: BodySystem[]
  tokenKey?: string | undefined
  purpose?: string
  maxHistoryMonths?: number | null
}

export interface ConsentTokenRequest {
  patientId: string
  recipientName: string
  recipientId: string
  specialty: DoctorSpecialty
  ttlSeconds: number
  allowedCategories?: string[]
  emergencyAccess?: boolean
  patientName: string
  allowedFiles?: string[]
  tokenKey?: string | undefined
  purpose?: string
  maxHistoryMonths?: number | null
}

export interface ConsentTokenValidation {
  valid: boolean
  reason: string | null
  secondsRemaining: number
}

// ────────────────────────────────────────────────────────────────
// Doctor Specialty
// ────────────────────────────────────────────────────────────────

export enum DoctorSpecialty {
  DERMATOLOGIST = 'Dermatologist',
  CARDIOLOGIST = 'Cardiologist',
  PSYCHIATRIST = 'Psychiatrist',
  GENERAL_PRACTITIONER = 'General Practitioner',
  ONCOLOGIST = 'Oncologist',
  NEUROLOGIST = 'Neurologist',
  EMERGENCY = 'Emergency',
  ENDOCRINOLOGIST = 'Endocrinologist',
  GYNECOLOGIST = 'Gynecologist',
  UROLOGIST = 'Urologist',
  ORTHOPEDIST = 'Orthopedist',
  PULMONOLOGIST = 'Pulmonologist',
  GASTROENTEROLOGIST = 'Gastroenterologist',
  RHEUMATOLOGIST = 'Rheumatologist',
  OPHTHALMOLOGIST = 'Ophthalmologist',
}

// ────────────────────────────────────────────────────────────────
// Body Systems (AI Categorization)
// ────────────────────────────────────────────────────────────────

export type BodySystem = 
  | 'Heart' 
  | 'Bones' 
  | 'Mental' 
  | 'Lungs' 
  | 'Digestive' 
  | 'Blood' 
  | 'Brain' 
  | 'Skin' 
  | 'General';


// ────────────────────────────────────────────────────────────────
// Filtered FHIR types
// ────────────────────────────────────────────────────────────────

export interface RedactedField {
  redacted: true
  reason: string
  category: string
}

export interface FilterMeta {
  specialty: DoctorSpecialty
  filteredAt: string
  fieldsRedacted: string[]
  consentId: string
  emergencyAccess: boolean
}

export interface FilteredBundleEntry {
  resource: Record<string, unknown> | RedactedField
  fullUrl?: string
}

export interface FilteredFHIRBundle {
  resourceType: 'Bundle'
  entry: FilteredBundleEntry[]
  meta: FilterMeta
}

export interface SpecialtyPermissions {
  allowedResources: string[]
  allowedSensitiveCategories: string[]
  blockedCategories: string[]
  patientFields: string[]
}

// ────────────────────────────────────────────────────────────────
// SMART on FHIR
// ────────────────────────────────────────────────────────────────

export interface SMARTConfig {
  clientId: string
  authorizationEndpoint: string
  tokenEndpoint: string
  fhirBaseUrl: string
  scopes: string[]
}

export interface SMARTTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
  patient: string
  refresh_token?: string
}

// ────────────────────────────────────────────────────────────────
// Offline sync
// ────────────────────────────────────────────────────────────────

export interface PendingSync {
  id: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'AUDIT_LOG'
  endpoint: string
  payload: Record<string, unknown>
  queuedAt: string
  retryCount: number
}

// ────────────────────────────────────────────────────────────────
// AI / Search
// ────────────────────────────────────────────────────────────────

export interface SearchResult {
  resourceId: string
  resourceType: string
  relevance: number
  snippet: string
}

export interface AnomalyResult {
  vitalType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  recommendation: string
}

// ────────────────────────────────────────────────────────────────
// New Clinical Interventions
// ────────────────────────────────────────────────────────────────

export interface ClinicalNote {
  id: string
  patientId: string
  doctorId: string
  doctorName: string
  timestamp: string
  content: string
  type: 'PROGRESS_NOTE' | 'CONSULT_NOTE' | 'EMERGENCY_NOTE'
  authorRole?: string
  tags?: string[]
}

export interface MedicalImage {
  id: string
  patientId: string
  doctorId: string
  timestamp: string
  imageUrl: string // Local blob/data URL or Public URL
  storagePath?: string // Internal Supabase storage path
  type: 'X-RAY' | 'MRI' | 'CT' | 'PHOTO'
  description?: string
  aiFindings?: ClinicalFinding[]
}

export interface ClinicalFinding {
  id: string
  category: string // e.g., 'Anatomy', 'Pathology'
  finding: string
  confidence: number
  location?: string
  severity?: 'NORMAL' | 'A-NORMAL' | 'CRITICAL'
}

export interface RiskAnalysis {
  id: string
  patientId: string
  specialty: DoctorSpecialty
  timestamp: string
  scoreName: string // e.g., 'Framingham', 'CHA2DS2-VASc'
  scoreValue: number | string
  interpretation: string
  recommendation: string[]
}

export interface PatientAttachment {
  id: string
  patientId: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string // Public URL or Proxy URL
  storagePath?: string // Internal Supabase storage path
  uploadedAt: string
  category: 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'CLINICAL_NOTE' | 'IMAGE_REPORT' | 'INSURANCE_DOC' | 'OTHER'
  description?: string | undefined
  isVerified?: boolean
  doctorId?: string // Track uploader
}

// ────────────────────────────────────────────────────────────────
// Zod schemas
// ────────────────────────────────────────────────────────────────

export const PatientProfileSchema = z.object({
  id: z.string(),
  healthId: z.string(),
  name: z.string(),
  birthDate: z.string(),
  gender: z.enum(['male', 'female', 'other', 'unknown']),
  bloodGroup: z.string(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
  }),
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
  lastAccessAt: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  pastSurgeries: z.string().optional(),
  organDonor: z.enum(['Yes', 'No', 'Unspecified']).optional(),
  insuranceId: z.string().optional(),
  age: z.union([z.number(), z.string()]).optional(),
  location: z.string().optional(),
})

export const ConsentTokenRequestSchema = z.object({
  patientId: z.string(),
  recipientName: z.string(),
  recipientId: z.string(),
  specialty: z.nativeEnum(DoctorSpecialty),
  ttlSeconds: z.number().positive(),
  allowedCategories: z.array(z.string()).optional(),
  emergencyAccess: z.boolean().optional(),
})

export const AuditEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  description: z.string(),
  metadata: z.record(z.unknown()),
  hash: z.string(),
  previousHash: z.string(),
})

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  records: z.object({
    resourceType: z.literal('Bundle'),
    entry: z.array(z.unknown()),
  }),
  patientId: z.string(),
})

export const AnomalyRequestSchema = z.object({
  vitals: z.array(z.object({
    type: z.string(),
    unit: z.string(),
    readings: z.array(z.object({
      timestamp: z.string(),
      value: z.number(),
      source: z.string(),
    })),
    latestValue: z.number(),
    trend: z.enum(['rising', 'falling', 'stable']),
    anomalous: z.boolean(),
  })),
})

export const SummaryRequestSchema = z.object({
  patientId: z.string(),
  records: z.object({
    resourceType: z.literal('Bundle'),
    entry: z.array(z.unknown()),
    meta: z.object({
      specialty: z.nativeEnum(DoctorSpecialty),
      filteredAt: z.string(),
      fieldsRedacted: z.array(z.string()),
      consentId: z.string(),
      emergencyAccess: z.boolean(),
    }),
  }),
})

export const FilterRequestSchema = z.object({
  records: z.object({
    resourceType: z.literal('Bundle'),
    entry: z.array(z.unknown()),
  }),
  specialty: z.nativeEnum(DoctorSpecialty),
  consentTokenId: z.string(),
})

export const ConsentIssueRequestSchema = z.object({
  tokenHash: z.string(),
  patientId: z.string(),
  recipientId: z.string(),
  expiresAt: z.string(),
  specialty: z.string(),
})

export const ConsentRevokeRequestSchema = z.object({
  tokenId: z.string(),
  reason: z.string(),
  patientId: z.string(),
})

export const AuditLogRequestSchema = AuditEventSchema

export const FHIRBundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  type: z.string().optional(),
  entry: z.array(z.object({
    fullUrl: z.string().optional(),
    resource: z.record(z.unknown()),
  })).optional(),
})
export interface AccessRequest {
  id: string
  doctorId: string
  doctorName: string
  doctorSpecialty: DoctorSpecialty
  organization: string
  patientId: string
  requestedAt: string
  status: 'PENDING' | 'APPROVED' | 'DENIED'
  patientName?: string | null
  sharedCategories: string[]
  sharedBodySystems?: BodySystem[]
  reason?: string | null
  requestedDuration?: number | null
  metadata?: Record<string, any>
}
