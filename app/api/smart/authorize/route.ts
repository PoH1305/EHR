export const runtime = 'edge'

import { SUPPORTED_EHR_SYSTEMS, generatePKCEPair, buildAuthorizationUrl } from '@/lib/smartFhir'
import type { SMARTConfig } from '@/lib/types'

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const ehrSystem = searchParams.get('ehrSystem')

    if (!ehrSystem || !(ehrSystem in SUPPORTED_EHR_SYSTEMS)) {
      return Response.json(
        { error: `Invalid EHR system. Supported: ${Object.keys(SUPPORTED_EHR_SYSTEMS).join(', ')}` },
        { status: 400 }
      )
    }

    const system = SUPPORTED_EHR_SYSTEMS[ehrSystem as keyof typeof SUPPORTED_EHR_SYSTEMS]

    if (!system.clientId) {
      return Response.json(
        { error: `${system.name} is not configured. Set ${ehrSystem}_CLIENT_ID in environment variables.` },
        { status: 503 }
      )
    }

    // Generate PKCE pair
    const { verifier, challenge } = await generatePKCEPair()

    // Generate state
    const stateBytes = new Uint8Array(32)
    crypto.getRandomValues(stateBytes)
    const state = btoa(String.fromCharCode(...stateBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Build SMART config
    const config: SMARTConfig = {
      clientId: system.clientId,
      authorizationEndpoint: system.authEndpoint,
      tokenEndpoint: system.tokenEndpoint,
      fhirBaseUrl: system.fhirBaseUrl,
      scopes: ['patient/Patient.read', 'patient/Observation.read', 'patient/Condition.read', 'patient/MedicationRequest.read', 'patient/AllergyIntolerance.read', 'openid', 'fhirUser'],
    }

    const authorizationUrl = buildAuthorizationUrl(config, state, challenge)

    // Store PKCE verifier in encrypted cookie
    const response = Response.json({ authorizationUrl })

    // Set httpOnly cookie for PKCE verifier
    response.headers.set(
      'Set-Cookie',
      `smart_pkce_verifier=${verifier}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=600`
    )
    response.headers.append(
      'Set-Cookie',
      `smart_state=${state}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=600`
    )
    response.headers.append(
      'Set-Cookie',
      `smart_ehr_system=${ehrSystem}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=600`
    )

    return response
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
