import React from 'react'
import { cn } from '@/lib/utils'

// Map file extension to a color + label
const FILE_TYPE_MAP: Record<string, { label: string; className: string }> = {
  pdf:  { label: 'PDF',  className: 'bg-red-500/15 text-red-400 border-red-500/20' },
  doc:  { label: 'DOC',  className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  docx: { label: 'DOCX', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  xls:  { label: 'XLS',  className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  xlsx: { label: 'XLSX', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  jpg:  { label: 'JPG',  className: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  jpeg: { label: 'JPEG', className: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  png:  { label: 'PNG',  className: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20' },
  gif:  { label: 'GIF',  className: 'bg-pink-500/15 text-pink-400 border-pink-500/20' },
  dcm:  { label: 'DICOM', className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  mp4:  { label: 'MP4',  className: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  csv:  { label: 'CSV',  className: 'bg-lime-500/15 text-lime-400 border-lime-500/20' },
  txt:  { label: 'TXT',  className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  zip:  { label: 'ZIP',  className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
}

const FALLBACK: { label: string; className: string } = {
  label: 'FILE',
  className: 'bg-white/5 text-white/30 border-white/10',
}

/**
 * Returns the color-coded badge style info for a given filename or MIME type.
 * Also useful for just deriving the extension label anywhere.
 */
export function getFileTypeMeta(fileNameOrMime: string): { label: string; className: string } {
  // Try extension from filename first
  const ext = fileNameOrMime.split('.').pop()?.toLowerCase() ?? ''
  if (ext && FILE_TYPE_MAP[ext]) return FILE_TYPE_MAP[ext]!

  // Fall back to MIME type sniffing
  if (fileNameOrMime.includes('pdf'))   return FILE_TYPE_MAP['pdf']!
  if (fileNameOrMime.includes('jpeg') || fileNameOrMime.includes('jpg')) return FILE_TYPE_MAP['jpg']!
  if (fileNameOrMime.includes('png'))   return FILE_TYPE_MAP['png']!
  if (fileNameOrMime.includes('word'))  return FILE_TYPE_MAP['docx']!
  if (fileNameOrMime.includes('sheet')) return FILE_TYPE_MAP['xlsx']!
  if (fileNameOrMime.includes('csv'))   return FILE_TYPE_MAP['csv']!
  if (fileNameOrMime.includes('dicom') || fileNameOrMime.includes('dcm')) return FILE_TYPE_MAP['dcm']!

  return FALLBACK
}

interface FileTypeBadgeProps {
  fileName: string
  mimeType?: string | undefined
  className?: string
}

/**
 * A pill badge showing the file type (e.g. PDF, DOCX, JPG) with a matching color.
 * Works from filename or MIME type.
 */
export function FileTypeBadge({ fileName, mimeType, className }: FileTypeBadgeProps) {
  const meta = getFileTypeMeta(mimeType || fileName)
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black tracking-widest uppercase',
      meta.className,
      className
    )}>
      {meta.label}
    </span>
  )
}
