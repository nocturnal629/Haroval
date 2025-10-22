import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cache, CacheKeys, invalidateUserCache } from '@/lib/cache'
import { verifyEncryptedAccessToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { title, description, owner_id } = await request.json()

            if (!title || !owner_id) {
              return NextResponse.json(
                { error: 'Title and owner_id are required' },
                { status: 400 }
              )
            }

            // Validate character limits
            if (title.length > 50) {
              return NextResponse.json(
                { error: 'Deck title must be 50 characters or less' },
                { status: 400 }
              )
            }
            if (description && description.length > 150) {
              return NextResponse.json(
                { error: 'Deck description must be 150 characters or less' },
                { status: 400 }
              )
            }

    const supabase = getSupabaseAdmin()
    const { data: deck, error } = await supabase
      .from('decks')
      .insert({
        title,
        description: description || '',
        owner_id
      })
      .select()
      .single()

    if (error) {
      console.error('Deck creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create deck', details: error.message },
        { status: 500 }
      )
    }

    // Invalidate user's deck cache
    invalidateUserCache(owner_id)

    return NextResponse.json({ deck })
  } catch (error) {
    console.error('Deck creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visibility = searchParams.get('visibility')
    const exclude_owner = searchParams.get('exclude_owner')
    
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

    // Handle shared decks request
    if (visibility && visibility.includes('public,shared')) {
      const excludeUserId = userId || exclude_owner
      const cacheKey = CacheKeys.sharedDecks(excludeUserId || undefined)
      
      // Check cache first
      const cachedDecks = cache.get(cacheKey)
      if (cachedDecks) {
        return NextResponse.json({ decks: cachedDecks })
      }

      const supabase = getSupabaseAdmin()
      
      // Only show decks that the user has duplicated
        const { data: duplications, error: duplicationsError } = await supabase
          .from('deck_duplications')
          .select('original_deck_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

      if (duplicationsError) {
        console.error('Duplications fetch error:', duplicationsError)
        return NextResponse.json(
          { error: 'Failed to fetch duplications', details: duplicationsError.message },
          { status: 500 }
        )
      }

      if (!duplications || duplications.length === 0) {
        return NextResponse.json({ decks: [] })
      }

      // Get the original deck IDs
      const originalDeckIds = duplications.map((dup: any) => dup.original_deck_id)

      // Fetch the actual deck data
      const { data: decks, error: decksError } = await supabase
        .from('decks')
        .select('*')
        .in('id', originalDeckIds)
        .order('created_at', { ascending: false })

      if (decksError) {
        console.error('Decks fetch error:', decksError)
        return NextResponse.json(
          { error: 'Failed to fetch decks', details: decksError.message },
          { status: 500 }
        )
      }

      const decksData = decks || []
      
      // Cache the result for 5 minutes
      cache.set(cacheKey, decksData)

      return NextResponse.json({ decks: decksData })
    }

    // Handle user's own decks request
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not provided' },
        { status: 400 }
      )
    }

    const cacheKey = CacheKeys.userDecks(userId)
    
    // Check cache first
    const cachedDecks = cache.get(cacheKey)
    if (cachedDecks) {
      return NextResponse.json({ decks: cachedDecks })
    }

    const supabase = getSupabaseAdmin()
    const { data: decks, error } = await supabase
      .from('decks')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Deck fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch decks', details: error.message },
        { status: 500 }
      )
    }

    const decksData = decks || []
    // Cache the result for 5 minutes
    cache.set(cacheKey, decksData)

    return NextResponse.json({ decks: decksData })
  } catch (error) {
    console.error('Deck fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
