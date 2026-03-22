'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, AlertTriangle, RefreshCw, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanFailure?: (error: string) => void
  fps?: number
  qrbox?: number
  aspectRatio?: number
}

export default function QRScanner({
  onScanSuccess,
  onScanFailure,
  fps = 10,
  qrbox = 250,
  aspectRatio = 1,
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSecure, setIsSecure] = useState(true)
  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  const uniqueId = React.useId()
  const containerId = `qr-reader-${uniqueId.replace(/:/g, '')}`

  useEffect(() => {
    // Check for secure context
    const isSecureContext = window.isSecureContext || 
      ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
    setIsSecure(isSecureContext)

    return () => {
      // Safe cleanup
      if (qrCodeRef.current) {
        const scanner = qrCodeRef.current
        if (scanner.isScanning) {
          scanner.stop().catch(err => {
            // Ignore DOM errors during cleanup
            console.warn('Scanner unmount stop warning:', err)
          })
        }
      }
    }
  }, [])

  const startScanner = async () => {
    setError(null)
    setIsScanning(true)

    try {
      const element = document.getElementById(containerId)
      if (!element) {
        throw new Error('Scanner container element not found')
      }

      if (!qrCodeRef.current) {
        qrCodeRef.current = new Html5Qrcode(containerId)
      }

      const config = {
        fps,
        qrbox: { width: qrbox, height: qrbox },
        aspectRatio,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      }

      await qrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          onScanSuccess(decodedText)
          stopScanner()
        },
        (errorMessage) => {
          // Failure on each frame is common, only log if needed
          if (onScanFailure) onScanFailure(errorMessage)
        }
      )
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Camera initialization failed:', err)
      setError(err?.message || 'Failed to access camera. Please check permissions.')
      setIsScanning(false)
    }
  }

  const stopScanner = async () => {
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      try {
        await qrCodeRef.current.stop()
        setIsScanning(false)
        // Small safety: clear the element so React doesn't find unexpected children
        const el = document.getElementById(containerId)
        if (el) el.innerHTML = ''
      } catch (err) {
        console.warn('Scanner stop failed:', err)
      }
    }
  }

  if (!isSecure) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
        <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2">Insecure Context</h4>
        <p className="text-[10px] text-white/40 leading-relaxed mb-6 italic">
          Camera access usually requires **HTTPS** or **localhost**. 
          Try accessing via `localhost:3000` or use a secure tunnel.
        </p>
        <button 
          onClick={() => setIsSecure(true)}
          className="px-6 py-2 rounded-xl bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5"
        >
          Try Anyway
        </button>
      </div>
    )
  }

  return (
    <div className="w-full relative group">
      <div 
        id={containerId} 
        className={cn(
          "w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-white/5 transition-all",
          !isScanning && "flex items-center justify-center"
        )}
      >
        {!isScanning && !error && (
          <div className="flex flex-col items-center gap-4 group">
            <div className="w-16 h-16 rounded-full bg-[#1A3A8F]/20 flex items-center justify-center border border-[#1A3A8F]/30 group-hover:scale-110 transition-transform">
              <Camera className="w-8 h-8 text-[#5B8DEF]" />
            </div>
            <button 
              onClick={startScanner}
              className="px-6 py-2.5 rounded-xl bg-[#1A3A8F] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#1A3A8F]/80 transition-all shadow-lg shadow-[#1A3A8F]/20"
            >
              Enable Camera
            </button>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <XCircle className="w-12 h-12 text-red-500/40" />
            <p className="text-xs text-red-500/60 font-medium leading-relaxed">{error}</p>
            <button 
              onClick={startScanner}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        )}
      </div>

      {isScanning && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-[15%] border-2 border-[#5B8DEF]/40 rounded-3xl" />
          <div className="absolute inset-x-[15%] top-1/2 h-[2px] bg-[#5B8DEF] shadow-[0_0_15px_rgba(91,141,239,1)] animate-pulse" />
          <button 
            onClick={stopScanner}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-white/60 uppercase tracking-widest border border-white/10 hover:text-white pointer-events-auto"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  )
}
