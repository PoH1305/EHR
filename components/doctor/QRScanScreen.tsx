'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Search, UserPlus, AlertCircle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QRScanScreenProps {
  onScanSuccess: (healthId: string) => void
  onCreateTemporary: () => void
}

export function QRScanScreen({ onScanSuccess, onCreateTemporary }: QRScanScreenProps) {
  const [manualId, setManualId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(true)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader")
    scannerRef.current = html5QrCode

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            onScanSuccess(decodedText)
          },
          () => {} // silent error for frame-by-frame fail
        )
      } catch (err) {
        console.error("Scanner start error:", err)
        setError("Could not access camera. Please check permissions.")
        setIsScanning(false)
      }
    }

    if (isScanning) {
      startScanner()
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(e => console.error(e))
      }
    }
  }, [isScanning, onScanSuccess])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualId.length < 5) {
      setError("Please enter a valid Health ID")
      return
    }
    onScanSuccess(manualId)
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold tracking-tight">Emergency Override</h1>
        </div>
        <p className="text-sm text-slate-400">Identify patient to begin break-glass access</p>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center px-6">
        {isScanning ? (
          <div className="w-full max-w-sm aspect-square relative rounded-3xl overflow-hidden border-2 border-red-500/20 bg-slate-900">
            <div id="qr-reader" className="w-full h-full" />
            
            {/* Scanning Animation */}
            <div className="absolute inset-0 pointer-events-none border-[20px] border-[#0a0a0a]/50">
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-xl" />
               <motion.div 
                 animate={{ top: ['10%', '90%', '10%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                 className="absolute left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" 
               />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm aspect-square flex flex-col items-center justify-center bg-slate-900 rounded-3xl border border-white/5 p-8 text-center">
             <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
               <Camera className="w-8 h-8 text-red-500/50" />
             </div>
             <p className="text-slate-400 text-sm mb-6">Camera Access Error</p>
             <button 
               onClick={() => setIsScanning(true)}
               className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
             >
               Try Again
             </button>
          </div>
        )}

        <div className="w-full max-w-sm mt-8 space-y-6">
          <form onSubmit={handleManualSubmit} className="relative">
            <input 
              type="text" 
              placeholder="e.g. EHI-7A3F-9C21-B84E"
              value={manualId}
              onChange={(e) => setManualId(e.target.value.toUpperCase())}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-mono tracking-wider focus:outline-none focus:border-red-500/50 transition-colors"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          </form>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <button 
            onClick={onCreateTemporary}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-500/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Create Temporary ID
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 left-6 right-6 p-4 rounded-2xl bg-red-950 border border-red-500/30 flex items-center gap-3 text-red-200 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
