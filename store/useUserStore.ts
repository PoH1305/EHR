'use client'

/**
 * User Store — Patient profile, crypto keys, auth state.
 * See Section 12 specification.
 */

import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { PatientProfile } from '@/lib/types'

export type SessionState = 'UNAUTHENTICATED' | 'AUTHENTICATED'
export type UserRole = 'patient' | 'doctor' | null

interface UserState {
  role: UserRole
  patient: PatientProfile | null
  dataKey: CryptoKey | null
  publicKey: CryptoKey | null
  privateKey: CryptoKey | null
  sessionState: SessionState
  lastActiveAt: number | null
  isLoading: boolean
  lastSyncAt: string | null
  healthId: string | null
  firebaseUid: string | null
  firebaseEmail: string | null
  isAddPatientOpen: boolean
  isProfileRestoring: boolean
  _hasHydrated: boolean
}

interface UserActions {
  setRole: (role: UserRole) => void
  initializeKeys: () => Promise<void>
  setPatient: (profile: PatientProfile) => void
  setFirebaseUser: (uid: string | null, email: string | null) => void
  setIsAddPatientOpen: (val: boolean) => void
  signOut: () => void
  setSessionState: (state: SessionState) => void
  updateLastActive: () => void
  updatePatient: (profile: Partial<PatientProfile>) => void
  loadPatient: (id: string) => Promise<void>
  deleteAccount: () => Promise<void>
  setHasHydrated: (val: boolean) => void
  syncProfileToCloud: () => Promise<void>
  fetchProfileFromCloud: () => Promise<void>
  checkHealthIdUnique: (healthId: string) => Promise<boolean>
}

import { db } from '@/lib/db'

