import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { generateEncryptedAccessToken, generateEncryptedRefreshToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=google_oauth_denied`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=google_oauth_failed`
      )
    }

    // Exchange code for tokens
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    )

    const { tokens } = await client.getToken(code)
    
    if (!tokens.id_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=google_oauth_failed`
      )
    }

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    
    if (!payload || !payload.email || !payload.sub) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=google_oauth_failed`
      )
    }

    const supabase = getSupabaseAdmin()

    // Check if user exists by Google ID or email
    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', payload.sub)
      .single()

    // If not found by Google ID, check by email
    if (!existingUser) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', payload.email)
        .single()

      if (userByEmail) {
        // Link Google account to existing user
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            google_id: payload.sub,
            auth_provider: 'google',
            avatar_url: payload.picture
          })
          .eq('id', userByEmail.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error linking Google account:', updateError)
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/?error=google_oauth_failed`
          )
        }

        existingUser = updatedUser
      }
    }

    // Create new user if doesn't exist
    if (!existingUser) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          google_id: payload.sub,
          email: payload.email,
          username: payload.name || payload.email.split('@')[0],
          avatar_url: payload.picture,
          auth_provider: 'google'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating Google user:', createError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/?error=google_oauth_failed`
        )
      }

      existingUser = newUser
    }

    // Generate encrypted JWT tokens
    const accessToken = await generateEncryptedAccessToken({
      userId: existingUser.id,
      username: existingUser.username
    })
    
    const refreshToken = await generateEncryptedRefreshToken(existingUser.id)

    // Create response with redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?google_auth_success=true`
    )

    // Set secure HTTP-only cookies
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=google_oauth_failed`
    )
  }
}
