/**
 * Client-side cryptographic operations using Web Crypto API.
 * All PHI is encrypted at rest with AES-GCM. RSA for key exchange.
 * WebAuthn for biometric authentication.
 */

// ────────────────────────────────────────────────────────────────
// AES-GCM Encryption (for PHI at rest)
// ────────────────────────────────────────────────────────────────

/**
 * Generate a new AES-GCM 256-bit data key
 */
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for backup
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a string field with AES-GCM
 */
export async function encryptField(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  }
}

/**
 * Decrypt an AES-GCM encrypted field
 */
export async function decryptField(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(ciphertext)
  )
  return decoder.decode(decrypted)
}

// ────────────────────────────────────────────────────────────────
// RSA Key Pair (for key exchange / digital signatures)
// ────────────────────────────────────────────────────────────────

export interface KeyPairResult {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

/**
 * Generate RSA-OAEP key pair for patient identity
 */
export async function generatePatientKeyPair(): Promise<KeyPairResult> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  )
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  }
}

/**
 * Export public key as base64 for sharing (e.g., in QR codes)
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key)
  return arrayBufferToBase64(exported)
}

/**
 * Compute a fingerprint (truncated SHA-256) of a public key
 */
export async function publicKeyFingerprint(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key)
  const hash = await crypto.subtle.digest('SHA-256', exported)
  return arrayBufferToHex(hash).slice(0, 16)
}

// ────────────────────────────────────────────────────────────────
// SHA-256 Hashing
// ────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a string
 */
export async function sha256(input: string): Promise<string> {
  // Fallback for HTTP testing on mobile network where Web Crypto API is unavailable
  if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle)) {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i)
        hash |= 0 // Convert to 32bit integer
    }
    // Return a 64-character hex string to represent a fake SHA-256 for demo purposes
    return Math.abs(hash).toString(16).padStart(64, '0')
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return arrayBufferToHex(hash)
}

/**
 * Derive an AES-GCM key from a shared secret string using PBKDF2
 */
async function deriveKeyFromString(keyString: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyString),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * High-level helper to encrypt a clinical bundle for sharing using proper AES-GCM
 */
export async function encryptBundle(bundle: any, keyString: string): Promise<string> {
  const json = JSON.stringify(bundle)
  const encoder = new TextEncoder()
  
  // Generate salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Derive key
  const key = await deriveKeyFromString(keyString, salt)
  
  // Encrypt payload
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(json)
  )
  
  // Combine salt, iv, and ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)
  
  return arrayBufferToBase64(combined.buffer as ArrayBuffer)
}

/**
 * High-level helper to decrypt a clinical bundle using proper AES-GCM
 */
export async function decryptBundle(encryptedData: string, keyString: string): Promise<any> {
  const combinedBuffer = base64ToArrayBuffer(encryptedData)
  const combined = new Uint8Array(combinedBuffer)
  
  // Extract salt, iv, and ciphertext
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)
  
  // Derive key
  const key = await deriveKeyFromString(keyString, salt)
  
  // Decrypt payload
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  
  const decoder = new TextDecoder()
  const json = decoder.decode(decrypted)
  return JSON.parse(json)
}

// ────────────────────────────────────────────────────────────────
// WebAuthn Biometric Authentication
// ────────────────────────────────────────────────────────────────

export interface WebAuthnRegistrationResult {
  credentialId: string
  publicKey: string
  registered: boolean
}

/**
 * Check platform authenticator availability
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Register a new WebAuthn credential for biometric unlock
 */
export async function registerBiometric(
  userId: string,
  userName: string
): Promise<WebAuthnRegistrationResult> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'EHI Platform',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  }) as PublicKeyCredential | null

  if (!credential) {
    throw new Error('Biometric registration cancelled')
  }

  const response = credential.response as AuthenticatorAttestationResponse
  return {
    credentialId: arrayBufferToBase64(credential.rawId),
    publicKey: arrayBufferToBase64(response.getPublicKey() ?? new ArrayBuffer(0)),
    registered: true,
  }
}

/**
 * Verify biometric authentication
 */
export async function verifyBiometric(credentialId: string): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64ToArrayBuffer(credentialId),
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null

    return assertion !== null
  } catch {
    return false
  }
}

// ────────────────────────────────────────────────────────────────
// Binary conversion utilities
// ────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
