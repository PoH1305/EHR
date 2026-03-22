'use client'

import React, { useState } from 'react'
import PatientList from '@/components/doctor/PatientList'
import PatientDetail from '@/components/doctor/PatientDetail'
import { useUserStore } from '@/store/useUserStore'
import { redirect } from 'next/navigation'

export default function PatientsPage() {
  const { role } = useUserStore()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  // Security check: only doctors should access this page
  if (role !== 'doctor') {
    redirect('/dashboard')
  }

  return (
    <div className="p-5 max-w-md mx-auto">
      {selectedPatientId ? (
        <PatientDetail 
          onBack={() => setSelectedPatientId(null)} 
        />
      ) : (
        <PatientList onSelect={setSelectedPatientId} />
      )}
    </div>
  )
}
