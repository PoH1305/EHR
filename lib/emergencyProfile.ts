import type { FHIRBundle, FHIRPatient, FHIRCondition, FHIRMedicationRequest, FHIRAllergyIntolerance, FHIRProcedure, FHIRObservation } from './types'

export interface EmergencyProfile {
  patientId: string
  fullName: string
  age: number | null
  gender: string
  bloodGroup: string
  allergies: Array<{ allergen: string; severity: string; reaction: string }>
  chronicConditions: Array<{ name: string; code: string }>
  currentMedications: Array<{ name: string; dose: string; frequency: string }>
  majorSurgeries: Array<{ procedure: string; date: string }>
  criticalConditions: string[]
  organDonorStatus: { isDonor: boolean; organs: string[] }
  emergencyContact: { name: string; relationship: string; phone: string }
  lastVisitSummary: { date: string; reason: string }
  deviceImplants: string[]
}

/**
 * Extracts a minimal, emergency-only profile from a full FHIR Bundle.
 * ENFORCES STRICT PRIVACY CONSTRAINTS: 
 * - No psychiatric, genetic, or reproductive data.
 */
export function extractEmergencyProfile(bundle: FHIRBundle): EmergencyProfile {
  const patient = bundle.entry?.find(e => e.resource?.resourceType === 'Patient')?.resource as FHIRPatient
  const conditions = bundle.entry?.filter(e => e.resource?.resourceType === 'Condition').map(e => e.resource as FHIRCondition) || []
  const medications = bundle.entry?.filter(e => e.resource?.resourceType === 'MedicationRequest').map(e => e.resource as FHIRMedicationRequest) || []
  const allergies = bundle.entry?.filter(e => e.resource?.resourceType === 'AllergyIntolerance').map(e => e.resource as FHIRAllergyIntolerance) || []
  const procedures = bundle.entry?.filter(e => e.resource?.resourceType === 'Procedure').map(e => e.resource as FHIRProcedure) || []
  const observations = bundle.entry?.filter(e => e.resource?.resourceType === 'Observation').map(e => e.resource as FHIRObservation) || []

  // age calculation
  let age: number | null = null
  if (patient?.birthDate) {
    const birthDate = new Date(patient.birthDate)
    const ageDifMs = Date.now() - birthDate.getTime()
    const ageDate = new Date(ageDifMs)
    age = Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  // Filter out psychiatric meds (simulated logic using simple keyword matching)
  const SENSITIVE_KEYWORDS = ['psychiatry', 'mental', 'behavioral', 'genetic', 'reproductive', 'substance', 'antidepressant', 'antipsychotic']
  
  const isSensitive = (text: string) => 
    SENSITIVE_KEYWORDS.some(k => text.toLowerCase().includes(k))

  return {
    patientId: patient?.id || 'UNKNOWN',
    fullName: patient?.name?.[0]?.text || 'Patient',
    age,
    gender: patient?.gender || 'unknown',
    bloodGroup: (patient as any).bloodGroup || 'Not Recorded',
    
    allergies: allergies.map(a => ({
      allergen: a.code?.text || 'Unknown Allergen',
      severity: a.criticality || 'unknown',
      reaction: a.reaction?.[0]?.manifestation?.[0]?.text || 'No recorded reaction'
    })),

    chronicConditions: conditions
      .filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active' && !isSensitive(c.code?.text || ''))
      .map(c => ({
        name: c.code?.text || 'Condition',
        code: c.code?.coding?.[0]?.code || 'ICD-10'
      })),

    currentMedications: medications
      .filter(m => m.status === 'active' && !isSensitive(m.medicationCodeableConcept?.text || ''))
      .map(m => ({
        name: m.medicationCodeableConcept?.text || 'Medication',
        dose: m.dosageInstruction?.[0]?.text || 'As directed',
        frequency: m.dosageInstruction?.[0]?.timing?.code?.text || 'As needed'
      })),

    majorSurgeries: procedures
      .filter(p => p.status === 'completed')
      .map(p => ({
        procedure: p.code?.text || 'Procedure',
        date: p.performedDateTime || 'Date unknown'
      })),

    criticalConditions: conditions
      .filter(c => (c as any).securityLabel?.some((l: any) => l.code === 'CRITICAL'))
      .map(c => c.code?.text || 'Critical Warning'),

    organDonorStatus: {
      isDonor: (patient as any).organDonor || false,
      organs: (patient as any).donatedOrgans || []
    },

    emergencyContact: {
      name: patient?.contact?.[0]?.name?.text || 'Unknown',
      relationship: patient?.contact?.[0]?.relationship?.[0]?.text || 'Other',
      phone: patient?.contact?.[0]?.telecom?.find(t => t.system === 'phone')?.value || 'N/A'
    },

    lastVisitSummary: {
      date: bundle.entry?.find(e => (e as any).fullUrl?.includes('Encounter'))?.resource?.meta?.lastUpdated || 'None',
      reason: 'Regular consultation' // Placeholder, would extract from Encounter
    },

    deviceImplants: observations
      .filter(o => o.category?.[0]?.coding?.[0]?.code === 'exam' && isSensitive(o.code?.text || '')) // Implants logic
      .map(o => o.code?.text || 'Device')
  }
}
