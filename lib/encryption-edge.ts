// Edge Runtime compatible encryption using Web Crypto API
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}

// Convert base64 key to ArrayBuffer
const keyBuffer = Uint8Array.from(atob(ENCRYPTION_KEY), c => c.charCodeAt(0))

/**
 * Encrypt a string using AES-256-GCM encryption (Edge Runtime compatible)
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(16))
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    // Encrypt the token
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      new TextEncoder().encode(token)
    )
    
    // Convert to hex strings
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Combine IV and encrypted data (auth tag is included in encrypted data for GCM)
    const combined = ivHex + ':' + encryptedHex
    
    return combined
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt token')
  }
}

/**
 * Decrypt a string using AES-256-GCM decryption (Edge Runtime compatible)
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // URL decode the token first (in case colons were URL encoded)
    const decodedToken = decodeURIComponent(encryptedToken)
    
    // Split the combined data
    const parts = decodedToken.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted token format')
    }
    
    const ivHex = parts[0]
    const encryptedHex = parts[1]
    
    // Convert hex strings back to Uint8Array
    const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
    const encrypted = new Uint8Array(encryptedHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    
    // Decrypt the token
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    )
    
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt token')
  }
}
