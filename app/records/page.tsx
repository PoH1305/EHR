'use client'

import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { Search, Upload, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { RecordList, type RecordItem } from '@/components/RecordList'
import { RecordDetailsModal } from '@/components/RecordDetailsModal'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'

const FILTER_TABS = ['All', 'Conditions', 'Medications', 'Allergies', 'Labs', 'Procedures']

function RecordsPageContent() {
  const { 
    conditions, 
    medications, 
    allergies, 
    attachments,
    loadClinicalData, 
    addAttachment 
  } = useClinicalStore()
  const { patient } = useUserStore()
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    if (patient?.id) {
      void loadClinicalData(patient.id)
    }
    
    // Handle deep-linking from search
    const resourceId = searchParams.get('resourceId')
    if (resourceId) {
      setSelectedRecordId(resourceId)
    }
  }, [searchParams, patient?.id, loadClinicalData])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !patient?.id) return

    setIsUploading(true)
    
    try {
      // Create a local blob URL for temporary viewing
      // Note: In a real app, you'd store the actual file in IndexedDB
      const fileUrl = URL.createObjectURL(file)
      
      const newAttachment = {
        id: `upload-${Date.now()}`,
        patientId: patient.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: fileUrl,
        uploadedAt: new Date().toISOString(),
        category: 'LAB_REPORT' as const,
        description: 'Patient Uploaded Document'
      }

      await addAttachment(newAttachment)
    } catch (error) {
      console.error('File upload failed:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const allRecords: RecordItem[] = useMemo(() => {
    const records: RecordItem[] = [...uploadedRecords]

    for (const cond of conditions) {
      records.push({
        id: cond.id ?? '',
        resourceType: 'Condition',
        title: cond.code?.text ?? cond.code?.coding?.[0]?.display ?? 'Unknown Condition',
        subtitle: `ICD-10: ${cond.code?.coding?.[0]?.code ?? 'N/A'}`,
        date: cond.recordedDate ?? '',
        status: cond.clinicalStatus?.coding?.[0]?.code,
        sensitive: cond.note?.some((n) => n.text?.includes('SENSITIVE')),
        verified: true,
      })
    }

    for (const med of medications) {
      records.push({
        id: med.id ?? '',
        resourceType: 'MedicationRequest',
        title: med.medicationCodeableConcept?.text ?? 'Unknown Medication',
        subtitle: med.dosageInstruction?.[0]?.text ?? '',
        date: med.authoredOn ?? '',
        status: med.status,
        sensitive: med.note?.some((n) => n.text?.includes('SENSITIVE')),
        verified: true,
      })
    }

    for (const allergy of allergies) {
      records.push({
        id: allergy.id ?? '',
        resourceType: 'AllergyIntolerance',
        title: allergy.code?.text ?? 'Unknown Allergy',
        subtitle: `Criticality: ${allergy.criticality ?? 'unknown'} — ${allergy.reaction?.[0]?.manifestation?.[0]?.text ?? ''}`,
        date: allergy.recordedDate ?? '',
        status: allergy.clinicalStatus?.coding?.[0]?.code,
        verified: true,
      })
    }

    for (const attachment of attachments) {
      records.push({
        id: attachment.id,
        resourceType: 'DiagnosticReport',
        title: attachment.fileName.replace(/\.[^/.]+$/, ''),
        subtitle: attachment.description || 'Uploaded Document',
        date: attachment.uploadedAt,
        verified: false,
        fileUrl: attachment.fileUrl,
      })
    }

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [attachments, conditions, medications, allergies])

  const filteredRecords = useMemo(() => {
    let records = allRecords

    if (activeFilter !== 'All') {
      const filterMap: Record<string, string> = {
        Conditions: 'Condition',
        Medications: 'MedicationRequest',
        Allergies: 'AllergyIntolerance',
        Labs: 'DiagnosticReport',
        Procedures: 'Procedure',
      }
      const resourceType = filterMap[activeFilter]
      if (resourceType) {
        records = records.filter((r) => r.resourceType === resourceType)
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      records = records.filter(
        (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
      )
    }

    return records
  }, [allRecords, activeFilter, searchQuery])

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-foreground/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search records..."
          className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all',
              activeFilter === tab
                ? 'bg-primary/20 text-primary ring-1 ring-primary/20'
                : 'bg-foreground/5 text-foreground/40 hover:text-foreground/60'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Record count */}
      <p className="text-[10px] text-foreground/20">
        {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
        {activeFilter !== 'All' && ` in ${activeFilter}`}
      </p>

      {/* Record list */}
      <RecordList 
        records={filteredRecords} 
        onRecordClick={setSelectedRecordId} 
      />

      {/* Upload FAB */}
      {mounted && createPortal(
        <>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "fixed bottom-[100px] right-6 z-[60] w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 transition-transform",
              isUploading && "opacity-80 scale-95"
            )}
            title="Upload Lab Report"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-white" />
            )}
          </button>
        </>,
        document.body
      )}

      {/* Record Details Modal */}
      <RecordDetailsModal
        isOpen={!!selectedRecordId}
        record={filteredRecords.find(r => r.id === selectedRecordId) || null}
        onClose={() => setSelectedRecordId(null)}
      />
    </div>
  )
}

import dynamic from 'next/dynamic'

const DoctorRecords = dynamic(() => import('@/components/doctor/DoctorRecords'), { ssr: false })

export default function RecordsPage() {
  const { role } = useUserStore()

  if (role === 'doctor') {
    return (
      <div className="p-5 max-w-md mx-auto">
        <DoctorRecords />
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <RecordsPageContent />
    </Suspense>
  )
}
