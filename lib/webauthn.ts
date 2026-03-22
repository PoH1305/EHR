import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'

// Base64URL encode helper
function bufferToBase64URL(buffer: Uint8Array): string {
  const bytes = Array.from(buffer)
  const string = String.fromCharCode(...bytes)
  return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  return window.PublicKeyCredential !== undefined &&
    await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}

export async function registerDevice(userIdentifier: string): Promise<boolean> {
  try {
    const userIdBuffer = new TextEncoder().encode(userIdentifier)
    const challengeBuffer = crypto.getRandomValues(new Uint8Array(32))

    const options: PublicKeyCredentialCreationOptionsJSON = {
      challenge: bufferToBase64URL(challengeBuffer),
      rp: { name: 'EHI Platform', id: window.location.hostname },
      user: {
        id: bufferToBase64URL(userIdBuffer),
        name: userIdentifier,
        displayName: userIdentifier,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      timeout: 60000,
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    }

    const attResp = await startRegistration({ optionsJSON: options })
    localStorage.setItem('ehi:biometric:credentialId', attResp.id)
    return true
  } catch (error) {
    console.error('Registration error:', error)
    return false
  }
}

export async function verifyDevice(): Promise<boolean> {
  try {
    const credentialId = localStorage.getItem('ehi:biometric:credentialId')
    if (!credentialId) return false
    
    const challengeBuffer = crypto.getRandomValues(new Uint8Array(32))

    const options: PublicKeyCredentialRequestOptionsJSON = {
      challenge: bufferToBase64URL(challengeBuffer),
      timeout: 60000,
      userVerification: 'required',
      rpId: window.location.hostname,
      allowCredentials: [{
        id: credentialId,
        type: 'public-key',
        transports: ['internal', 'hybrid']
      }]
    }

    await startAuthentication({ optionsJSON: options })
    return true
  } catch (error) {
    console.error('Verification error:', error)
    return false
  }
}
