import { NextRequest, NextResponse } from 'next/server'
import { generateGoogleAuthUrl } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUrl = generateGoogleAuthUrl()
    
    return NextResponse.json({ 
      authUrl,
      message: 'Redirect to this URL to start Google OAuth flow'
    })
  } catch (error) {
    console.error('Google OAuth URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Google OAuth URL' },
      { status: 500 }
    )
  }
}
