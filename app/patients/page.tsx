'use client'

import React, { useState } from 'react'
import PatientList from '@/components/doctor/PatientList'
import PatientDetail from '@/components/doctor/PatientDetail'
import { useUserStore } from '@/store/useUserStore'
import { redirect } from 'next/navigation'

import { useSearchParams } from 'next/navigation'
import { useClinicalStore } from '@/store/useClinicalStore'
import { Suspense, useEffect } from 'react'

function PatientsPageContent() {
  const { role } = useUserStore()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const { loadSharedClinicalData } = useClinicalStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const key = searchParams.get('key')
    const name = searchParams.get('name')

    if (token && key) {
      // If we have a sharing token, we load the shared data
      loadSharedClinicalData(token, key).then(() => {
        setSelectedPatientId(name || 'Shared Patient')
      }).catch(err => {
        console.error('Failed to load shared records:', err)
      })
    }
  }, [searchParams, loadSharedClinicalData])

  // Security check: only doctors should access this page
  if (role !== 'doctor') {
    redirect('/dashboard')
  }

  return (
    <div className="w-full">
      {selectedPatientId ? (
        <PatientDetail 
          onBack={() => setSelectedPatientId(null)} 
          patientId={selectedPatientId}
        />
      ) : (
        <PatientList onSelect={setSelectedPatientId} />
      )}
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading Clinical Interface...</div>}>
      <PatientsPageContent />
    </Suspense>
  )
}
