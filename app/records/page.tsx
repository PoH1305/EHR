'use client'

import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { Search, Upload, Loader2, Zap, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { RecordList, type RecordItem } from '@/components/RecordList'
import { RecordDetailsModal } from '@/components/RecordDetailsModal'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { UploadModal } from '@/components/patient/UploadModal'
import type { PatientAttachment } from '@/lib/types'

import { categorizeRecord, type BodySystem } from '@/lib/ai-categorize'

const FILTER_TABS = ['Group', 'Recent']

function RecordsPageContent() {
  const { 
    vitals,
    conditions, 
    medications, 
    allergies, 
    attachments,
    clinicalNotes,
    medicalImages,
    loadClinicalData,
    syncToCloud,
    addAttachment 
  } = useClinicalStore()
  const { patient } = useUserStore()
  const [activeFilter, setActiveFilter] = useState('Group')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()

  const hasLoadedRef = useRef(false)

   useEffect(() => {
    setMounted(true)
    const { firebaseUid } = useUserStore.getState()
    const targetId = firebaseUid || patient?.id

    if (targetId && !hasLoadedRef.current && !targetId.startsWith('pat-')) {
      hasLoadedRef.current = true
      void loadClinicalData(targetId)
    }
    
    // Handle deep-linking from search
    const resourceId = searchParams.get('resourceId')
    if (resourceId) {
      setSelectedRecordId(resourceId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, patient?.healthId]) // intentionally omit store functions

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !patient?.id) return
    setUploadFile(file)
    setShowUploadModal(true)
  }

  const handleUpload = async ({ category, description, file }: { category: string; description: string; file: File }) => {
    if (!patient?.id) return

    setIsUploading(true)
    
    try {
      // 1. Create a local temporary URL for the file
      const localUrl = URL.createObjectURL(file)
      
      // 2. Prepare the attachment record
      const attachment: PatientAttachment = {
        id: crypto.randomUUID(),
        patientId: patient.id,
        fileUrl: localUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        category: category as any,
        description: description || 'Uploaded via MedVault Patient App',
        isVerified: false
      }

      // 3. Use ClinicalStore to handle cloud upload and state sync
      await addAttachment(attachment)
      
    } catch (error: any) {
      console.error('File upload failed:', error)
      alert(`Upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
      setUploadFile(null)
      setShowUploadModal(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }


  const allRecords: RecordItem[] = useMemo(() => {
    const records: RecordItem[] = []

    for (const cond of conditions) {
      const title = cond.code?.text ?? cond.code?.coding?.[0]?.display ?? 'Unknown Condition'
      const subtitle = `ICD-10: ${cond.code?.coding?.[0]?.code ?? 'N/A'}`
      records.push({
        id: cond.id ?? '',
        resourceType: 'Condition',
        title,
        subtitle,
        date: cond.recordedDate ?? '',
        status: cond.clinicalStatus?.coding?.[0]?.code,
        sensitive: cond.note?.some((n) => n.text?.includes('SENSITIVE')),
        verified: true,
        bodySystem: categorizeRecord(title, subtitle).system
      })
    }

    for (const med of medications) {
      const title = med.medicationCodeableConcept?.text ?? 'Unknown Medication'
      const subtitle = med.dosageInstruction?.[0]?.text ?? ''
      records.push({
        id: med.id ?? '',
        resourceType: 'MedicationRequest',
        title,
        subtitle,
        date: med.authoredOn ?? '',
        status: med.status,
        sensitive: med.note?.some((n) => n.text?.includes('SENSITIVE')),
        verified: true,
        bodySystem: categorizeRecord(title, subtitle).system
      })
    }

    for (const allergy of allergies) {
      const title = allergy.code?.text ?? 'Unknown Allergy'
      const subtitle = `Criticality: ${allergy.criticality ?? 'unknown'} — ${allergy.reaction?.[0]?.manifestation?.[0]?.text ?? ''}`
      records.push({
        id: allergy.id ?? '',
        resourceType: 'AllergyIntolerance',
        title,
        subtitle,
        date: allergy.recordedDate ?? '',
        status: allergy.clinicalStatus?.coding?.[0]?.code,
        verified: true,
        bodySystem: categorizeRecord(title, subtitle).system
      })
    }

    for (const attachment of attachments) {
      const title = attachment.fileName.replace(/\.[^/.]+$/, '')
      const subtitle = attachment.description || attachment.category.replace('_', ' ')
      records.push({
        id: attachment.id,
        resourceType: 'DiagnosticReport',
        title,
        subtitle,
        date: attachment.uploadedAt,
        verified: attachment.isVerified || false,
        fileUrl: attachment.fileUrl,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        storagePath: attachment.storagePath,
        bodySystem: categorizeRecord(title, subtitle).system
      })
    }

    for (const image of medicalImages) {
      const title = image.type || 'Medical Image'
      const subtitle = image.description || 'Clinical Capture'
      records.push({
        id: image.id,
        resourceType: 'DiagnosticReport',
        title,
        subtitle,
        date: image.timestamp,
        verified: true,
        fileUrl: image.imageUrl,
        storagePath: (image as any).storagePath,
        bodySystem: categorizeRecord(title, subtitle).system
      })
    }

    for (const note of clinicalNotes) {
      const title = 'Clinical Note'
      const subtitle = note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '')
      records.push({
        id: note.id,
        resourceType: 'ClinicalNote',
        title,
        subtitle,
        date: note.timestamp,
        verified: true,
        bodySystem: categorizeRecord(title, subtitle).system
      })
    }

    for (const series of vitals) {
      const title = series.type.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())
      const subtitle = `${series.latestValue} ${series.unit} (${series.trend})`
      records.push({
        id: `vital-${series.type}`,
        resourceType: 'Observation',
        title,
        subtitle,
        date: series.readings?.[series.readings.length - 1]?.timestamp || new Date().toISOString(),
        verified: true,
        bodySystem: categorizeRecord(title, subtitle).system
      })
    }

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [attachments, conditions, medications, allergies, medicalImages, clinicalNotes, vitals])


  const filteredRecords = useMemo(() => {
    let records = allRecords

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      records = records.filter(
        (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
      )
    }

    return records
  }, [allRecords, searchQuery])

  // Group by BodySystem for Segregated View
  const groupedRecords = useMemo(() => {
    const groups: Record<string, RecordItem[]> = {}
    filteredRecords.forEach(r => {
      const system = r.bodySystem || 'General'
      if (!groups[system]) groups[system] = []
      groups[system].push(r)
    })
    return groups
  }, [filteredRecords])

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
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30 shadow-[0_0_20px_-10px_rgba(59,130,246,0.3)]'
                : 'bg-foreground/[0.03] text-foreground/40 hover:bg-foreground/[0.06] hover:text-foreground/60'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      {activeFilter === 'Group' ? (
        <div className="grid grid-cols-2 gap-4 pb-24">
          {Object.entries(groupedRecords).map(([system, items]) => {
            const info = categorizeRecord(system)
            return (
              <button
                key={system}
                onClick={() => {
                  setSearchQuery(system === 'General' ? '' : system)
                  setActiveFilter('Recent')
                }}
                className="group relative flex flex-col p-6 rounded-[32px] bg-foreground/[0.02] border border-foreground/[0.08] hover:bg-foreground/[0.04] hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all text-left overflow-hidden"
              >
                {/* Decorative background glow */}
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-foreground/[0.03] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                    {info.icon}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg border border-primary/10">
                    <Zap className="w-2 h-2 text-primary fill-primary" />
                    <span className="text-[8px] text-primary font-black uppercase tracking-tight">AI</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{system}</h4>
                  <p className="text-[10px] text-foreground/40 font-medium">{items.length} record{items.length !== 1 ? 's' : ''}</p>
                </div>
                
                <div className="mt-4 flex items-center gap-1 text-[9px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                  View records <ChevronRight className="w-2.5 h-2.5" />
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <>
          {/* Record count */}
          <p className="text-[10px] text-foreground/20">
            {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} in Recent
          </p>

          {/* Record list */}
          <RecordList 
            records={filteredRecords} 
            onRecordClick={setSelectedRecordId} 
          />
        </>
      )}

      {/* Upload FAB */}
      {mounted && createPortal(
        <>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
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

          <UploadModal
            isOpen={showUploadModal}
            onClose={() => {
              setShowUploadModal(false)
              setUploadFile(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            onUpload={handleUpload}
            selectedFile={uploadFile}
          />
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
      <div className="w-full">
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
