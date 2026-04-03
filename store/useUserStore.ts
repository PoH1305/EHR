'use client'

/**
 * User Store — Patient profile, crypto keys, auth state.
 * See Section 12 specification.
 */

import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { PatientProfile, DoctorProfile } from '@/lib/types'

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
  doctor: DoctorProfile | null
  isAddPatientOpen: boolean
  isProfileRestoring: boolean
  _hasHydrated: boolean
}

interface UserActions {
  setRole: (role: UserRole) => void
  initializeKeys: () => Promise<void>
  setPatient: (profile: PatientProfile) => void
  setFirebaseUser: (uid: string | null, email: string | null) => void
  setDoctor: (profile: DoctorProfile) => void
  setIsAddPatientOpen: (val: boolean) => void
  signOut: () => void
  setSessionState: (state: SessionState) => void
  updateLastActive: () => void
  updatePatient: (profile: Partial<PatientProfile>) => void
  updateDoctor: (profile: Partial<DoctorProfile>) => void
  loadPatient: (id: string) => Promise<void>
  deleteAccount: () => Promise<void>
  setHasHydrated: (val: boolean) => void
  syncProfileToCloud: () => Promise<void>
  fetchProfileFromCloud: () => Promise<void>
  fetchDoctorProfile: (id: string) => Promise<void>
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
      doctor: null,
      isAddPatientOpen: false,
      isProfileRestoring: false,
      _hasHydrated: false,

      // Actions
      setRole: (role: UserRole) => {
        set((state) => {
          state.role = role
          // If switching to doctor, clear any patient-related state
          if (role === 'doctor') {
            state.patient = null
            state.healthId = null
          } else if (role === 'patient') {
            state.doctor = null
          }
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
        const { firebaseUid, role } = get()
        if (!db || !firebaseUid) return

        try {
          // 1. Client-side Firestore Deletion (Authenticated)
          if (role === 'doctor') {
            const { db_firestore } = await import('@/lib/firebase')
            const { doc, deleteDoc } = await import('firebase/firestore')
            if (db_firestore) {
              const docRef = doc(db_firestore, 'doctors', firebaseUid)
              try {
                await deleteDoc(docRef)
                console.log('[UserStore] Firestore doctor profile erased')
              } catch (fsError) {
                console.warn('[UserStore] Firestore erasure failed (likely non-existent doc):', fsError)
              }
            }
          }

          // 2. Backend Deletion (Cross-platform cleanup)
          const response = await fetch('/api/auth/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: firebaseUid, role })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to erase clinical identity from cloud')
          }

          // 2. Clear Local IndexedDB tables
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

          // 3. Reset local store state
          set((state) => {
            state.patient = null
            state.doctor = null
            state.sessionState = 'UNAUTHENTICATED'
            state.role = role === 'doctor' ? 'doctor' : 'patient' // Keep role context for redirect if needed
            state.lastActiveAt = Date.now()
            state.firebaseUid = null
            state.firebaseEmail = null
            state.healthId = null
          })

          console.log('[UserStore] Clinical identity completely erased')
          
          // 4. Final Logout & Redirect
          await get().signOut()
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          }
        } catch (error) {
          console.error('[UserStore] Failed to delete account:', error)
          throw error
        }
      },

      signOut: async () => {
        try {
          const { auth } = await import('@/lib/firebase')
          if (auth) await auth.signOut()
        } catch (e) {
          console.error('[UserStore] Firebase signout failed:', e)
        }

        set((state) => {
          state.role = null
          state.sessionState = 'UNAUTHENTICATED'
          state.firebaseUid = null
          state.firebaseEmail = null
          state.doctor = null
          state.lastActiveAt = null
          // Note: we keep 'patient' and 'healthId' to allow "Continue where you left off"
          // the middleware and auth guards will still block access until re-authentication
        })

        if (typeof window !== 'undefined') {
          document.cookie = 'medVault-user-role=; path=/; max-age=0'
        }
      },

      setFirebaseUser: (uid, email) => {
        set((state) => {
          state.firebaseUid = uid
          state.firebaseEmail = email
        })
      },
      
      setDoctor: (profile) => {
        set((state) => {
          state.doctor = profile
          state.role = 'doctor' // Ensure role is set for correct cloud sync
        })
        void get().syncProfileToCloud()
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
      updateDoctor: (profile) => {
        set((state) => {
          if (state.doctor) {
            state.doctor = { ...state.doctor, ...profile }
          }
        })
        void get().syncProfileToCloud()
      },
      setHasHydrated: (val: boolean) => {
        set({ _hasHydrated: val })
      },
      syncProfileToCloud: async () => {
        const { patient, firebaseUid, role, doctor } = get()
        if (!firebaseUid) return
        
        // Ensure we handle case where role might be unset but profile exists
        const effectiveRole = role || (doctor ? 'doctor' : (patient ? 'patient' : null))
        if (!effectiveRole) return
        
        if (effectiveRole === 'patient' && !patient) return
        if (effectiveRole === 'doctor' && !doctor) return

        try {
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) return
          
          // Determine data and healthId based on role
          const targetRole = role || (doctor ? 'doctor' : (patient ? 'patient' : null))
          if (!targetRole) return

          const syncData = targetRole === 'doctor' ? doctor : patient
          const syncHealthId = targetRole === 'doctor' ? `DOC-${firebaseUid}` : patient?.healthId

          if (!syncData) return

          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: firebaseUid,
              health_id: syncHealthId,
              data: syncData
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
      fetchDoctorProfile: async (id: string) => {
        try {
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) return
          
          const { data, error } = await supabase
            .from('profiles')
            .select('data')
            .eq('id', id)
            .maybeSingle()
          
          if (!error && data && data.data) {
            const docProfile = data.data as DoctorProfile
            set((state) => {
              state.doctor = docProfile
              state.role = 'doctor'
            })
            return
          }

          // Fallback to Firestore if not found in Supabase
          console.log('[UserStore] Doctor profile not in Supabase, checking Firestore...')
          const { db_firestore } = await import('@/lib/firebase')
          const { doc, getDoc } = await import('firebase/firestore')
          
          if (db_firestore) {
            const docRef = doc(db_firestore, 'doctors', id)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) {
              const docData = docSnap.data() as DoctorProfile
              console.log('[UserStore] Migrating doctor profile from Firestore to Supabase')
              // This will trigger syncProfileToCloud() automatically via setDoctor
              get().setDoctor(docData)
            }
          }
        } catch (error) {
          console.error('[UserStore] Failed to fetch doctor profile:', error)
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
        doctor: state.doctor,
        sessionState: state.sessionState,
      }) 
    }
  ),
  { name: 'UserStore' }
)
)
