/**
 * Offline Cache — IndexedDB via idb-keyval
 * All PHI is encrypted before storage. Consent/audit data is not PHI.
 */
'use client'

import type { FHIRBundle, ConsentToken, AuditEvent, PendingSync } from '@/lib/types'
import { encryptField, decryptField } from '@/lib/crypto'

// ────────────────────────────────────────────────────────────────
// Guard: only use idb-keyval client-side
// ────────────────────────────────────────────────────────────────

async function getIdbKeyval() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available on the server')
  }
  return await import('idb-keyval')
}

// ────────────────────────────────────────────────────────────────
// Patient Records (encrypted PHI)
// ────────────────────────────────────────────────────────────────

export async function cachePatientRecords(
  userId: string,
  bundle: FHIRBundle,
  dataKey: CryptoKey
): Promise<void> {
  const { set } = await getIdbKeyval()
  const plaintext = JSON.stringify(bundle)
  const encrypted = await encryptField(plaintext, dataKey)
  await set(`ehi:records:${userId}`, {
    ...encrypted,
    cachedAt: new Date().toISOString(),
  })
}

export async function getCachedRecords(
  userId: string,
  dataKey: CryptoKey
): Promise<FHIRBundle | null> {
  const { get } = await getIdbKeyval()
  const cached = await get<{ ciphertext: string; iv: string; cachedAt: string }>(`ehi:records:${userId}`)
  if (!cached) return null

  try {
    const plaintext = await decryptField(cached.ciphertext, cached.iv, dataKey)
    return JSON.parse(plaintext) as FHIRBundle
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────────
// Consent Tokens (not encrypted — no PHI)
// ────────────────────────────────────────────────────────────────

export async function cacheConsentToken(token: ConsentToken): Promise<void> {
  const { set } = await getIdbKeyval()
  await set(`ehi:consent:${token.id}`, token)
}

export async function getCachedConsentTokens(): Promise<ConsentToken[]> {
  const { keys, get } = await getIdbKeyval()
  const allKeys = await keys()
  const consentKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith('ehi:consent:'))
  const tokens: ConsentToken[] = []

  for (const key of consentKeys) {
    const token = await get<ConsentToken>(key)
    if (token) tokens.push(token)
  }

  return tokens
}

export async function removeConsentToken(tokenId: string): Promise<void> {
  const { del } = await getIdbKeyval()
  await del(`ehi:consent:${tokenId}`)
}

// ────────────────────────────────────────────────────────────────
// Audit Events (not encrypted — hashed, not PHI)
// ────────────────────────────────────────────────────────────────

export async function appendAuditEvent(
  userId: string,
  event: AuditEvent
): Promise<void> {
  const { set } = await getIdbKeyval()
  await set(`ehi:audit:${userId}:${event.id}`, event)
}

export async function getAuditEvents(userId: string): Promise<AuditEvent[]> {
  const { keys, get } = await getIdbKeyval()
  const allKeys = await keys()
  const auditKeys = allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(`ehi:audit:${userId}:`)
  )
  const events: AuditEvent[] = []

  for (const key of auditKeys) {
    const event = await get<AuditEvent>(key)
    if (event) events.push(event)
  }

  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

// ────────────────────────────────────────────────────────────────
// Sync Queue
// ────────────────────────────────────────────────────────────────

export async function markSyncPending(operation: PendingSync): Promise<void> {
  const { get, set } = await getIdbKeyval()
  const pending = (await get<PendingSync[]>('ehi:sync:pending')) ?? []
  pending.push(operation)
  await set('ehi:sync:pending', pending)
}

export async function flushPendingSync(): Promise<PendingSync[]> {
  const { get, set } = await getIdbKeyval()
  const pending = (await get<PendingSync[]>('ehi:sync:pending')) ?? []
  await set('ehi:sync:pending', [])
  return pending
}

// ────────────────────────────────────────────────────────────────
// Online status
// ────────────────────────────────────────────────────────────────

export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false
  return !navigator.onLine
}
