import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cache, CacheKeys, invalidateUserCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const { deckId } = params
    const { searchParams } = new URL(request.url)
    const currentUser = searchParams.get('user')

    const cacheKey = CacheKeys.deck(deckId)
    
    // Check cache first
    const cachedDeck = cache.get(cacheKey)
    if (cachedDeck && typeof cachedDeck === 'object' && 'owner_id' in cachedDeck && 'visibility' in cachedDeck) {
      // Check visibility and ownership for cached deck
      const isOwner = currentUser && cachedDeck.owner_id === currentUser
      
      if (cachedDeck.visibility === 'private' && !isOwner) {
        return NextResponse.json(
          { error: 'This deck is private' },
          { status: 403 }
        )
      }
      
      // If cached deck doesn't have flashcards count, fetch it
      let cardCount = 0
      if ('flashcards' in cachedDeck && Array.isArray((cachedDeck as any).flashcards)) {
        cardCount = (cachedDeck as any).flashcards[0]?.count || 0
      } else {
        // Fetch card count from database if not in cache
        const supabase = getSupabaseAdmin()
        const { count } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('deck_id', deckId)
        cardCount = count || 0
      }
      
      const deckWithOwnership = {
        ...cachedDeck,
        cardCount,
        isOwner,
        canEdit: isOwner
      }

      return NextResponse.json({ deck: deckWithOwnership })
    }

    const supabase = getSupabaseAdmin()
    const { data: deck, error } = await supabase
      .from('decks')
      .select(`
        *,
        flashcards(count)
      `)
      .eq('id', deckId)
      .single()

    if (error) {
      console.error('Deck fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deck', details: error.message },
        { status: 500 }
      )
    }

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Check visibility and ownership
    const isOwner = currentUser && deck.owner_id === currentUser
    
    // Enforce visibility rules
    if (deck.visibility === 'private' && !isOwner) {
      return NextResponse.json(
        { error: 'This deck is private' },
        { status: 403 }
      )
    }
    
    // For public/shared decks, non-owners can view but not edit
    const deckWithOwnership = {
      ...deck,
      cardCount: deck.flashcards?.[0]?.count || 0,
      isOwner,
      canEdit: isOwner
    }

    // Cache the deck for 5 minutes
    cache.set(cacheKey, deck)

    return NextResponse.json({ deck: deckWithOwnership })
  } catch (error) {
    console.error('Deck fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const { deckId } = params
    const { title, description, visibility, currentUser } = await request.json()

            if (!title) {
              return NextResponse.json(
                { error: 'Title is required' },
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

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // First check if the deck exists and get owner info
    const { data: existingDeck, error: fetchError } = await supabase
      .from('decks')
      .select('owner_id')
      .eq('id', deckId)
      .single()

    if (fetchError || !existingDeck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (existingDeck.owner_id !== currentUser) {
      return NextResponse.json(
        { error: 'You can only edit your own decks' },
        { status: 403 }
      )
    }
    const { data: deck, error } = await supabase
      .from('decks')
      .update({
        title,
        description: description || '',
        visibility: visibility || 'private'
      })
      .eq('id', deckId)
      .select()
      .single()

    if (error) {
      console.error('Deck update error:', error)
      return NextResponse.json(
        { error: 'Failed to update deck', details: error.message },
        { status: 500 }
      )
    }

    // Invalidate cache for this deck and user's deck list
    cache.delete(CacheKeys.deck(deckId))
    invalidateUserCache(currentUser)

    return NextResponse.json({ deck })
  } catch (error) {
    console.error('Deck update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const { deckId } = params
    const { currentUser } = await request.json()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // First check if the deck exists and get owner info
    const { data: existingDeck, error: fetchError } = await supabase
      .from('decks')
      .select('owner_id')
      .eq('id', deckId)
      .single()

    if (fetchError || !existingDeck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (existingDeck.owner_id !== currentUser) {
      return NextResponse.json(
        { error: 'You can only delete your own decks' },
        { status: 403 }
      )
    }
    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', deckId)

    if (error) {
      console.error('Deck delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete deck', details: error.message },
        { status: 500 }
      )
    }

    // Invalidate cache for this deck and user's deck list
    cache.delete(CacheKeys.deck(deckId))
    cache.delete(CacheKeys.deckCards(deckId))
    invalidateUserCache(currentUser)

    return NextResponse.json({ message: 'Deck deleted successfully' })
  } catch (error) {
    console.error('Deck delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
