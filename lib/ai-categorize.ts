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
  Heart: ['ecg', 'cardio', 'heart', 'bp', 'blood pressure', 'pulse', 'tachycardia', 'bradycardia', 'murmur', 'vessel', 'cholesterol', 'lipid', 'statin', 'atv'],
  Bones: ['bone', 'fracture', 'ortho', 'joint', 'spine', 'vertebra', 'x-ray', 'mri bone', 'cast', 'calcium', 'knee', 'hip', 'shoulder'],
  Mental: ['anxiety', 'depression', 'therapy', 'psych', 'mood', 'mental', 'stress', 'session', 'counseling', 'behavioral', 'adhd', 'ptsd'],
  Lungs: ['lung', 'respiratory', 'breath', 'asthma', 'copd', 'cough', 'spo2', 'oxygen', 'pneumonia', 'chest x-ray', 'bronchial'],
  Digestive: ['stomach', 'gut', 'gi', 'digestive', 'colon', 'liver', 'gallbladder', 'abdominal', 'nausea', 'vomiting', 'heartburn'],
  Blood: ['blood', 'hemoglobin', 'cbc', 'wbc', 'rbc', 'platelet', 'anemia', 'glucose', 'sugar', 'diabetic', 'insulin', 'hba1c'],
  Brain: ['brain', 'neuro', 'seizure', 'epilepsy', 'headache', 'migraine', 'stroke', 'concussion', 'memory', 'cognitive'],
  Skin: ['skin', 'derma', 'rash', 'lesion', 'mole', 'acne', 'eczema', 'psoriasis', 'burn', 'wound'],
  General: ['vitals', 'visit', 'consult', 'note', 'follow up', 'checkup', 'general', 'primary']
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
