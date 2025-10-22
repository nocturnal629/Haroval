import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cache, CacheKeys } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const { deckId } = params
    const cacheKey = CacheKeys.deckCards(deckId)
    
    // Check cache first
    const cachedCards = cache.get(cacheKey)
    if (cachedCards) {
      return NextResponse.json({ cards: cachedCards })
    }

    const supabase = getSupabaseAdmin()
    const { data: cards, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position')

    if (error) {
      console.error('Cards fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cards', details: error.message },
        { status: 500 }
      )
    }

    const cardsData = cards || []
    // Cache the result for 5 minutes
    cache.set(cacheKey, cardsData)

    return NextResponse.json({ cards: cardsData })
  } catch (error) {
    console.error('Cards fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const { deckId } = params
    const { front, back, position } = await request.json()

    if (!front || !back) {
      return NextResponse.json(
        { error: 'Front and back are required' },
        { status: 400 }
      )
    }

    // Validate character limits
    if (front.length > 150) {
      return NextResponse.json(
        { error: 'Front text must be 150 characters or less' },
        { status: 400 }
      )
    }
    if (back.length > 150) {
      return NextResponse.json(
        { error: 'Back text must be 150 characters or less' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: card, error } = await supabase
      .from('flashcards')
      .insert({
        deck_id: deckId,
        front,
        back,
        position: position || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Card creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create card', details: error.message },
        { status: 500 }
      )
    }

    // Invalidate deck cards cache and deck cache
    const cardsCacheKey = CacheKeys.deckCards(deckId)
    const deckCacheKey = CacheKeys.deck(deckId)
    cache.delete(cardsCacheKey)
    cache.delete(deckCacheKey)

    return NextResponse.json({ card })
  } catch (error) {
    console.error('Card creation error:', error)
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

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('deck_id', deckId)

    if (error) {
      console.error('Cards deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete cards', details: error.message },
        { status: 500 }
      )
    }

    // Invalidate deck cards cache and deck cache
    const cardsCacheKey = CacheKeys.deckCards(deckId)
    const deckCacheKey = CacheKeys.deck(deckId)
    cache.delete(cardsCacheKey)
    cache.delete(deckCacheKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cards deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}