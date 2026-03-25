/**
 * Consent Token System
 * Cryptographic permission slips patients issue to doctors.
 * Time-bounded, specialty-scoped, individually revocable.
 */

import type { ConsentToken, ConsentTokenRequest, ConsentTokenValidation } from '@/lib/types'
import { generateUUID, isExpired, secondsToHuman } from '@/lib/utils'
import { sha256 } from '@/lib/crypto'

// ────────────────────────────────────────────────────────────────
// TTL Options
// ────────────────────────────────────────────────────────────────

export const TTL_OPTIONS = [
  { label: '15 minutes', seconds: 900 },
  { label: '1 hour', seconds: 3600 },
  { label: '4 hours', seconds: 14400 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
  { label: '30 days', seconds: 2592000 },
] as const

// ────────────────────────────────────────────────────────────────
// Token lifecycle
// ────────────────────────────────────────────────────────────────

/**
 * Generate a new consent token
 */
export async function generateConsentToken(
  request: ConsentTokenRequest,
  encryptedBundle?: string,
  tokenKey?: string
): Promise<ConsentToken> {
  const id = generateUUID()
  const grantedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + request.ttlSeconds * 1000).toISOString()
  const tokenHash = await sha256(`${id}${request.patientId}${expiresAt}`)

  const token: ConsentToken = {
    id,
    patientId: request.patientId,
    recipientName: request.recipientName,
    recipientId: request.recipientId,
    specialty: request.specialty,
    grantedAt,
    expiresAt,
    ttlSeconds: request.ttlSeconds,
    allowedCategories: request.allowedCategories ?? [],
    allowedFiles: request.allowedFiles ?? [],
    emergencyAccess: request.emergencyAccess ?? false,
    status: 'ACTIVE',
    revokedAt: null,
    revocationReason: null,
    accessCount: 0,
    lastAccessedAt: null,
    tokenHash,
    patientName: request.patientName,
    tokenKey
  }

  // POST to server (mock in development)
  if (process.env.NODE_ENV !== 'development') {
    await fetch('/api/consent/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenHash,
        patientId: request.patientId,
        recipientId: request.recipientId,
        expiresAt,
        specialty: request.specialty,
      }),
    })
  }

  return token
}

/**
 * Revoke a consent token
 */
export async function revokeConsentToken(
  tokenId: string,
  reason: string,
  patientId: string
): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    await fetch('/api/consent/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, reason, patientId }),
    })
  }
}

/**
 * Validate a consent token
 */
export function validateConsentToken(token: ConsentToken): ConsentTokenValidation {
  if (token.status === 'REVOKED') {
    return { valid: false, reason: 'Token has been revoked', secondsRemaining: 0 }
  }

  if (token.status === 'EXPIRED' || isExpired(token.expiresAt)) {
    return { valid: false, reason: 'Token has expired', secondsRemaining: 0 }
  }

  if (token.status !== 'ACTIVE') {
    return { valid: false, reason: `Token status is ${token.status}`, secondsRemaining: 0 }
  }

  const secondsRemaining = Math.max(
    0,
    Math.floor((new Date(token.expiresAt).getTime() - Date.now()) / 1000)
  )

  return { valid: true, reason: null, secondsRemaining }
}

/**
 * Get time remaining display info
 */
export function getTimeRemaining(
  expiresAt: string
): { formatted: string; percent: number; urgent: boolean } {
  const expiresMs = new Date(expiresAt).getTime()
  const nowMs = Date.now()
  const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000))

  const formatted = remainingSeconds < 3600
    ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`
    : secondsToHuman(remainingSeconds)

  // Approximate percent used (we don't know original TTL from expiresAt alone,
  // but we flag urgent based on absolute threshold)
  const urgent = remainingSeconds < 900 // < 15 minutes

  return {
    formatted,
    percent: urgent ? Math.max(80, 100 - (remainingSeconds / 900) * 20) : 0,
    urgent,
  }
}
