import { NextRequest, NextResponse } from 'next/server'
import { verifyEncryptedAccessToken } from '@/lib/jwt'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cache, CacheKeys } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const accessToken = request.cookies.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not found' },
        { status: 401 }
      )
    }

    // Verify encrypted access token
    const payload = await verifyEncryptedAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      )
    }

    // Check cache first
    const cacheKey = CacheKeys.user(payload.userId)
    const cachedUser = cache.get(cacheKey)
    if (cachedUser && typeof cachedUser === 'object' && 'id' in cachedUser && 'username' in cachedUser) {
      return NextResponse.json({
        user: {
          id: cachedUser.id,
          username: cachedUser.username
        }
      })
    }

    const supabase = getSupabaseAdmin()
    
    // Get user data from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', payload.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Cache the user data for 5 minutes
    cache.set(cacheKey, user)

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username
      }
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
