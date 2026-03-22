'use client'

import React from 'react'
import DoctorAI from '@/components/doctor/DoctorAI'
import { useUserStore } from '@/store/useUserStore'
import { redirect } from 'next/navigation'

export default function AIInsightsPage() {
  const { role } = useUserStore()

  if (role !== 'doctor') {
    redirect('/dashboard')
  }

  return (
    <div className="p-5 max-w-md mx-auto">
      <DoctorAI />
    </div>
  )
}
