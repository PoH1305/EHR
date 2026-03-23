'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Mail, Lock, LogIn, Loader2, Shield } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { auth, googleProvider } from '@/lib/firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'

export default function DoctorAuthPage() {
  const router = useRouter()
  const [user, loading] = useAuthState(auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [license, setLicense] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  
  const { 
    setSessionState, 
    updateLastActive, 
    patient, 
    _hasHydrated,
    setFirebaseUser,
    setRole
  } = useUserStore()

  // Sync Firebase state with Zustand
  useEffect(() => {
    if (user) {
      setFirebaseUser(user.uid, user.email)
      setSessionState('AUTHENTICATED')
      setRole('doctor')
      updateLastActive()
    }
  }, [user, setFirebaseUser, setSessionState, updateLastActive, setRole])

  // Navigation Logic
  useEffect(() => {
    if (_hasHydrated && user && !loading) {
      // For doctors, we might not have a "patient" profile but we check role
      setTimeout(() => router.replace('/dashboard'), 1500)
    }
  }, [_hasHydrated, user, loading, router])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setAuthError(null)

    try {
      if (isSignUp) {
        if (license.length < 5) {
          throw new Error('Please enter a valid medical license number')
        }
        await createUserWithEmailAndPassword(auth, email, password)
        // Note: License would ideally be saved to a 'doctors' collection in Firestore/DB
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsProcessing(true)
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading || (user && _hasHydrated)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-[#1A3A8F] animate-spin mb-4" />
        <p className="text-sm text-[#4A6075]">Verifying Clinical Credentials...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col pt-12 pb-6 px-6 sm:px-12 max-w-md mx-auto w-full">
      <div className="w-10 h-10 rounded-[11px] bg-[#1A3A8F] flex items-center justify-center text-white font-bold text-sm mb-10">
        EHI
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
        <h1 className="text-3xl font-medium text-[#E2EAF0] leading-tight mb-2">
          {isSignUp ? 'Clinical Portal' : 'Doctor Login'}
        </h1>
        <p className="text-xs text-[#4A6075] mb-10">Secure interface for medical practitioners.</p>

        <form onSubmit={handleEmailAuth} className="space-y-6">
          {isSignUp && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#354A5A] font-semibold">Medical License No.</label>
              <div className="flex items-center gap-3 border-b border-white/[0.08] pb-2 mt-2">
                <Shield className="w-4 h-4 text-[#4A6075]" />
                <input 
                  type="text" 
                  value={license} 
                  onChange={e => setLicense(e.target.value.toUpperCase())} 
                  required
                  className="bg-transparent border-none outline-none text-base text-[#E2EAF0] flex-1" 
                  placeholder="MCI-2019-XXXX" 
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#354A5A] font-semibold">Official Email</label>
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-2 mt-2">
              <Mail className="w-4 h-4 text-[#4A6075]" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required
                className="bg-transparent border-none outline-none text-base text-[#E2EAF0] flex-1" 
                placeholder="doctor@hospital.com" 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#354A5A] font-semibold">Password</label>
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-2 mt-2">
              <Lock className="w-4 h-4 text-[#4A6075]" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
                className="bg-transparent border-none outline-none text-base text-[#E2EAF0] flex-1" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          {authError && (
            <p className="text-[10px] text-red-400 bg-red-400/5 border border-red-400/10 rounded-lg p-2">
              {authError}
            </p>
          )}

          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 rounded-xl bg-[#1A3A8F] text-white font-medium text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isSignUp ? 'Create Doctor Account' : 'Sign In as Practitioner'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.05]" /></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#080D16] px-2 text-[#354A5A]">or</span></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={isProcessing}
          className="w-full py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[#E2EAF0] font-medium text-sm hover:bg-white/[0.05] transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Clinical Google Login
        </button>

        <div className="mt-auto pt-10 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] uppercase tracking-widest text-[#4A6075] hover:text-[#1A3A8F] transition-colors"
          >
            {isSignUp ? 'Back to Practitioner Sign In' : "New clinical portal user? Join now"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
