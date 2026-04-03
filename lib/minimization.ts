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
  maxHistoryMonths: number | null // null = infinite, e.g. for GP
}> = {
  [DoctorSpecialty.CARDIOLOGIST]: {
    allowedResources: ['Observation', 'DiagnosticReport', 'MedicationRequest', 'Condition', 'Procedure'],
    allowedKeywords: ['heart', 'cardiac', 'blood pressure', 'valvular', 'cholesterol', 'stent', 'ecg', 'ekg', 'pulse', 'arrhythmia'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.DERMATOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'MedicationRequest', 'MedicalImage'],
    allowedKeywords: ['skin', 'rash', 'dermatitis', 'lesion', 'melanoma', 'biopsy', 'psoriasis', 'eczema', 'acne'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 36
  },
  [DoctorSpecialty.ONCOLOGIST]: {
    allowedResources: ['Condition', 'DiagnosticReport', 'MedicationRequest', 'Procedure', 'Observation', 'MedicalImage'],
    allowedKeywords: ['tumor', 'malignancy', 'chemo', 'radiation', 'biopsy', 'staged', 'cancer', 'metastasis', 'remission'],
    defaultBlockedSensitive: ['psychiatric', 'reproductive'],
    maxHistoryMonths: 60
  },
  [DoctorSpecialty.PSYCHIATRIST]: {
    allowedResources: ['Condition', 'MedicationRequest', 'Observation', 'DiagnosticReport', 'ClinicalNote'],
    allowedKeywords: ['mood', 'anxiety', 'behavior', 'psychosis', 'therapy', 'counseling', 'depression', 'bipolar', 'sleep'],
    defaultBlockedSensitive: ['genetic', 'reproductive'],
    maxHistoryMonths: 48
  },
  [DoctorSpecialty.GENERAL_PRACTITIONER]: {
    allowedResources: ['*'], // Special case for GPs
    allowedKeywords: ['*'], 
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: null // Unlimited history for primary care
  },
  [DoctorSpecialty.EMERGENCY]: {
    allowedResources: ['*'],
    allowedKeywords: ['*'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: null // Unlimited history for emergencies
  },
  [DoctorSpecialty.NEUROLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure', 'DiagnosticReport', 'MedicalImage'],
    allowedKeywords: ['brain', 'nerve', 'seizure', 'reflex', 'motor', 'epilepsy', 'stroke', 'mri', 'ct'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.ENDOCRINOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'MedicationRequest', 'DiagnosticReport'],
    allowedKeywords: ['hormone', 'thyroid', 'diabetes', 'insulin', 'glucose', 'metabolic', 'pituitary', 'adrenal'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.GYNECOLOGIST]: {
    allowedResources: ['Condition', 'Procedure', 'MedicationRequest', 'Observation', 'DiagnosticReport'],
    allowedKeywords: ['reproductive', 'ovary', 'uterus', 'pregnancy', 'obstetric', 'period', 'menopause', 'breast'],
    defaultBlockedSensitive: ['psychiatric', 'genetic'],
    maxHistoryMonths: 48
  },
  [DoctorSpecialty.UROLOGIST]: {
    allowedResources: ['Condition', 'Procedure', 'MedicationRequest', 'Observation', 'DiagnosticReport'],
    allowedKeywords: ['urinary', 'kidney', 'bladder', 'prostate', 'calculus', 'renal'],
    defaultBlockedSensitive: ['psychiatric', 'genetic'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.ORTHOPEDIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure', 'DiagnosticReport', 'MedicalImage'],
    allowedKeywords: ['bone', 'joint', 'fracture', 'spinal', 'ligament', 'vertebra', 'cast', 'orthosis'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 36
  },
  [DoctorSpecialty.PULMONOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'DiagnosticReport', 'MedicationRequest', 'Procedure'],
    allowedKeywords: ['lung', 'respiratory', 'asthma', 'breath', 'oxygen', 'copd', 'bronchial', 'pleural'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.GASTROENTEROLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'DiagnosticReport', 'Procedure'],
    allowedKeywords: ['stomach', 'bowel', 'liver', 'gastric', 'endoscopy', 'colonoscopy', 'pancreas', 'digestive'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.RHEUMATOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'AllergyIntolerance', 'DiagnosticReport', 'MedicationRequest'],
    allowedKeywords: ['autoimmune', 'joint', 'inflammation', 'arthritis', 'lupus', 'crp', 'esr', 'connective'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 36
  },
  [DoctorSpecialty.OPHTHALMOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure', 'DiagnosticReport'],
    allowedKeywords: ['eye', 'vision', 'retina', 'cornea', 'cataract', 'glaucoma', 'macular', 'optics'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: null // GP-like for vision history
  }
}

/**
 * Core Patient-Side Minimization Filter
 * Runs on the patient's device ONLY.
 */
export function filterPatientDataBySpecialty(
  bundle: FHIRBundle,
  specialty: DoctorSpecialty,
  allowedCategories: string[] = [],
  purpose: string = 'Treatment',
  maxHistoryMonthsOverride?: number | null
): FilteredFHIRBundle {
  const config = SPECIALTY_FIELD_MAP[specialty] || SPECIALTY_FIELD_MAP[DoctorSpecialty.GENERAL_PRACTITIONER]
  const maxMonths = maxHistoryMonthsOverride !== undefined ? maxHistoryMonthsOverride : config.maxHistoryMonths
  
  const entries = bundle.entry || []
  const layersTriggered: Set<string> = new Set()

  const filteredEntries = entries.map(entry => {
    const resource = entry.resource as FHIRResource
    if (!resource) return entry
    
    const category = getResourceCategory(resource)
    
    // LAYER 1: ACCESS CONTEXT (Purpose-Based)
    if (purpose === 'Administrative') {
      const isClinical = ['Observation', 'MedicationRequest', 'ClinicalNote', 'AllergyIntolerance'].includes(resource.resourceType)
      if (isClinical) {
        layersTriggered.add('Contextual Layer (Admin Redaction)')
        return { fullUrl: entry.fullUrl, resource: { redacted: true, reason: 'Clinical data restricted for Administrative purpose', category } }
      }
    }

    if (purpose === 'Research') {
      // PII Redaction
      if (resource.resourceType === 'Patient') {
        layersTriggered.add('Contextual Layer (De-identification)')
        return { 
          fullUrl: entry.fullUrl, 
          resource: { 
            ...resource, 
            name: [{ text: 'DE-IDENTIFIED' }], 
            address: [], 
            telecom: [],
            birthDate: (resource as any).birthDate?.split('-')[0] || '1900' // Generalize to year
          } as any 
        }
      }
    }

    // LAYER 0: SPECIALTY MAPPING (Base Layer)
    const resourceTypePass = config.allowedResources.includes('*') || config.allowedResources.includes(resource.resourceType)
    if (!resourceTypePass) {
       layersTriggered.add('Specialty Layer (Out-of-Scope Resource)')
       return { fullUrl: entry.fullUrl, resource: { redacted: true, reason: `Resource ${resource.resourceType} restricted for ${specialty}`, category } }
    }

    // LAYER 2: TEMPORAL RECENCY (Time-Based)
    if (maxMonths !== null) {
      const timestamp = (resource as any).effectiveDateTime || (resource as any).authoredOn || (resource as any).uploadedAt || (resource as any).recordedDate
      if (timestamp) {
        const recordDate = new Date(timestamp)
        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - maxMonths)
        
        if (recordDate < cutoff) {
          layersTriggered.add('Temporal Layer (Historical Redaction)')
          return { fullUrl: entry.fullUrl, resource: { redacted: true, reason: `Historical record older than ${maxMonths} months`, category } }
        }
      }
    }

    // LAYER 3: SEMANTIC SECURITY (AI-Driven Keyword Enforcement)
    if (config.allowedKeywords !== null && !config.allowedKeywords.includes('*')) {
      const content = JSON.stringify(resource).toLowerCase()
      const matchesKeyword = config.allowedKeywords.some(k => content.includes(k.toLowerCase()))
      
      const requiresSemanticMatch = ['DiagnosticReport', 'ClinicalNote', 'MedicalImage', 'Condition'].includes(resource.resourceType)
      
      if (requiresSemanticMatch && !matchesKeyword) {
        layersTriggered.add('Semantic Layer (Non-Relevant Context)')
        return { fullUrl: entry.fullUrl, resource: { redacted: true, reason: 'Record does not match requester clinical specialty context', category } }
      }
    }

    // Final Sensitivity Check (Keep previous logic)
    const isSensitive = ['psychiatric', 'genetic', 'reproductive'].includes(category)
    const isExplicitlyAllowed = allowedCategories.includes(category)
    const sensitivityPass = !isSensitive || isExplicitlyAllowed || !config.defaultBlockedSensitive.includes(category)
    
    if (!sensitivityPass) {
      layersTriggered.add('Privacy Layer (Sensitive Redaction)')
      return { fullUrl: entry.fullUrl, resource: { redacted: true, reason: 'Sensitivity policy restriction', category } }
    }

    return {
      fullUrl: entry.fullUrl,
      resource: resource as unknown as Record<string, unknown>
    }
  })

  return {
    resourceType: 'Bundle',
    entry: filteredEntries as FilteredFHIRBundle['entry'],
    meta: {
      specialty,
      filteredAt: new Date().toISOString(),
      fieldsRedacted: Array.from(layersTriggered), // Store info on what layers were active
      consentId: 'vault_protection_node',
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
