import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/AppProviders'
import { AppShell } from '@/components/AppShell'
import { AppGate } from '@/components/AppGate'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'EHI Platform — Electronic Health Identity',
  description: 'Patient-controlled health record platform with AI-powered data minimization, consent tokens, and FHIR interoperability.',
  keywords: ['health records', 'FHIR', 'patient data', 'consent', 'EHI'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[var(--color-bg)] antialiased">
        <ErrorBoundary>
          <AppProviders>
            <AppGate>
              <AppShell>
                {children}
              </AppShell>
            </AppGate>
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  )
}
