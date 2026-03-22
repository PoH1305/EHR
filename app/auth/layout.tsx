import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication — EHI Platform',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#080D16] text-[#E2EAF0] selection:bg-white/10 flex flex-col antialiased relative overflow-hidden">
      {children}
    </div>
  )
}
