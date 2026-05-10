/**
 * AI-Driven Medical Categorization Utility
 * Maps clinical record metadata to intuitive 'Body Systems' or 'Medical Domains'.
 */

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

export interface CategorizedRecord {
  system: BodySystem;
  confidence: number;
  icon: string;
}

const SYSTEM_KEYWORDS: Record<BodySystem, string[]> = {
  Heart: ['ecg', 'cardio', 'heart', 'bp', 'blood pressure', 'pulse', 'tachycardia', 'bradycardia', 'murmur', 'vessel', 'cholesterol', 'lipid', 'statin', 'atv', 'hypertension', 'atrial', 'fibrillation', 'arrhythmia', 'amlodipine', 'atenolol', 'metoprolol', 'lisinopril', 'valsartan', 'angina', 'coronary', 'myocardial', 'infarction', 'palpitation', 'valve', 'aorta', 'angioplasty', 'bypass', 'ischemia', 'systolic', 'diastolic', 'troponin', 'bnp'],
  Bones: ['bone', 'fracture', 'ortho', 'joint', 'spine', 'vertebra', 'x-ray', 'mri bone', 'cast', 'calcium', 'knee', 'hip', 'shoulder', 'lumbar', 'disc', 'herniation', 'arthroscopy', 'ligament', 'tendon', 'osteoporosis', 'scoliosis', 'cartilage', 'meniscus', 'rotator', 'cervical', 'spinal', 'sciatica', 'arthritis'],
  Mental: ['anxiety', 'depression', 'therapy', 'psych', 'mood', 'mental', 'stress', 'session', 'counseling', 'behavioral', 'adhd', 'ptsd', 'sertraline', 'fluoxetine', 'antidepressant', 'antipsychotic', 'bipolar', 'schizophrenia', 'ocd', 'panic', 'phobia', 'insomnia', 'psychiatric', 'wellbutrin', 'lexapro', 'zoloft', 'prozac', 'citalopram'],
  Lungs: ['lung', 'respiratory', 'breath', 'asthma', 'copd', 'cough', 'spo2', 'oxygen', 'pneumonia', 'chest x-ray', 'bronchial', 'inhaler', 'nebulizer', 'spirometry', 'pulmonary', 'tuberculosis', 'pleural', 'ventilator', 'dyspnea', 'wheezing'],
  Digestive: ['stomach', 'gut', 'gi', 'digestive', 'colon', 'liver', 'gallbladder', 'abdominal', 'nausea', 'vomiting', 'heartburn', 'gastritis', 'ulcer', 'crohn', 'colitis', 'endoscopy', 'colonoscopy', 'pancreas', 'hepatitis', 'cirrhosis', 'gerd', 'reflux', 'bowel', 'ibs'],
  Blood: ['blood', 'hemoglobin', 'cbc', 'wbc', 'rbc', 'platelet', 'anemia', 'glucose', 'sugar', 'diabetic', 'insulin', 'hba1c', 'leukemia', 'lymphoma', 'coagulation', 'transfusion', 'sickle', 'thalassemia', 'hematocrit', 'ferritin', 'iron'],
  Brain: ['brain', 'neuro', 'seizure', 'epilepsy', 'headache', 'migraine', 'stroke', 'concussion', 'memory', 'cognitive', 'neuropathy', 'parkinson', 'alzheimer', 'dementia', 'tremor', 'vertigo', 'meningitis', 'cerebral', 'eeg'],
  Skin: ['skin', 'derma', 'rash', 'lesion', 'mole', 'acne', 'eczema', 'psoriasis', 'burn', 'wound', 'melanoma', 'hives', 'urticaria', 'fungal', 'cellulitis', 'biopsy skin', 'pruritus', 'vitiligo', 'wart'],
  General: ['vitals', 'visit', 'consult', 'note', 'follow up', 'checkup', 'general', 'primary', 'routine', 'annual', 'wellness', 'screening', 'physical exam']
};

const SYSTEM_ICONS: Record<BodySystem, string> = {
  Heart: '❤',
  Bones: '🦴',
  Mental: '🧠',
  Lungs: '🫁',
  Digestive: '🍕',
  Blood: '🩸',
  Brain: '⚡',
  Skin: '🧴',
  General: '📄'
};

/**
 * Categorizes a clinical record based on its title and description.
 */
export function categorizeRecord(title: string, subtitle?: string): CategorizedRecord {
  const text = `${title} ${subtitle || ''}`.toLowerCase();
  
  let bestMatch: BodySystem = 'General';
  let maxHits = 0;

  for (const [system, keywords] of Object.entries(SYSTEM_KEYWORDS)) {
    const hits = keywords.filter(kw => text.includes(kw)).length;
    if (hits > maxHits) {
      maxHits = hits;
      bestMatch = system as BodySystem;
    }
  }

  // Heuristic: If it has "BP" or "Heart Rate", it's Heart even if other things match
  if (text.includes('bp') || text.includes('heart rate') || text.includes('cardio')) {
    bestMatch = 'Heart';
  }

  return {
    system: bestMatch,
    confidence: maxHits > 0 ? 0.9 : 0.5,
    icon: SYSTEM_ICONS[bestMatch]
  };
}

/**
 * AI-Driven Recommendation: Maps Doctor Specialization to recommended Body Systems.
 * Ensures the 'AI decides' logic for data minimization.
 */
export function getRecommendedSystemsBySpecialty(specialty: string): BodySystem[] {
  const s = specialty.toLowerCase();
  
  if (s.includes('cardio')) return ['Heart', 'Blood', 'Lungs', 'General'];
  if (s.includes('ortho') || s.includes('bone')) return ['Bones', 'Skin', 'General'];
  if (s.includes('neuro')) return ['Brain', 'Mental', 'General'];
  if (s.includes('psych')) return ['Mental', 'Brain', 'General'];
  if (s.includes('gastro') || s.includes('digest')) return ['Digestive', 'Blood', 'General'];
  if (s.includes('derma') || s.includes('skin')) return ['Skin', 'General'];
  if (s.includes('pulmo') || s.includes('lung') || s.includes('respir')) return ['Lungs', 'Heart', 'General'];
  if (s.includes('nephro')) return ['Blood', 'General'];
  if (s.includes('oncology') || s.includes('cancer')) return ['Blood', 'General', 'Heart', 'Lungs', 'Digestive'];
  
  // High-stakes or wide-scope specialties get everything by default
  if (
    s.includes('emergency') || 
    s.includes('general') || 
    s.includes('primary') || 
    s.includes('internal') ||
    s.includes('surgeon')
  ) {
    return ['Heart', 'Bones', 'Mental', 'Lungs', 'Digestive', 'Blood', 'Brain', 'Skin', 'General'];
  }

  // Default fallback for unknown specialties
  return ['General'];
}
