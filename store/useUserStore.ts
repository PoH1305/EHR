'use client'

/**
 * User Store — Patient profile, crypto keys, auth state.
 * See Section 12 specification.
 */

import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { PatientProfile } from '@/lib/types'

export type SessionState = 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'LOCKED' | 'SUSPENDED' | 'ALERT'
export type UserRole = 'patient' | 'doctor' | null

interface UserState {
  role: UserRole
  patient: PatientProfile | null
  dataKey: CryptoKey | null
  publicKey: CryptoKey | null
  privateKey: CryptoKey | null
  sessionState: SessionState
  failedAttempts: number
  lastActiveAt: number | null
  isLoading: boolean
  lastSyncAt: string | null
  healthId: string | null
  firebaseUid: string | null
  firebaseEmail: string | null
  isAddPatientOpen: boolean
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
  recordFailedAttempt: () => void
  resetFailedAttempts: () => void
  updateLastActive: () => void
  checkBackgroundLock: () => void
  updatePatient: (profile: Partial<PatientProfile>) => void
  loadPatient: (id: string) => Promise<void>
  deleteAccount: () => Promise<void>
  setHasHydrated: (val: boolean) => void
  syncProfileToCloud: () => Promise<void>
  fetchProfileFromCloud: () => Promise<void>
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
      failedAttempts: 0,
      lastActiveAt: null,
      isLoading: false,
      lastSyncAt: null,
      healthId: null,
      firebaseUid: null,
      firebaseEmail: null,
      isAddPatientOpen: false,
      _hasHydrated: false,

      // Actions
      setRole: (role: UserRole) => {
        set((state) => {
          state.role = role
        })
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
            state.sessionState = 'UNAUTHENTICATED' // Changed from LOCKED for fresh start
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
          state.failedAttempts = 0
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

      recordFailedAttempt: () => {
        set((state) => {
          state.failedAttempts += 1
          if (state.failedAttempts >= 3) {
            state.sessionState = 'SUSPENDED'
          }
        })
      },

      resetFailedAttempts: () => {
        set((state) => {
          state.failedAttempts = 0
        })
      },

      updateLastActive: () => {
        set((state) => {
          state.lastActiveAt = Date.now()
        })
      },

      checkBackgroundLock: () => {
        const { lastActiveAt, sessionState } = get()
        if (sessionState === 'AUTHENTICATED' && lastActiveAt) {
          const elapsed = Date.now() - lastActiveAt
          // 5 minutes timer
          if (elapsed > 5 * 60 * 1000) {
            set((state) => {
              state.sessionState = 'LOCKED'
            })
          }
        }
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
          const { db_firestore } = await import('@/lib/firebase')
          const { doc, setDoc } = await import('firebase/firestore')
          if (db_firestore) {
            await setDoc(doc(db_firestore, 'patients', firebaseUid), patient, { merge: true })
            console.log('[UserStore] Profile synced to Firestore')
          }
        } catch (error) {
          console.error('[UserStore] Failed to sync profile to Cloud:', error)
        }
      },
      fetchProfileFromCloud: async () => {
        const { firebaseUid, patient } = get()
        if (!firebaseUid || patient) return

        try {
          const { db_firestore } = await import('@/lib/firebase')
          const { doc, getDoc } = await import('firebase/firestore')
          if (db_firestore) {
            const snap = await getDoc(doc(db_firestore, 'patients', firebaseUid))
            if (snap.exists()) {
              const cloudProfile = snap.data() as PatientProfile
              set((state) => {
                state.patient = cloudProfile
                state.healthId = cloudProfile.healthId
                state.role = 'patient'
              })
              if (db) void db.patient_profiles.put(cloudProfile)
              console.log('[UserStore] Profile restored from Firestore')
            }
          }
        } catch (error) {
          console.error('[UserStore] Failed to fetch profile from Cloud:', error)
        }
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
        sessionState: state.sessionState === 'AUTHENTICATED' ? 'LOCKED' : state.sessionState,
        lastActiveAt: state.lastActiveAt,
      }) 
    }
  ),
  { name: 'UserStore' }
)
)
