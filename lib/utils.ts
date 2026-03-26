import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS class strings with clsx + tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Generate a UUID v4 using Web Crypto API
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function formatHealthId(id: string | null | undefined): string {
  if (!id) return 'EHI-0000-0000'
  // Strip "EHI" prefix (case-insensitive, optional dash) to prevent doubling
  const clean = id.toUpperCase().replace(/^EHI-?/, '').replace(/[^A-Z0-9]/g, '')
  const parts: string[] = []
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4))
  }
  return `EHI-${parts.join('-')}`
}
/**
 * Auto-format EHI ID during input: "EHI-XXXX-XXXX-X"
 */
export function autoFormatEHI(value: string): string {
  let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!v.startsWith('EHI')) {
    v = 'EHI' + v
  }
  
  const sections = [
    v.slice(0, 3),
    v.slice(3, 7),
    v.slice(7, 11),
    v.slice(11, 15)
  ].filter(s => s.length > 0)
  
  return sections.join('-')
}

/**
 * Format ISO timestamp to human-readable locale string
 */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Unknown time'
  const now = Date.now()
  const then = new Date(iso).getTime()
  if (isNaN(then)) return 'Invalid date'
  const diffMs = now - then
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Truncate a hash with prefix...suffix
 */
export function truncateHash(hash: string, prefixLen: number = 8, suffixLen: number = 4): string {
  if (hash.length <= prefixLen + suffixLen + 3) return hash
  return `${hash.slice(0, prefixLen)}...${hash.slice(-suffixLen)}`
}

/**
 * Merge class name strings, filtering falsy values
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Map ICD-10 code prefix to human-readable category
 */
export function icd10Category(code: string): string {
  const prefix = code.charAt(0).toUpperCase()
  const map: Record<string, string> = {
    A: 'Infectious & Parasitic Diseases',
    B: 'Infectious & Parasitic Diseases',
    C: 'Neoplasms',
    D: 'Neoplasms / Blood Disorders',
    E: 'Endocrine, Nutritional & Metabolic',
    F: 'Mental & Behavioral Disorders',
    G: 'Nervous System',
    H: 'Eye & Ear',
    I: 'Circulatory System',
    J: 'Respiratory System',
    K: 'Digestive System',
    L: 'Skin & Subcutaneous Tissue',
    M: 'Musculoskeletal & Connective Tissue',
    N: 'Genitourinary System',
    O: 'Pregnancy, Childbirth & Puerperium',
    P: 'Perinatal Conditions',
    Q: 'Congenital Malformations',
    R: 'Symptoms & Abnormal Findings',
    S: 'Injury & Poisoning',
    T: 'Injury & Poisoning',
    V: 'External Causes',
    W: 'External Causes',
    X: 'External Causes',
    Y: 'External Causes',
    Z: 'Factors Influencing Health Status',
  }
  return map[prefix] ?? 'Unknown Category'
}

/**
 * Calculate age in years from ISO date string
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Format a vital value with its unit
 */
export function formatVitalValue(value: number, unit: string): string {
  const precision = unit === '°C' || unit === '°F' ? 1 : 0
  return `${value.toFixed(precision)} ${unit}`
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), ms)
  }
}

/**
 * Check if an ISO timestamp is expired
 */
export function isExpired(isoString: string): boolean {
  return new Date(isoString).getTime() < Date.now()
}

/**
 * Convert seconds to human-readable string
 */
export function secondsToHuman(seconds: number): string {
  if (seconds < 0) return '0s'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)

  return parts.join(' ')
}
