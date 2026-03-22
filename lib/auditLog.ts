/**
 * Blockchain-inspired Audit Log
 * Each entry hashes the previous entry. Tampering breaks the chain.
 */

import type { AuditEvent, AuditChainVerification, DisplayAuditEvent } from '@/lib/types'
import { sha256 } from '@/lib/crypto'
import { formatRelativeTime, truncateHash } from '@/lib/utils'

const GENESIS_HASH = '0000000000000000'

// ────────────────────────────────────────────────────────────────
// Chain building
// ────────────────────────────────────────────────────────────────

/**
 * Build a hash chain from raw audit events
 */
export async function buildAuditChain(
  events: Omit<AuditEvent, 'hash' | 'previousHash'>[]
): Promise<AuditEvent[]> {
  const chain: AuditEvent[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!
    const previousHash = i === 0 ? GENESIS_HASH : chain[i - 1]!.hash

    // Sort fields for deterministic hashing
    const sortedFields = JSON.stringify(event, Object.keys(event).sort())
    const hash = await sha256(`${previousHash}:${sortedFields}`)

    chain.push({
      ...event,
      previousHash,
      hash,
    })
  }

  return chain
}

// ────────────────────────────────────────────────────────────────
// Chain verification
// ────────────────────────────────────────────────────────────────

/**
 * Verify the integrity of an audit chain
 */
export async function verifyAuditChain(
  events: AuditEvent[]
): Promise<AuditChainVerification> {
  if (events.length === 0) {
    return {
      valid: true,
      brokenAt: null,
      message: 'Empty audit chain',
      totalEvents: 0,
      verifiedEvents: 0,
    }
  }

  // Verify first event has genesis hash
  if (events[0]!.previousHash !== GENESIS_HASH) {
    return {
      valid: false,
      brokenAt: 0,
      message: 'First event does not have genesis hash',
      totalEvents: events.length,
      verifiedEvents: 0,
    }
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!
    const { hash: storedHash, previousHash: storedPreviousHash, ...fields } = event

    // Verify chain linkage
    if (i > 0 && storedPreviousHash !== events[i - 1]!.hash) {
      return {
        valid: false,
        brokenAt: i,
        message: `Chain broken at event #${i}: previousHash mismatch`,
        totalEvents: events.length,
        verifiedEvents: i,
      }
    }

    // Re-compute hash
    const sortedFields = JSON.stringify(fields, Object.keys(fields).sort())
    const expectedPrevious = i === 0 ? GENESIS_HASH : events[i - 1]!.hash
    const computedHash = await sha256(`${expectedPrevious}:${sortedFields}`)

    if (computedHash !== storedHash) {
      return {
        valid: false,
        brokenAt: i,
        message: `Hash mismatch at event #${i}: tampering detected`,
        totalEvents: events.length,
        verifiedEvents: i,
      }
    }
  }

  return {
    valid: true,
    brokenAt: null,
    message: `All ${events.length} events verified`,
    totalEvents: events.length,
    verifiedEvents: events.length,
  }
}

// ────────────────────────────────────────────────────────────────
// Display formatting
// ────────────────────────────────────────────────────────────────

const EVENT_TYPE_DISPLAY: Record<string, { iconName: string; colorToken: string }> = {
  ACCESS: { iconName: 'Eye', colorToken: 'var(--color-info)' },
  SHARE: { iconName: 'Share2', colorToken: 'var(--color-primary)' },
  CONSENT_GRANTED: { iconName: 'ShieldCheck', colorToken: 'var(--color-success)' },
  CONSENT_REVOKED: { iconName: 'ShieldOff', colorToken: 'var(--color-warning)' },
  RECORD_VIEWED: { iconName: 'FileText', colorToken: 'var(--color-info)' },
  RECORD_CREATED: { iconName: 'FilePlus', colorToken: 'var(--color-success)' },
  RECORD_UPDATED: { iconName: 'FileEdit', colorToken: 'var(--color-primary)' },
  AI_SUMMARY_GENERATED: { iconName: 'Sparkles', colorToken: 'var(--color-secondary)' },
  EMERGENCY_ACCESS_ACTIVATED: { iconName: 'AlertTriangle', colorToken: 'var(--color-danger)' },
  EMERGENCY_ACCESS_DEACTIVATED: { iconName: 'ShieldCheck', colorToken: 'var(--color-success)' },
  SECURITY_ALERT: { iconName: 'AlertOctagon', colorToken: 'var(--color-danger)' },
  BIOMETRIC_UNLOCK: { iconName: 'Fingerprint', colorToken: 'var(--color-primary)' },
  KEY_GENERATED: { iconName: 'Key', colorToken: 'var(--color-secondary)' },
  EXPORT_DATA: { iconName: 'Download', colorToken: 'var(--color-info)' },
}

/**
 * Format an audit event for UI display
 */
export function formatAuditEventForDisplay(event: AuditEvent): DisplayAuditEvent {
  const display = EVENT_TYPE_DISPLAY[event.type] ?? {
    iconName: 'Activity',
    colorToken: 'var(--color-muted)',
  }

  return {
    ...event,
    relativeTime: formatRelativeTime(event.timestamp),
    displayHash: truncateHash(event.hash),
    iconName: display.iconName,
    colorToken: display.colorToken,
  }
}
