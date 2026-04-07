'use client'

/**
 * EHI Store — FHIR records, vitals, conditions, medications, search.
 * See Section 12 specification.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  FHIRBundle,
  FilteredFHIRBundle,
  FHIRResource,
} from '@/lib/types'
import type { Condition, MedicationRequest, AllergyIntolerance, DiagnosticReport } from 'fhir/r4'

interface EHIState {
  records: FHIRBundle | null
  filteredRecords: FilteredFHIRBundle | null
  conditions: Condition[]
  medications: MedicationRequest[]
  allergies: AllergyIntolerance[]
  recentLabs: DiagnosticReport[]
  isLoadingRecords: boolean
  recordsError: string | null
  lastFetchedAt: string | null
  searchQuery: string
  searchResults: FHIRResource[]
}

interface EHIActions {
  fetchRecords: (userId: string) => Promise<void>
  setRecords: (records: FHIRBundle) => void
  setFilteredRecords: (filtered: FilteredFHIRBundle) => void
  setConditions: (conditions: Condition[]) => void
  setMedications: (medications: MedicationRequest[]) => void
  setAllergies: (allergies: AllergyIntolerance[]) => void
  setSearchQuery: (query: string) => void
  clearSearch: () => void
}

import { db } from '@/lib/db'

export const useEHIStore = create<EHIState & EHIActions>()(
  devtools(
    immer((set) => ({
      // State
      records: null,
      filteredRecords: null,
      conditions: [],
      medications: [],
      allergies: [],
      recentLabs: [],
      isLoadingRecords: false,
      recordsError: null,
      lastFetchedAt: null,
      searchQuery: '',
      searchResults: [],

      // Actions
      fetchRecords: async (userId: string) => {
        set((state) => {
          state.isLoadingRecords = true
          state.recordsError = null
        })

        try {
          // In development, mock data logic is currently disabled due to missing dependency
          /*
          if (process.env.NODE_ENV === 'development') {
            const { MOCK_FHIR_BUNDLE, MOCK_CONDITIONS, MOCK_MEDICATIONS, MOCK_ALLERGIES, MOCK_VITALS } =
              await import('@/lib/mockData')

            // Sync to Dexie
            await db.transaction('rw', [db.vitals, db.conditions, db.medications, db.allergies], async () => {
              await db.conditions.where('patientId').equals(userId).delete()
              await db.medications.where('patientId').equals(userId).delete()
              await db.allergies.where('patientId').equals(userId).delete()
              
              await db.conditions.bulkAdd(MOCK_CONDITIONS.map(c => ({ ...c, patientId: userId })))
              await db.medications.bulkAdd(MOCK_MEDICATIONS.map(m => ({ ...m, patientId: userId })))
              await db.allergies.bulkAdd(MOCK_ALLERGIES.map(a => ({ ...a, patientId: userId })))
              
              // Seed vitals if empty
              const vCount = await db.vitals.where('patientId').equals(userId).count()
              if (vCount === 0) {
                await db.vitals.bulkAdd(MOCK_VITALS.map(v => ({ ...v, patientId: userId })))
              }
            })

            set((state) => {
              state.records = MOCK_FHIR_BUNDLE
              state.conditions = MOCK_CONDITIONS
              state.medications = MOCK_MEDICATIONS
              state.allergies = MOCK_ALLERGIES
              state.isLoadingRecords = false
              state.lastFetchedAt = new Date().toISOString()
            })
            return
          }
          */

          // Production: fetch from API and sync to Dexie
          const response = await fetch(`/api/fhir/records?userId=${userId}`)
          if (!response.ok) throw new Error('Failed to fetch records')

          const data = (await response.json()) as { bundle: FHIRBundle }
          
          // Logic to parse bundle and update Dexie would go here in a real app
          
          set((state) => {
            state.records = data.bundle
            state.isLoadingRecords = false
            state.lastFetchedAt = new Date().toISOString()
          })
        } catch (error) {
          set((state) => {
            state.recordsError = error instanceof Error ? error.message : 'Unknown error'
            state.isLoadingRecords = false
          })
        }
      },

      setRecords: (records: FHIRBundle) => {
        set((state) => {
          state.records = records
        })
      },

      setFilteredRecords: (filtered: FilteredFHIRBundle) => {
        set((state) => {
          state.filteredRecords = filtered
        })
      },

      setConditions: (conditions: Condition[]) => {
        set((state) => {
          state.conditions = conditions
        })
      },

      setMedications: (medications: MedicationRequest[]) => {
        set((state) => {
          state.medications = medications
        })
      },

      setAllergies: (allergies: AllergyIntolerance[]) => {
        set((state) => {
          state.allergies = allergies
        })
      },

      setSearchQuery: (query: string) => {
        set((state) => {
          state.searchQuery = query
        })
      },

      clearSearch: () => {
        set((state) => {
          state.searchQuery = ''
          state.searchResults = []
        })
      },
    })),
    { name: 'EHIStore' }
  )
)
