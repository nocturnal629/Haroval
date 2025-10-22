import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}

// Convert base64 key to buffer
const key = Buffer.from(ENCRYPTION_KEY, 'base64')

/**
 * Encrypt a string using AES-256-GCM encryption
 */
export function encryptToken(token: string): string {
  try {
    // Generate a random IV
    const iv = crypto.randomBytes(16)
    
    // Create cipher with explicit algorithm, key, and IV
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    
    // Encrypt the token
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Get the auth tag
    const authTag = cipher.getAuthTag()
    
    // Combine IV, auth tag, and encrypted data
    const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
    
    return combined
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt token')
  }
}

/**
 * Decrypt a string using AES-256-GCM decryption
 */
export function decryptToken(encryptedToken: string): string {
  try {
    // URL decode the token first (in case colons were URL encoded)
    const decodedToken = decodeURIComponent(encryptedToken)
    
    // Split the combined data (no base64 decoding needed)
    const parts = decodedToken.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    // Create decipher with explicit algorithm, key, and IV
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    
    // Decrypt the token
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt token')
  }
}

/**
 * Generate a new encryption key (for initial setup)
 * This should be run once to generate the key and stored securely
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64')
}
