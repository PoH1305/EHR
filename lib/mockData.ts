/**
 * Mock Data — Deprecated for Production
 * This file is now empty to ensure no hardcoded data is used in the final build.
 */

import {
  type PatientProfile,
  type VitalSeries,
  type AuditEvent,
  type ConsentToken,
  type FHIRBundle,
} from '@/lib/types'
import type { Condition, MedicationRequest, AllergyIntolerance } from 'fhir/r4'

export const MOCK_PATIENT: PatientProfile | null = null
export const MOCK_VITALS: VitalSeries[] = []
export const MOCK_CONDITIONS: Condition[] = []
export const MOCK_MEDICATIONS: MedicationRequest[] = []
export const MOCK_ALLERGIES: AllergyIntolerance[] = []
export const MOCK_AUDIT_EVENTS: AuditEvent[] = []
export const MOCK_CONSENT_TOKENS: ConsentToken[] = []
export const MOCK_FHIR_BUNDLE: FHIRBundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [],
}
