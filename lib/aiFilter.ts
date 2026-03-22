/**
 * AI Data Minimization Engine
 * Filters patient records by doctor specialty, enforcing the principle of minimum necessary access.
 */

import {
  DoctorSpecialty,
  type ConsentToken,
  type FilteredFHIRBundle,
  type FilteredBundleEntry,
  type FilterMeta,
  type SpecialtyPermissions,
  type FHIRBundle,
  type RedactedField,
} from '@/lib/types'
import { isExpired } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────
// Sensitive field categories
// ────────────────────────────────────────────────────────────────

export const SENSITIVE_FIELD_CATEGORIES = {
  psychiatric_records: 'Mental health records, therapy notes, psychiatric diagnoses',
  genetic_reports: 'Genetic test results, hereditary markers',
  reproductive_health: 'Pregnancy records, contraception, fertility, abortion history',
  social_history: 'Housing, employment, immigration status, domestic violence',
  substance_use_history: 'Alcohol, drug use, addiction treatment records',
} as const

export type SensitiveCategory = keyof typeof SENSITIVE_FIELD_CATEGORIES

// ────────────────────────────────────────────────────────────────
// Specialty → Permitted Fields Map
// ────────────────────────────────────────────────────────────────

export const SPECIALTY_FIELD_MAP: Record<DoctorSpecialty, SpecialtyPermissions> = {
  [DoctorSpecialty.CARDIOLOGIST]: {
    allowedResources: ['Condition:I00-I99', 'Observation:vital-signs,lipids,BNP,troponin,ECG', 'MedicationRequest:cardiovascular', 'Procedure:cardiac', 'AllergyIntolerance:all', 'DiagnosticReport:cardiology'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'blood_group', 'emergency_contact'],
  },
  [DoctorSpecialty.DERMATOLOGIST]: {
    allowedResources: ['Condition:L00-L99', 'Observation:CBC,ANA,ESR', 'MedicationRequest:dermatologics', 'AllergyIntolerance:contact,drug', 'DiagnosticReport:biopsy,pathology-skin'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'social_history', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.PSYCHIATRIST]: {
    allowedResources: ['Condition:F00-F99', 'MedicationRequest:psychotropic', 'Observation:PHQ-9,GAD-7,AUDIT'],
    allowedSensitiveCategories: ['psychiatric_records', 'social_history', 'substance_use_history'],
    blockedCategories: ['genetic_reports', 'reproductive_health'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.ONCOLOGIST]: {
    allowedResources: ['Condition:C00-D49', 'DiagnosticReport:pathology,tumor-markers,imaging', 'Observation:all-labs', 'MedicationRequest:chemotherapy,supportive', 'Procedure:oncologic', 'AllergyIntolerance:all'],
    allowedSensitiveCategories: ['genetic_reports'],
    blockedCategories: ['psychiatric_records', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'blood_group', 'emergency_contact'],
  },
  [DoctorSpecialty.NEUROLOGIST]: {
    allowedResources: ['Condition:G00-G99', 'DiagnosticReport:MRI,EEG,nerve-conduction', 'Observation:neurological,cognitive', 'MedicationRequest:neurological', 'Procedure:neurological'],
    allowedSensitiveCategories: [],
    blockedCategories: ['reproductive_health', 'genetic_reports'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.GENERAL_PRACTITIONER]: {
    allowedResources: ['Condition:non-sensitive', 'Observation:vital-signs,routine-labs', 'MedicationRequest:all', 'AllergyIntolerance:all', 'Immunization:all', 'DiagnosticReport:routine'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'blood_group', 'emergency_contact'],
  },
  [DoctorSpecialty.GYNECOLOGIST]: {
    allowedResources: ['Condition:N80-N99,O00-O99', 'Observation:reproductive,hormonal', 'MedicationRequest:reproductive,contraceptives', 'Procedure:gynecological'],
    allowedSensitiveCategories: ['reproductive_health'],
    blockedCategories: ['psychiatric_records', 'genetic_reports'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.ENDOCRINOLOGIST]: {
    allowedResources: ['Condition:E00-E89', 'Observation:hormonal,glucose,thyroid,adrenal', 'MedicationRequest:endocrine', 'DiagnosticReport:endocrine-imaging'],
    allowedSensitiveCategories: ['genetic_reports'],
    blockedCategories: ['psychiatric_records', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'blood_group', 'emergency_contact'],
  },
  [DoctorSpecialty.EMERGENCY]: {
    allowedResources: ['*'],
    allowedSensitiveCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'social_history', 'substance_use_history'],
    blockedCategories: [],
    patientFields: ['*'],
  },
  [DoctorSpecialty.UROLOGIST]: {
    allowedResources: ['Condition:N00-N39', 'Observation:urological', 'MedicationRequest:urological', 'Procedure:urological', 'DiagnosticReport:urological'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.ORTHOPEDIST]: {
    allowedResources: ['Condition:M00-M99,S00-T98', 'Observation:musculoskeletal', 'MedicationRequest:orthopedic', 'Procedure:orthopedic', 'DiagnosticReport:imaging-musculoskeletal'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.PULMONOLOGIST]: {
    allowedResources: ['Condition:J00-J99', 'Observation:pulmonary,spirometry', 'MedicationRequest:respiratory', 'Procedure:pulmonary', 'DiagnosticReport:chest-imaging'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.GASTROENTEROLOGIST]: {
    allowedResources: ['Condition:K00-K95', 'Observation:GI-labs', 'MedicationRequest:GI', 'Procedure:GI', 'DiagnosticReport:endoscopy,GI-imaging'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.RHEUMATOLOGIST]: {
    allowedResources: ['Condition:M00-M36', 'Observation:autoimmune-labs,inflammatory-markers', 'MedicationRequest:rheumatologic', 'DiagnosticReport:rheumatology-imaging'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
  [DoctorSpecialty.OPHTHALMOLOGIST]: {
    allowedResources: ['Condition:H00-H59', 'Observation:ophthalmological', 'MedicationRequest:ophthalmic', 'Procedure:ophthalmic', 'DiagnosticReport:eye-imaging'],
    allowedSensitiveCategories: [],
    blockedCategories: ['psychiatric_records', 'genetic_reports', 'reproductive_health', 'substance_use_history'],
    patientFields: ['name', 'birthDate', 'gender', 'emergency_contact'],
  },
}

// ────────────────────────────────────────────────────────────────
// Filtering functions
// ────────────────────────────────────────────────────────────────

/**
 * Filter patient data by doctor specialty and consent token
 */
export function filterPatientDataBySpecialty(
  records: FHIRBundle,
  specialty: DoctorSpecialty,
  consentToken: ConsentToken
): FilteredFHIRBundle {
  // Validate consent token
  if (consentToken.status !== 'ACTIVE') {
    throw new Error('Consent token is not active')
  }
  if (isExpired(consentToken.expiresAt)) {
    throw new Error('Consent token has expired')
  }

  const permissions = SPECIALTY_FIELD_MAP[specialty]
  const fieldsRedacted: string[] = []
  const isEmergency = specialty === DoctorSpecialty.EMERGENCY && consentToken.emergencyAccess

  const filteredEntries: FilteredBundleEntry[] = (records.entry ?? []).map((entry) => {
    const resource = entry.resource as Record<string, unknown> | undefined
    if (!resource) {
      return { resource: { redacted: true, reason: 'No resource', category: 'unknown' } as RedactedField }
    }

    const fullUrl = entry.fullUrl

    if (isEmergency) {
      // Emergency access — return all fields but stamp each
      const stamped = { ...resource, emergencyAccessed: true }
      const result: FilteredBundleEntry = { resource: stamped }
      if (fullUrl !== undefined) result.fullUrl = fullUrl
      return result
    }

    // Check if resource type is in allowed list
    const resourceType = resource['resourceType'] as string | undefined
    const isAllowed = permissions.allowedResources.includes('*') ||
      permissions.allowedResources.some((r) => {
        const [type] = r.split(':')
        return type === resourceType
      })

    if (!isAllowed) {
      fieldsRedacted.push(resourceType ?? 'unknown')
      return {
        resource: {
          redacted: true,
          reason: 'Not within consent scope',
          category: resourceType ?? 'unknown',
        } as RedactedField,
      }
    }

    // Redact sensitive categories not in allowlist
    const filtered = { ...resource }
    const allSensitive = Object.keys(SENSITIVE_FIELD_CATEGORIES) as SensitiveCategory[]
    for (const category of allSensitive) {
      if (
        !permissions.allowedSensitiveCategories.includes(category) &&
        !consentToken.allowedCategories.includes(category)
      ) {
        if (category in filtered) {
          filtered[category] = {
            redacted: true,
            reason: 'Not within consent scope',
            category,
          }
          fieldsRedacted.push(category)
        }
      }
    }

    const result: FilteredBundleEntry = { resource: filtered }
    if (fullUrl !== undefined) result.fullUrl = fullUrl
    return result
  })

  const meta: FilterMeta = {
    specialty,
    filteredAt: new Date().toISOString(),
    fieldsRedacted,
    consentId: consentToken.id,
    emergencyAccess: isEmergency,
  }

  return {
    resourceType: 'Bundle',
    entry: filteredEntries,
    meta,
  }
}

/**
 * Get specialty permissions for UI display
 */
export function getSpecialtyPermissions(specialty: DoctorSpecialty): SpecialtyPermissions {
  return SPECIALTY_FIELD_MAP[specialty]
}
