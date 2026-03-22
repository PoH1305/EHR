/**
 * SMART on FHIR Authorization
 * Implements SMART on FHIR PKCE auth flow for Epic, Cerner, athenahealth.
 */

import { z } from 'zod'
import type { SMARTConfig, SMARTTokenResponse, FHIRBundle } from '@/lib/types'

// ────────────────────────────────────────────────────────────────
// Supported EHR Systems
// ────────────────────────────────────────────────────────────────

export const SUPPORTED_EHR_SYSTEMS = {
  EPIC: {
    name: 'Epic MyChart',
    clientId: process.env.EPIC_CLIENT_ID ?? '',
    authEndpoint: process.env.EPIC_AUTH_ENDPOINT ?? 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
    tokenEndpoint: process.env.EPIC_TOKEN_ENDPOINT ?? 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    fhirBaseUrl: process.env.EPIC_FHIR_BASE_URL ?? 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
  },
  CERNER: {
    name: 'Cerner Health',
    clientId: process.env.CERNER_CLIENT_ID ?? '',
    authEndpoint: process.env.CERNER_AUTH_ENDPOINT ?? '',
    tokenEndpoint: process.env.CERNER_TOKEN_ENDPOINT ?? '',
    fhirBaseUrl: '',
  },
  ATHENA: {
    name: 'athenahealth',
    clientId: process.env.ATHENA_CLIENT_ID ?? '',
    authEndpoint: '',
    tokenEndpoint: '',
    fhirBaseUrl: '',
  },
} as const

// ────────────────────────────────────────────────────────────────
// PKCE
// ────────────────────────────────────────────────────────────────

/**
 * Generate PKCE code verifier and challenge pair
 */
export async function generatePKCEPair(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = base64UrlEncode(array)

  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = base64UrlEncode(new Uint8Array(hash))

  return { verifier, challenge }
}

// ────────────────────────────────────────────────────────────────
// Authorization flow
// ────────────────────────────────────────────────────────────────

/**
 * Build the SMART on FHIR authorization URL
 */
export function buildAuthorizationUrl(
  config: SMARTConfig,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/smart/callback`,
    scope: config.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    aud: config.fhirBaseUrl,
  })

  return `${config.authorizationEndpoint}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  config: SMARTConfig,
  codeVerifier: string
): Promise<SMARTTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/smart/callback`,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  })

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`)
  }

  const data: unknown = await response.json()
  const validated = SMARTTokenResponseSchema.parse(data)
  return validated as SMARTTokenResponse
}

/**
 * Fetch all patient FHIR resources and merge into a Bundle
 */
export async function fetchFHIRBundle(
  token: SMARTTokenResponse,
  config: SMARTConfig
): Promise<FHIRBundle> {
  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: 'application/fhir+json',
  }

  const resourceTypes = [
    'Patient',
    'Observation',
    'Condition',
    'MedicationRequest',
    'AllergyIntolerance',
  ]

  const responses = await Promise.all(
    resourceTypes.map(async (type) => {
      const url =
        type === 'Patient'
          ? `${config.fhirBaseUrl}/${type}/${token.patient}`
          : `${config.fhirBaseUrl}/${type}?patient=${token.patient}`

      const res = await fetch(url, { headers })
      if (!res.ok) return null
      return res.json() as Promise<unknown>
    })
  )

  const entries: Array<{ fullUrl?: string; resource: Record<string, unknown> }> = []

  for (const data of responses) {
    if (!data) continue
    const record = data as Record<string, unknown>

    if (record['resourceType'] === 'Bundle' && Array.isArray(record['entry'])) {
      for (const entry of record['entry'] as Array<{ fullUrl?: string; resource: Record<string, unknown> }>) {
        entries.push(entry)
      }
    } else if (record['resourceType']) {
      entries.push({ resource: record as Record<string, unknown> })
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: entries,
  } as unknown as FHIRBundle
}

/**
 * Refresh a SMART on FHIR access token
 */
export async function refreshSMARTToken(
  refreshToken: string,
  config: SMARTConfig
): Promise<SMARTTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  })

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const data: unknown = await response.json()
  return SMARTTokenResponseSchema.parse(data) as SMARTTokenResponse
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]!)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const SMARTTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  scope: z.string(),
  patient: z.string(),
  refresh_token: z.string().optional(),
})
