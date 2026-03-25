import { DoctorSpecialty } from './types'
import type { FHIRBundle, FHIRResource, FilteredFHIRBundle, RedactedField } from './types'

/**
 * Specialty-to-Field Mapping
 * Defines which clinical resources and categories are visible by default.
 */
export const SPECIALTY_FIELD_MAP: Record<DoctorSpecialty, {
  allowedResources: string[]
  allowedKeywords: string[]
  defaultBlockedSensitive: string[]
}> = {
  [DoctorSpecialty.CARDIOLOGIST]: {
    allowedResources: ['Observation', 'DiagnosticReport', 'MedicationRequest', 'Condition', 'Procedure'],
    allowedKeywords: ['heart', 'cardiac', 'blood pressure', 'valvular', 'cholesterol', 'stent', 'ecg', 'ekg'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.DERMATOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'MedicationRequest'],
    allowedKeywords: ['skin', 'rash', 'dermatitis', 'lesion', 'melanoma', 'biopsy'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.ONCOLOGIST]: {
    allowedResources: ['Condition', 'DiagnosticReport', 'MedicationRequest', 'Procedure', 'Observation'],
    allowedKeywords: ['tumor', 'malignancy', 'chemo', 'radiation', 'biopsy', 'staged'],
    defaultBlockedSensitive: ['psychiatric', 'reproductive']
  },
  [DoctorSpecialty.PSYCHIATRIST]: {
    allowedResources: ['Condition', 'MedicationRequest', 'Observation', 'DiagnosticReport'],
    allowedKeywords: ['mood', 'anxiety', 'behavior', 'psychosis', 'therapy', 'counseling'],
    defaultBlockedSensitive: ['genetic', 'reproductive'] // Mental health allowed for psychiatrists
  },
  [DoctorSpecialty.GENERAL_PRACTITIONER]: {
    allowedResources: ['Patient', 'Observation', 'Condition', 'MedicationRequest', 'AllergyIntolerance', 'Immunization'],
    allowedKeywords: ['*'], // Access to broad general data
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.EMERGENCY]: {
    allowedResources: ['Condition', 'MedicationRequest', 'AllergyIntolerance', 'Procedure', 'Observation'],
    allowedKeywords: ['*'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  // Add other specialties as needed...
  [DoctorSpecialty.NEUROLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure'],
    allowedKeywords: ['brain', 'nerve', 'seizure', 'reflex', 'motor'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.ENDOCRINOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'MedicationRequest'],
    allowedKeywords: ['hormone', 'thyroid', 'diabetes', 'insulin', 'glucose', 'metabolic'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.GYNECOLOGIST]: {
    allowedResources: ['Condition', 'Procedure', 'MedicationRequest'],
    allowedKeywords: ['reproductive', 'ovary', 'uterus', 'pregnancy', 'obstetric'],
    defaultBlockedSensitive: ['psychiatric', 'genetic']
  },
  [DoctorSpecialty.UROLOGIST]: {
    allowedResources: ['Condition', 'Procedure', 'MedicationRequest'],
    allowedKeywords: ['urinary', 'kidney', 'bladder', 'prostate'],
    defaultBlockedSensitive: ['psychiatric', 'genetic']
  },
  [DoctorSpecialty.ORTHOPEDIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure', 'DiagnosticReport'],
    allowedKeywords: ['bone', 'joint', 'fracture', 'spinal', 'ligament'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.PULMONOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'DiagnosticReport'],
    allowedKeywords: ['lung', 'respiratory', 'asthma', 'breath', 'oxygen'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.GASTROENTEROLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'DiagnosticReport', 'Procedure'],
    allowedKeywords: ['stomach', 'bowel', 'liver', 'gastric', 'endoscopy'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.RHEUMATOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'AllergyIntolerance'],
    allowedKeywords: ['autoimmune', 'joint', 'inflammation', 'arthritis', 'lupus'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  },
  [DoctorSpecialty.OPHTHALMOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure'],
    allowedKeywords: ['eye', 'vision', 'retina', 'cornea', 'cataract'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive']
  }
}

/**
 * Core Patient-Side Minimization Filter
 * Runs on the patient's device ONLY.
 */
export function filterPatientDataBySpecialty(
  bundle: FHIRBundle,
  specialty: DoctorSpecialty,
  allowedCategories: string[] = []
): FilteredFHIRBundle {
  const config = SPECIALTY_FIELD_MAP[specialty] || SPECIALTY_FIELD_MAP[DoctorSpecialty.GENERAL_PRACTITIONER]
  
  const entries = bundle.entry || []
  const filteredEntries = entries.map(entry => {
    const resource = entry.resource as FHIRResource
    if (!resource) return entry
    
    // Categorize resource (Simulated categorization logic)
    const category = getResourceCategory(resource)
    
    // Check if resource is in a sensitive category
    const isSensitive = ['psychiatric', 'genetic', 'reproductive'].includes(category)
    const isExplicitlyAllowed = allowedCategories.includes(category)
    
    // Filtering logic:
    // 1. Must be in allowedResources for the specialty
    // 2. Must not be sensitive OR must be explicitly allowed
    // 3. (Optional) Keyword matching for more granular control
    
    const resourceTypeMatch = config.allowedResources.includes(resource.resourceType)
    const sensitivityPass = !isSensitive || isExplicitlyAllowed || !config.defaultBlockedSensitive.includes(category)
    
    const shouldInclude = resourceTypeMatch && sensitivityPass

    if (shouldInclude) {
      return {
        fullUrl: entry.fullUrl,
        resource: resource as unknown as Record<string, unknown>
      }
    } else {
      // Return a redacted stub as per specification
      const redacted: RedactedField = {
        redacted: true,
        reason: 'Restricted by AI Data Minimization policy',
        category: category
      }
      return {
        fullUrl: entry.fullUrl,
        resource: redacted
      }
    }
  })

  return {
    resourceType: 'Bundle',
    entry: filteredEntries as FilteredFHIRBundle['entry'],
    meta: {
      specialty,
      filteredAt: new Date().toISOString(),
      fieldsRedacted: filteredEntries
        .filter(e => (e.resource as Record<string, unknown>).redacted === true)
        .map(e => (e.resource as Record<string, unknown>).category as string),
      consentId: 'temp_meta_id',
      emergencyAccess: specialty === DoctorSpecialty.EMERGENCY
    }
  }
}

/**
 * AI Recommendation Engine
 * Suggests clinical categories based on the requesting doctor's specialty.
 * This is a Semi-Agentic feature to assist patient data minimization.
 */
export function getRecommendedCategories(specialty: DoctorSpecialty): string[] {
  const config = SPECIALTY_FIELD_MAP[specialty]
  if (!config) return ['vitals'] // Fallback to bare minimum

  const recommendations: string[] = []
  
  // Map FHIR resources to UI Category IDs
  const resourceMap: Record<string, string> = {
    'Observation': 'vitals',
    'Condition': 'conditions',
    'MedicationRequest': 'medications',
    'AllergyIntolerance': 'allergies',
    'ClinicalNote': 'clinicalNotes',
    'DiagnosticReport': 'attachments',
    'MedicalImage': 'medicalImages'
  }

  config.allowedResources.forEach(res => {
    if (resourceMap[res]) {
      recommendations.push(resourceMap[res])
    }
  })

  // Specialty-specific overrides
  if (specialty === DoctorSpecialty.CARDIOLOGIST) recommendations.push('vitals')
  if (specialty === DoctorSpecialty.PSYCHIATRIST) recommendations.push('clinicalNotes')
  if (specialty === DoctorSpecialty.EMERGENCY) return ['vitals', 'conditions', 'medications', 'allergies']

  return [...new Set(recommendations)]
}

function getResourceCategory(resource: FHIRResource): string {
  const text = JSON.stringify(resource).toLowerCase()
  if (text.includes('psychi') || text.includes('mental') || text.includes('behavioral')) return 'psychiatric'
  if (text.includes('genet') || text.includes('chromosom') || text.includes('dna')) return 'genetic'
  if (text.includes('repro') || text.includes('obstetr') || text.includes('pregnan') || text.includes('fertility')) return 'reproductive'
  if (text.includes('heart') || text.includes('cardiac')) return 'cardiovascular'
  if (text.includes('skin') || text.includes('derma')) return 'dermatology'
  if (text.includes('diabet') || text.includes('insulin')) return 'endocrine'
  return 'general'
}
