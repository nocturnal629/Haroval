import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose'
import { encryptToken, decryptToken } from './encryption'

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET

if (!process.env.SUPABASE_JWT_SECRET) {
  console.warn('SUPABASE_JWT_SECRET not found in environment variables. Using fallback secret.')
}

// Convert string secret to Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET)
const JWT_EXPIRES_IN = '7d' // Token expires in 7 days
const REFRESH_TOKEN_EXPIRES_IN = '30d' // Refresh token expires in 30 days

export interface JWTPayload {
  userId: string
  username: string
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  userId: string
  tokenType: 'refresh'
  iat?: number
  exp?: number
}

/**
 * Generate a JWT access token
 */
export async function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .setIssuer('haroval')
    .setAudience('haroval-users')
    .sign(secret)
  
  return token
}

/**
 * Generate an encrypted JWT access token
 */
export async function generateEncryptedAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await generateAccessToken(payload)
  return encryptToken(token)
}

/**
 * Generate a JWT refresh token
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  return await new SignJWT({ userId, tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .setIssuer('haroval')
    .setAudience('haroval-users')
    .sign(secret)
}

/**
 * Generate an encrypted JWT refresh token
 */
export async function generateEncryptedRefreshToken(userId: string): Promise<string> {
  const token = await generateRefreshToken(userId)
  return encryptToken(token)
}

/**
 * Verify and decode a JWT access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'haroval',
      audience: 'haroval-users'
    })
    
    return payload as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Verify and decode an encrypted JWT access token
 */
export async function verifyEncryptedAccessToken(encryptedToken: string): Promise<JWTPayload | null> {
  try {
    const token = decryptToken(encryptedToken)
    return await verifyAccessToken(token)
  } catch (error) {
    console.error('Failed to decrypt token:', error)
    return null
  }
}

/**
 * Verify and decode a JWT refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'haroval',
      audience: 'haroval-users'
    })
    
    const decoded = payload as unknown as RefreshTokenPayload
    if (decoded.tokenType !== 'refresh') {
      return null
    }
    
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Verify and decode an encrypted JWT refresh token
 */
export async function verifyEncryptedRefreshToken(encryptedToken: string): Promise<RefreshTokenPayload | null> {
  try {
    const token = decryptToken(encryptedToken)
    return await verifyRefreshToken(token)
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Simple base64 decode to check expiration without verification
    const parts = token.split('.')
    if (parts.length !== 3) return true
    
    const payload = JSON.parse(atob(parts[1]))
    if (!payload || !payload.exp) {
      return true
    }
    
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}
