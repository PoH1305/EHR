'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  LayoutDashboard,
  LayoutGrid,
  FolderOpen, 
  Clock, 
  User, 
  Search, 
  Users, 
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommandPalette } from './CommandPalette'
import { EmergencyBanner } from './EmergencyBanner'
import AddPatientModal from './doctor/AddPatientModal'
import EmergencyOverrideModal from './doctor/EmergencyOverrideModal'
import RequestNotification from './RequestNotification'
import { useUserStore } from '@/store/useUserStore'
import { useAgentStore } from '@/store/useAgentStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useToast } from '@/store/useToast'
import { motion, AnimatePresence } from 'framer-motion'

const PATIENT_NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/records', label: 'Records', icon: FolderOpen },
  { href: '/activity', label: 'Activity', icon: Clock },
  { href: '/profile', label: 'Profile', icon: User },
]

const DOCTOR_NAV = [
  { href: '/dashboard', label: 'HOME', icon: LayoutGrid },
  { href: '/patients', label: 'PATIENTS', icon: Users },
  { href: '/doctor/profile', label: 'PROFILE', icon: User },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [emergencyExpiresAt, setEmergencyExpiresAt] = useState<string | null>(null)
  const { 
    sessionState, 
    role, 
    updateLastActive,
    isAddPatientOpen,
    setIsAddPatientOpen
  } = useUserStore()
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false)
  const [isPrivacyMode] = useState(false)
  const { isSuspicious, lastAnomaly, checkSecurityPulse } = useAgentStore()
  const { isEmergencyMode, clearEmergencyMode, activateEmergencyMode } = useClinicalStore()
  const { toasts, removeToast } = useToast()
  
  const navItems = role === 'doctor' ? DOCTOR_NAV : PATIENT_NAV
  const isDoctor = role === 'doctor'

  // Guardian Heartbeat
  useEffect(() => {
    if (!mounted || sessionState !== 'AUTHENTICATED') return
    const interval = setInterval(() => {
      checkSecurityPulse()
    }, 10000) // Every 10s
    return () => clearInterval(interval)
  }, [mounted, sessionState, checkSecurityPulse])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Track visibility for background lock
  useEffect(() => {
    if (!mounted) return
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        updateLastActive()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [mounted, updateLastActive])

  // Redirection is now handled by the parent AppGate component
  // this avoids duplicate router.replace calls and inconsistent state
  useEffect(() => {
    if (!mounted) return
  }, [mounted])

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Session activity tracking
  useEffect(() => {
    if (!mounted) return

    const handleActivity = () => {
      if (sessionState === 'AUTHENTICATED') {
        updateLastActive()
      }
    }

    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [mounted, sessionState, updateLastActive])

  // Emergency Timer
  useEffect(() => {
    if (isEmergencyMode) {
      setEmergencyExpiresAt(new Date(Date.now() + 15 * 60000).toISOString())
    } else {
      setEmergencyExpiresAt(null)
    }
  }, [isEmergencyMode])

  // Bypass shell or show blank until hydrated
  if (!mounted) return null

  if (pathname?.startsWith('/auth') || pathname === '/onboarding') {
    return <>{children}</>
  }



  return (
    <div className={cn(
      "min-h-screen transition-colors duration-700",
      isEmergencyMode ? "bg-[#0a0202]" : isDoctor ? "bg-[#0d1117]" : "bg-background"
    )}>
      
      {/* Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b h-16 transition-all duration-700",
        isEmergencyMode 
          ? "bg-red-950/20 border-red-500/20 backdrop-blur-xl" 
          : isDoctor 
            ? "bg-[#0d1117]/80 backdrop-blur-md border-white/[0.05]" 
            : "glass-card !bg-surface/80 dark:!bg-transparent border-foreground/10 shadow-sm dark:shadow-none"
      )}>
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-700",
              isEmergencyMode ? "bg-red-600 shadow-red-500/20" : 
              isDoctor ? "bg-[#1A3A8F]" : "bg-gradient-to-br from-primary to-secondary"
            )}>
              {isEmergencyMode ? <AlertTriangle className="w-5 h-5 text-white" /> : <span className="text-white font-black text-xs tracking-tighter pointer-events-none">EHI</span>}
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {isDoctor && !isEmergencyMode && (
               <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">Clinical Node Active</span>
               </div>
            )}
            
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                isEmergencyMode ? "bg-red-500/10 border-red-500/20 text-red-500" :
                isDoctor 
                  ? "bg-transparent border-white/20 text-white/60 hover:border-white/40 hover:text-white" 
                  : "bg-foreground/[0.08] border-foreground/5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/60"
              )}
            >
              <Search className="w-4 h-4" />
            </button>

            {isDoctor && !isEmergencyMode && (
              <button
                onClick={() => setIsEmergencyOpen(true)}
                className="px-4 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-red-500/5"
              >
                <AlertTriangle className="w-3 h-3 group-hover:animate-pulse" />
                <span className="hidden sm:inline">Emergency Protocol</span>
                <span className="sm:hidden">Protocol</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <EmergencyBanner 
        active={isEmergencyMode} 
        expiresAt={emergencyExpiresAt || ''} 
        onDeactivate={clearEmergencyMode} 
      />

      <AnimatePresence>
        {(isSuspicious || isEmergencyMode) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "fixed top-16 left-0 right-0 z-20 transition-colors duration-500",
              isEmergencyMode ? "bg-red-600 shadow-xl shadow-red-500/20" : "bg-red-500/10 border-b border-red-500/20 backdrop-blur-md"
            )}
          >
            <div className="max-w-4xl mx-auto px-5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className={cn("w-3.5 h-3.5 animate-pulse", isEmergencyMode ? "text-white" : "text-red-500")} />
                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isEmergencyMode ? "text-white" : "text-red-500")}>
                  {isEmergencyMode ? "Tactical Priority: Critical Access Active" : `MedVault Guardian: ${lastAnomaly}`}
                </span>
              </div>
              <span className={cn("text-[8px] font-black uppercase tracking-widest", isEmergencyMode ? "text-white/40" : "text-red-500/40")}>
                Protocol 9-Alpha Enforced
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main 
        data-privacy-mode={isPrivacyMode}
        className={cn(
          'flex-1 pt-24 pb-24 px-4 sm:px-6 max-w-4xl mx-auto w-full transition-all duration-700',
          isEmergencyMode && 'pt-40 grayscale-[0.5] contrast-125',
          isSuspicious && 'pt-32'
        )}
      >
        {children}
      </main>

      {/* Overlays */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

      {/* Bottom navigation */}
      {isDoctor ? (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-fit px-1.5 py-1.5 rounded-[28px] bg-[#111827]/80 backdrop-blur-xl border border-white/5 shadow-2xl flex items-center gap-1 z-40">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-4 sm:px-6 py-3 rounded-[24px] text-[10px] font-bold transition-all duration-500 uppercase tracking-widest relative group",
                  isActive ? "bg-[#5B8DEF] text-white shadow-lg shadow-[#5B8DEF]/20" : "text-white/20 hover:text-white/40"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-white/20 group-hover:text-white/40")} />
                {isActive && (
                  <motion.span 
                    layoutId="active-nav-label"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            )
          })}
        </nav>
      ) : (
        <nav className={cn(
          "fixed bottom-0 left-0 right-0 z-30 border-t h-20 flex items-center justify-around px-4 pb-safe transition-all",
          "md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-fit md:px-4 md:py-2 md:rounded-[32px] md:border md:shadow-2xl md:h-20 md:mx-auto md:bg-white/80 md:dark:bg-slate-900/80 md:backdrop-blur-xl",
          "glass-card border-foreground/10"
        )}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'nav-link flex flex-col items-center gap-1 min-w-[64px]', 
                  isActive ? "text-primary active" : "text-foreground/40"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                  isActive && "md:bg-primary/10"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium tracking-wide uppercase">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {isDoctor ? (
        <>
          <AddPatientModal isOpen={isAddPatientOpen} onClose={() => setIsAddPatientOpen(false)} />
          <EmergencyOverrideModal 
            isOpen={isEmergencyOpen} 
            onClose={() => setIsEmergencyOpen(false)} 
            onActivated={(justification, pid) => {
              activateEmergencyMode(pid)
              setIsEmergencyOpen(false)
            }}
          />
        </>
      ) : null}

      {/* Toast Container */}
      <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              className="pointer-events-auto"
            >
              <div className={cn(
                "px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-md min-w-[200px]",
                t.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                t.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                t.type === 'warning' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                "bg-white/10 border-white/10 text-white"
              )}>
                {t.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                {t.type === 'error' && <XCircle className="w-4 h-4" />}
                {t.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                {t.type === 'info' && <Info className="w-4 h-4" />}
                <span className="text-[11px] font-bold tracking-tight">{t.message}</span>
                <button onClick={() => removeToast(t.id)} className="ml-auto p-1 opacity-40 hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
