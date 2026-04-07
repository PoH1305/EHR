'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { 
  FileText, 
  Pill, 
  AlertCircle, 
  Activity, 
  Heart, 
  ShieldCheck,
  ClipboardList,
  Image as ImageIcon,
  FileBadge
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { GlassCard } from './GlassCard'
import { FileTypeBadge } from './FileTypeBadge'

export interface RecordItem {
  id: string
  resourceType: string
  title: string
  subtitle: string
  date: string
  status?: string | undefined
  sensitive?: boolean | undefined
  verified?: boolean
  fileUrl?: string
  fileName?: string
  fileType?: string
  category?: string
  storagePath?: string | undefined
  bodySystem?: string
}

interface RecordListProps {
  records: RecordItem[]
  onRecordClick?: (id: string) => void
}

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  Condition: <ClipboardList className="w-4 h-4 text-amber-400" />,
  MedicationRequest: <Pill className="w-4 h-4 text-blue-400" />,
  AllergyIntolerance: <AlertCircle className="w-4 h-4 text-rose-400" />,
  Observation: <Activity className="w-4 h-4 text-emerald-400" />,
  DiagnosticReport: <FileText className="w-4 h-4 text-purple-400" />,
  LAB_REPORT: <Activity className="w-4 h-4 text-emerald-400" />,
  PRESCRIPTION: <Pill className="w-4 h-4 text-blue-400" />,
  DISCHARGE_SUMMARY: <ClipboardList className="w-4 h-4 text-purple-400" />,
  CLINICAL_NOTE: <FileText className="w-4 h-4 text-amber-400" />,
  ClinicalNote: <FileText className="w-4 h-4 text-amber-400" />,
  IMAGE_REPORT: <ImageIcon className="w-4 h-4 text-rose-400" />,
  INSURANCE_DOC: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
  OTHER: <FileBadge className="w-4 h-4 text-slate-400" />,
}

export function RecordList({ records, onRecordClick }: RecordListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
  })

  return (
    <div ref={parentRef} className="h-[calc(100vh-280px)] overflow-auto scrollbar-hide">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const record = records[virtualRow.index]
          if (!record) return null

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <GlassCard
                className="mx-0 my-2 p-4"
                hover
                onClick={() => onRecordClick?.(record.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-foreground/[0.05] flex items-center justify-center flex-shrink-0">
                    {record.category ? (RESOURCE_ICONS[record.category] ?? <FileText className="w-4 h-4 text-foreground/30" />) : (RESOURCE_ICONS[record.resourceType] ?? <FileText className="w-4 h-4 text-foreground/30" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{record.title}</h4>
                      {record.sensitive && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[9px] text-amber-400 flex-shrink-0">
                          Sensitive
                        </span>
                      )}
                      {record.verified !== undefined && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] flex flex-shrink-0 items-center gap-0.5',
                          record.verified 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : 'bg-orange-500/10 text-orange-400'
                        )}>
                          {record.verified && <ShieldCheck className="w-2.5 h-2.5" />}
                          {record.verified ? 'Verified' : 'Unverified'}
                        </span>
                      )}
                      {record.status && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] flex-shrink-0',
                          record.status === 'active' && 'bg-green-500/10 text-green-400',
                          record.status === 'inactive' && 'bg-gray-500/10 text-gray-400',
                          record.status === 'resolved' && 'bg-blue-500/10 text-blue-400',
                        )}>
                          {record.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60 mt-0.5 truncate">{record.subtitle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-foreground/45">{formatRelativeTime(record.date)}</p>
                      {/* Color-coded file type badge for uploaded files */}
                      {record.resourceType === 'DiagnosticReport' && record.fileName && (
                        <FileTypeBadge fileName={record.fileName} mimeType={record.fileType} />
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )
        })}
      </div>
    </div>
  )
}
