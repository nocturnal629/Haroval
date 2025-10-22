import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Define protected routes
  const protectedRoutes = ['/api/decks', '/api/auth/profile']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Skip middleware for non-protected routes
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get access token from cookies
  const accessToken = request.cookies.get('access_token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Access token not found' },
      { status: 401 }
    )
  }

  // Pass the encrypted token to the API route for decryption
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-access-token', accessToken)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/api/decks',
    '/api/decks/:path*',
    '/api/auth/profile',
    '/api/auth/profile/:path*'
  ]
}
