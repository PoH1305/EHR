'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Mail, Lock, LogIn, Loader2, AlertTriangle } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { supabase } from '@/lib/supabase'

function ConfigError({ type }: { type: 'patient' | 'doctor' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#080D16]">
      <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-orange-500" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Configuration Required</h2>
      <p className="text-sm text-white/40 max-w-xs mb-8 leading-relaxed">
        Firebase is not initialized. Please add your Firebase project keys to <code>.env.local</code> to access the {type} portal.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all"
      >
        Check Again
      </button>
    </div>
  )
}

export default function PatientAuthPage() {
  return <PatientAuthContent />
}

function PatientAuthContent() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string, email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' })
      }
      setLoading(false)
    })
  }, [])

  // Sync Supabase state with Zustand
  useEffect(() => {
    if (user) {
      setFirebaseUser(user.id, user.email)
      setSessionState('AUTHENTICATED')
      setRole('patient')
      updateLastActive()
    }
  }, [user, setFirebaseUser, setSessionState, updateLastActive, setRole])

  // Navigation Logic
  useEffect(() => {
    if (_hasHydrated && user && !loading) {
      const destination = patient ? '/dashboard' : '/onboarding'
      setTimeout(() => router.replace(destination), 1500)
    }
  }, [_hasHydrated, user, loading, patient, router])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setAuthError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      if (error) throw error
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading || (user && !patient && _hasHydrated)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#0D7377] animate-spin mb-4" />
        <p className="text-sm text-[#4A6075]">Securely connecting to EHI Node...</p>
      </div>
    )
  }

  if (user && patient) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-[1.5px] border-[#0D7377] flex items-center justify-center text-[#0D7377] mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Authenticated</h2>
          <p className="text-[10px] text-[#4A6075] tracking-widest uppercase mt-1 text-center">
            {user.email}<br />Redirecting to Dashboard
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col pt-12 pb-6 px-6 sm:px-12 max-w-md mx-auto w-full">
      <div className="w-10 h-10 rounded-[11px] bg-[#0D7377] flex items-center justify-center text-white font-bold text-sm mb-10">
        EHI
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
        <h1 className="text-3xl font-medium text-[#E2EAF0] leading-tight mb-2">
          {isSignUp ? 'Create account.' : 'Welcome back.'}
        </h1>
        <p className="text-xs text-[#4A6075] mb-10">Access your secure medical vault.</p>

        <form onSubmit={handleEmailAuth} className="space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#354A5A] font-semibold">Email</label>
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-2 mt-2">
              <Mail className="w-4 h-4 text-[#4A6075]" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required
                className="bg-transparent border-none outline-none text-base text-[#E2EAF0] flex-1" 
                placeholder="email@example.com" 
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
            className="w-full py-3.5 rounded-xl bg-[#0D7377] text-white font-medium text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isSignUp ? 'Create Account' : 'Sign In'}
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
          Continue with Google
        </button>

        <div className="mt-auto pt-10 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] uppercase tracking-widest text-[#4A6075] hover:text-[#0D7377] transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