export const useUserStore = create<UserState & UserActions>()(
  devtools(
    persist(
      immer((set, get) => ({
      // State
      role: null,
      patient: null,
      dataKey: null,
      publicKey: null,
      privateKey: null,
      sessionState: 'UNAUTHENTICATED',
      lastActiveAt: null,
      isLoading: false,
      lastSyncAt: null,
      healthId: null,
      firebaseUid: null,
      firebaseEmail: null,
      isAddPatientOpen: false,
      isProfileRestoring: false,
      _hasHydrated: false,

      // Actions
      setRole: (role: UserRole) => {
        set((state) => {
          state.role = role
        })
        if (typeof window !== 'undefined') {
          if (role) {
            document.cookie = `medVault-user-role=${role}; path=/; max-age=86400; SameSite=Lax`
          } else {
            document.cookie = `medVault-user-role=; path=/; max-age=0`
          }
        }
      },


      initializeKeys: async () => {
        set((state) => {
          state.isLoading = true
        })

        try {
          const { generateDataKey, generatePatientKeyPair } = await import('@/lib/crypto')
          const dataKey = await generateDataKey()
          const { publicKey, privateKey } = await generatePatientKeyPair()

          set((state) => {
            state.dataKey = dataKey
            state.publicKey = publicKey
            state.privateKey = privateKey
            state.isLoading = false
          })
        } catch (error) {
          console.error('Failed to initialize keys:', error)
          set((state) => {
            state.isLoading = false
          })
        }
      },

      setPatient: (profile: PatientProfile) => {
        set((state) => {
          state.patient = profile
          state.healthId = profile.healthId
        })
        if (typeof window !== 'undefined' && db) {
          void db.patient_profiles.put(profile)
        }
        void get().syncProfileToCloud()
      },

      loadPatient: async (id: string) => {
        if (typeof window === 'undefined' || !db) return
        const profile = await db.patient_profiles.get(id)
        if (profile) {
          set((state) => {
            state.patient = profile
            state.healthId = profile.healthId
          })
        }
      },

      deleteAccount: async () => {
        const { db } = await import('@/lib/db')
        if (!db) return

        try {
          // Clear all tables
          await Promise.all([
            db.patient_profiles.clear(),
            db.vitals.clear(),
            db.conditions.clear(),
            db.medications.clear(),
            db.allergies.clear(),
            db.observations.clear(),
            db.diagnostic_reports.clear(),
            db.immunizations.clear(),
            db.procedures.clear(),
            db.clinical_notes.clear(),
            db.medical_images.clear(),
            db.patient_attachments.clear(),
            db.risk_analysis.clear(),
            db.consent_tokens.clear(),
            db.audit_log.clear(),
            db.access_requests.clear(),
            db.temporary_records.clear()
          ])

          // Reset local state
          set((state) => {
            state.patient = null
            state.sessionState = 'UNAUTHENTICATED'
            state.role = 'patient'
            state.lastActiveAt = Date.now()
            state.firebaseUid = null
            state.firebaseEmail = null
            state.healthId = null
          })
        } catch (error) {
          console.error('Failed to delete account:', error)
          throw error
        }
      },

      signOut: () => {
        set((state) => {
          state.role = null
          state.patient = null
          state.dataKey = null
          state.publicKey = null
          state.privateKey = null
          state.sessionState = 'UNAUTHENTICATED'
          state.firebaseUid = null
          state.firebaseEmail = null
          state.healthId = null
          state.lastActiveAt = null
        })
      },

      setFirebaseUser: (uid, email) => {
        set((state) => {
          state.firebaseUid = uid
          state.firebaseEmail = email
        })
      },

      setIsAddPatientOpen: (val) => {
        set((state) => {
          state.isAddPatientOpen = val
        })
      },

      setSessionState: (sessionState: SessionState) => {
        set((state) => {
          state.sessionState = sessionState
        })
      },

      updateLastActive: () => {
        set((state) => {
          state.lastActiveAt = Date.now()
        })
      },

      updatePatient: (profile) => {
        set((state) => {
          if (state.patient) {
            state.patient = { ...state.patient, ...profile }
            state.healthId = state.patient.healthId
            if (db) void db.patient_profiles.update(state.patient.id, profile)
          }
        })
        void get().syncProfileToCloud()
      },
      setHasHydrated: (val) => {
        set({ _hasHydrated: val })
      },
      syncProfileToCloud: async () => {
        const { patient, firebaseUid } = get()
        if (!patient || !firebaseUid) return

        try {
          const { supabase } = await import('@/lib/supabase')
          const { data, error } = await supabase
            .from('profiles')
            .upsert({
              id: firebaseUid,
              health_id: patient.healthId,
              data: patient
            })

          if (error) throw error
          console.log('[UserStore] Profile synced to Supabase')
        } catch (error) {
          console.error('[UserStore] Failed to sync profile to Supabase:', error)
        }
      },
      fetchProfileFromCloud: async () => {
        const { firebaseUid, patient, isProfileRestoring } = get()
        if (!firebaseUid || patient || isProfileRestoring) return

        set((state) => { state.isProfileRestoring = true })
        console.log('[UserStore] Starting cloud profile restoration...')

        try {
          const { supabase } = await import('@/lib/supabase')
          const { data, error } = await supabase
            .from('profiles')
            .select('data')
            .eq('id', firebaseUid)
            .maybeSingle()

          if (error) {
            console.error('[UserStore] Error fetching cloud profile:', error)
            throw error
          }

          if (data && data.data) {
            const cloudProfile = data.data as PatientProfile
            set((state) => {
              state.patient = cloudProfile
              state.healthId = cloudProfile.healthId
              // Only set role to patient if it's currently null or already patient
              if (state.role !== 'doctor') {
                state.role = 'patient'
              }
            })
            if (db) void db.patient_profiles.put(cloudProfile)
            console.log('[UserStore] Profile successfully restored from Supabase')
          }
        } catch (error) {
          console.error('[UserStore] Cloud profile restoration failed:', error)
        } finally {
          set((state) => { state.isProfileRestoring = false })
        }
      },
      checkHealthIdUnique: async (healthId: string) => {
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('profiles')
          .select('health_id')
          .eq('health_id', healthId)
          .maybeSingle()

        if (error) throw error
        return !data
      },
    })),
    { 
      name: 'ehi-user-storage',
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          if (typeof window === 'undefined') return null
          try {
            return localStorage.getItem(name)
          } catch (e) {
            console.warn('[UserStore] Failed to read from localStorage:', e)
            return null
          }
        },
        setItem: (name: string, value: string) => {
          if (typeof window === 'undefined') return
          try {
            localStorage.setItem(name, value)
          } catch (e) {
            console.warn('[UserStore] Failed to write to localStorage:', e)
          }
        },
        removeItem: (name: string) => {
          if (typeof window === 'undefined') return
          try {
            localStorage.removeItem(name)
          } catch (e) {
            console.warn('[UserStore] Failed to remove from localStorage:', e)
          }
        },
      })),
      onRehydrateStorage: (state) => {
        // Safety: mark as hydrated session-wise even if error occurs
        const timeout = setTimeout(() => {
          if (state && !state._hasHydrated) {
            console.warn('[UserStore] Hydration timeout reached, forcing state ready.')
            state.setHasHydrated(true)
          }
        }, 3000)

        return (rehydratedState, error) => {
          clearTimeout(timeout)
          if (error) {
            console.error('[UserStore] Error during rehydration:', error)
          }
          if (rehydratedState) {
            rehydratedState.setHasHydrated(true)
          } else if (state) {
            state.setHasHydrated(true)
          }
        }
      },
      partialize: (state) => ({ 
        role: state.role, 
        patient: state.patient, 
        healthId: state.healthId,
        firebaseUid: state.firebaseUid,
        firebaseEmail: state.firebaseEmail,
        sessionState: state.sessionState,
      }) 
    }
  ),
  { name: 'UserStore' }
)
)
