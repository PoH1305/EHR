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
    allowedKeywords: ['heart', 'cardiac', 'blood pressure', 'valvular', 'cholesterol', 'stent', 'ecg', 'ekg', 'pulse', 'arrhythmia', 'hypertension', 'atrial', 'fibrillation', 'amlodipine', 'atenolol', 'metoprolol', 'lisinopril', 'valsartan', 'angina', 'coronary', 'myocardial', 'infarction', 'palpitation', 'aorta', 'angioplasty', 'bypass', 'ischemia', 'systolic', 'diastolic', 'troponin', 'bnp', 'lipid', 'murmur', 'tachycardia', 'bradycardia'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.DERMATOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'MedicationRequest', 'MedicalImage'],
    allowedKeywords: ['skin', 'rash', 'dermatitis', 'lesion', 'melanoma', 'biopsy', 'psoriasis', 'eczema', 'acne', 'hives', 'urticaria', 'fungal', 'cellulitis', 'pruritus', 'vitiligo', 'wart', 'mole', 'wound', 'burn', 'allergy'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 36
  },
  [DoctorSpecialty.ONCOLOGIST]: {
    allowedResources: ['Condition', 'DiagnosticReport', 'MedicationRequest', 'Procedure', 'Observation', 'MedicalImage'],
    allowedKeywords: ['tumor', 'malignancy', 'chemo', 'radiation', 'biopsy', 'staged', 'cancer', 'metastasis', 'remission', 'oncology', 'carcinoma', 'lymphoma', 'leukemia', 'neoplasm', 'cytology', 'marker', 'pet scan'],
    defaultBlockedSensitive: ['psychiatric', 'reproductive'],
    maxHistoryMonths: 60
  },
  [DoctorSpecialty.PSYCHIATRIST]: {
    allowedResources: ['Condition', 'MedicationRequest', 'Observation', 'DiagnosticReport', 'ClinicalNote'],
    allowedKeywords: ['mood', 'anxiety', 'behavior', 'psychosis', 'therapy', 'counseling', 'depression', 'bipolar', 'sleep', 'sertraline', 'fluoxetine', 'antidepressant', 'antipsychotic', 'psychiatric', 'mental', 'stress', 'ptsd', 'adhd', 'ocd', 'panic', 'phobia', 'insomnia', 'schizophrenia', 'wellbutrin', 'lexapro', 'zoloft', 'prozac', 'citalopram', 'ssri'],
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
    allowedKeywords: ['brain', 'nerve', 'seizure', 'reflex', 'motor', 'epilepsy', 'stroke', 'mri', 'ct', 'neuropathy', 'parkinson', 'alzheimer', 'dementia', 'tremor', 'vertigo', 'meningitis', 'cerebral', 'eeg', 'migraine', 'headache', 'concussion', 'cognitive', 'spinal cord'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.ENDOCRINOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'MedicationRequest', 'DiagnosticReport'],
    allowedKeywords: ['hormone', 'thyroid', 'diabetes', 'insulin', 'glucose', 'metabolic', 'pituitary', 'adrenal', 'hba1c', 'metformin', 'levothyroxine', 'cortisol', 'testosterone', 'estrogen', 'cushing', 'addison', 'pancreatic', 'endocrine'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.GYNECOLOGIST]: {
    allowedResources: ['Condition', 'Procedure', 'MedicationRequest', 'Observation', 'DiagnosticReport'],
    allowedKeywords: ['reproductive', 'ovary', 'uterus', 'pregnancy', 'obstetric', 'period', 'menopause', 'breast', 'cervical', 'pap smear', 'fertility', 'contraceptive', 'prenatal', 'postpartum', 'pcos', 'endometriosis', 'mammogram'],
    defaultBlockedSensitive: ['psychiatric', 'genetic'],
    maxHistoryMonths: 48
  },
  [DoctorSpecialty.UROLOGIST]: {
    allowedResources: ['Condition', 'Procedure', 'MedicationRequest', 'Observation', 'DiagnosticReport'],
    allowedKeywords: ['urinary', 'kidney', 'bladder', 'prostate', 'calculus', 'renal', 'nephro', 'urethra', 'incontinence', 'dialysis', 'creatinine', 'uti', 'catheter', 'lithotripsy'],
    defaultBlockedSensitive: ['psychiatric', 'genetic'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.ORTHOPEDIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure', 'DiagnosticReport', 'MedicalImage'],
    allowedKeywords: ['bone', 'joint', 'fracture', 'spinal', 'ligament', 'vertebra', 'cast', 'orthosis', 'lumbar', 'disc', 'herniation', 'arthroscopy', 'tendon', 'osteoporosis', 'scoliosis', 'cartilage', 'meniscus', 'rotator', 'knee', 'hip', 'shoulder', 'sciatica', 'arthritis'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 36
  },
  [DoctorSpecialty.PULMONOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'DiagnosticReport', 'MedicationRequest', 'Procedure'],
    allowedKeywords: ['lung', 'respiratory', 'asthma', 'breath', 'oxygen', 'copd', 'bronchial', 'pleural', 'inhaler', 'nebulizer', 'spirometry', 'pulmonary', 'tuberculosis', 'pneumonia', 'ventilator', 'dyspnea', 'wheezing', 'spo2', 'chest'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.GASTROENTEROLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'DiagnosticReport', 'Procedure'],
    allowedKeywords: ['stomach', 'bowel', 'liver', 'gastric', 'endoscopy', 'colonoscopy', 'pancreas', 'digestive', 'gastritis', 'ulcer', 'crohn', 'colitis', 'hepatitis', 'cirrhosis', 'gerd', 'reflux', 'ibs', 'gallbladder', 'abdominal', 'nausea'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 24
  },
  [DoctorSpecialty.RHEUMATOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'AllergyIntolerance', 'DiagnosticReport', 'MedicationRequest'],
    allowedKeywords: ['autoimmune', 'joint', 'inflammation', 'arthritis', 'lupus', 'crp', 'esr', 'connective', 'rheumatoid', 'fibromyalgia', 'gout', 'vasculitis', 'scleroderma', 'sjogren', 'ana', 'anti-ccp'],
    defaultBlockedSensitive: ['psychiatric', 'genetic', 'reproductive'],
    maxHistoryMonths: 36
  },
  [DoctorSpecialty.OPHTHALMOLOGIST]: {
    allowedResources: ['Observation', 'Condition', 'Procedure', 'DiagnosticReport'],
    allowedKeywords: ['eye', 'vision', 'retina', 'cornea', 'cataract', 'glaucoma', 'macular', 'optics', 'ophthalmol', 'lens', 'intraocular', 'conjunctivitis', 'astigmatism', 'myopia', 'presbyopia', 'laser eye', 'oct scan'],
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
  if (text.includes('psychi') || text.includes('mental') || text.includes('behavioral') || text.includes('anxiety') || text.includes('depression') || text.includes('sertraline') || text.includes('antidepressant')) return 'psychiatric'
  if (text.includes('genet') || text.includes('chromosom') || text.includes('dna')) return 'genetic'
  if (text.includes('repro') || text.includes('obstetr') || text.includes('pregnan') || text.includes('fertility') || text.includes('contracepti')) return 'reproductive'
  if (text.includes('heart') || text.includes('cardiac') || text.includes('hypertension') || text.includes('atrial') || text.includes('fibrillation') || text.includes('amlodipine') || text.includes('coronary') || text.includes('arrhythmia') || text.includes('angina') || text.includes('myocardial')) return 'cardiovascular'
  if (text.includes('skin') || text.includes('derma') || text.includes('rash') || text.includes('eczema') || text.includes('psoriasis')) return 'dermatology'
  if (text.includes('diabet') || text.includes('insulin') || text.includes('thyroid') || text.includes('hormone') || text.includes('glucose') || text.includes('hba1c')) return 'endocrine'
  if (text.includes('bone') || text.includes('fracture') || text.includes('lumbar') || text.includes('arthroscopy') || text.includes('herniation') || text.includes('ortho')) return 'orthopedic'
  if (text.includes('lung') || text.includes('asthma') || text.includes('respiratory') || text.includes('pneumonia') || text.includes('copd')) return 'pulmonary'
  if (text.includes('brain') || text.includes('neuro') || text.includes('seizure') || text.includes('migraine') || text.includes('stroke')) return 'neurological'
  if (text.includes('stomach') || text.includes('gastric') || text.includes('liver') || text.includes('bowel') || text.includes('digestive')) return 'gastrointestinal'
  return 'general'
}
