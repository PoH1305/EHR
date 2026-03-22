export const runtime = 'edge'

import { SUPPORTED_EHR_SYSTEMS, exchangeCodeForToken, fetchFHIRBundle } from '@/lib/smartFhir'
import type { SMARTConfig } from '@/lib/types'

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return Response.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      )
    }

    // Retrieve PKCE verifier and state from cookies
    const cookieHeader = request.headers.get('Cookie') ?? ''
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [key, ...vals] = c.trim().split('=')
        return [key, vals.join('=')]
      })
    )

    const storedState = cookies['smart_state']
    const verifier = cookies['smart_pkce_verifier']
    const ehrSystem = cookies['smart_ehr_system']

    if (!storedState || storedState !== state) {
      return Response.json(
        { error: 'State mismatch — possible CSRF attack' },
        { status: 403 }
      )
    }

    if (!verifier) {
      return Response.json(
        { error: 'PKCE verifier not found — session may have expired' },
        { status: 400 }
      )
    }

    if (!ehrSystem || !(ehrSystem in SUPPORTED_EHR_SYSTEMS)) {
      return Response.json(
        { error: 'EHR system not found in session' },
        { status: 400 }
      )
    }

    const system = SUPPORTED_EHR_SYSTEMS[ehrSystem as keyof typeof SUPPORTED_EHR_SYSTEMS]

    const config: SMARTConfig = {
      clientId: system.clientId,
      authorizationEndpoint: system.authEndpoint,
      tokenEndpoint: system.tokenEndpoint,
      fhirBaseUrl: system.fhirBaseUrl,
      scopes: [],
    }

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code, config, verifier)

    // Fetch FHIR bundle
    const bundle = await fetchFHIRBundle(tokenResponse, config)

    // Store bundle in session (encrypted) and redirect to dashboard
    // For now, redirect with a success indicator
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('smart', 'success')
    redirectUrl.searchParams.set('records', String(bundle.entry?.length ?? 0))

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
      },
    })

    // Clear PKCE cookies
    response.headers.set('Set-Cookie', 'smart_pkce_verifier=; Path=/; Max-Age=0')
    response.headers.append('Set-Cookie', 'smart_state=; Path=/; Max-Age=0')
    response.headers.append('Set-Cookie', 'smart_ehr_system=; Path=/; Max-Age=0')

    return response
  } catch (error) {
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('smart', 'error')
    redirectUrl.searchParams.set('message', error instanceof Error ? error.message : 'Unknown error')

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl.toString() },
    })
  }
}
