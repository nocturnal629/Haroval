import { NextRequest, NextResponse } from 'next/server'
import { verifyEncryptedRefreshToken, generateEncryptedAccessToken, generateEncryptedRefreshToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      )
    }

    // Verify encrypted refresh token
    const payload = await verifyEncryptedRefreshToken(refreshToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Generate new encrypted access token
    const newAccessToken = await generateEncryptedAccessToken({
      userId: payload.userId,
      username: '' // We'll need to fetch this from database
    })

    // Optionally generate new encrypted refresh token (rotate refresh token)
    const newRefreshToken = await generateEncryptedRefreshToken(payload.userId)

    const response = NextResponse.json({
      message: 'Token refreshed successfully'
    })

    // Set new tokens as HTTP-only cookies
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
