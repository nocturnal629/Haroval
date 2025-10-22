import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cache, CacheKeys, invalidateUserCache } from '@/lib/cache'
import { verifyEncryptedAccessToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get access token from header (set by middleware)
    const accessToken = request.headers.get('x-access-token')
    
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

    const userId = payload.userId
    const cacheKey = CacheKeys.userDashboard(userId)
    
    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    const supabase = getSupabaseAdmin()

    // Fetch user's own decks with card counts
    const { data: ownDecks, error: ownDecksError } = await supabase
      .from('decks')
      .select(`
        *,
        flashcards(count)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (ownDecksError) {
      console.error('Own decks fetch error:', ownDecksError)
      return NextResponse.json(
        { error: 'Failed to fetch own decks', details: ownDecksError.message },
        { status: 500 }
      )
    }

    // Fetch user's saved shared decks with card counts
    const { data: savedDecks, error: savedDecksError } = await supabase
      .from('saved_decks')
      .select(`
        deck_id,
        saved_at,
        decks!inner(
          id,
          title,
          description,
          visibility,
          created_at,
          owner_id,
          flashcards(count)
        )
      `)
      .eq('user_id', userId)
      .neq('decks.owner_id', userId) // Exclude decks owned by the current user
      .order('saved_at', { ascending: false })

    if (savedDecksError) {
      console.error('Saved decks fetch error:', savedDecksError)
      return NextResponse.json(
        { error: 'Failed to fetch saved decks', details: savedDecksError.message },
        { status: 500 }
      )
    }

    // Transform the data
    const ownDecksData = (ownDecks || []).map((deck: any) => ({
      ...deck,
      cardCount: deck.flashcards?.[0]?.count || 0
    }))

    const savedDecksData = (savedDecks || []).map((item: any) => ({
      id: item.decks.id,
      title: item.decks.title,
      description: item.decks.description,
      visibility: item.decks.visibility,
      created_at: item.decks.created_at,
      owner_id: item.decks.owner_id,
      saved_at: item.saved_at,
      cardCount: item.decks.flashcards?.[0]?.count || 0
    }))

    const result = {
      ownDecks: ownDecksData,
      savedDecks: savedDecksData
    }

    // Cache the result for 5 minutes
    cache.set(cacheKey, result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
