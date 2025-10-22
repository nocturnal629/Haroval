import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cache, CacheKeys, invalidateUserCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const { deckId } = params
    const { cards } = await request.json()

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json(
        { error: 'Cards array is required' },
        { status: 400 }
      )
    }

    // Validate character limits
    const invalidCards = cards.filter((card: any) => 
      card.front.length > 150 || card.back.length > 150
    )
    
    if (invalidCards.length > 0) {
      return NextResponse.json(
        { error: 'Flashcard questions and answers must be 150 characters or less' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // First, get the deck to check ownership
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('owner_id')
      .eq('id', deckId)
      .single()

    if (deckError || !deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Delete all existing cards for this deck
    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('deck_id', deckId)

    if (deleteError) {
      console.error('Cards deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete existing cards', details: deleteError.message },
        { status: 500 }
      )
    }

    // Insert all new cards in a single transaction
    if (cards.length > 0) {
      const cardsToInsert = cards.map((card: any, index: number) => ({
        deck_id: deckId,
        front: card.front.trim(),
        back: card.back.trim(),
        position: index
      }))

      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(cardsToInsert)

      if (insertError) {
        console.error('Cards insertion error:', insertError)
        return NextResponse.json(
          { error: 'Failed to insert cards', details: insertError.message },
          { status: 500 }
        )
      }
    }

    // Invalidate relevant caches
    cache.delete(CacheKeys.deckCards(deckId))
    cache.delete(CacheKeys.deck(deckId))
    invalidateUserCache(deck.owner_id)

    return NextResponse.json({ 
      success: true, 
      message: `Successfully saved ${cards.length} flashcards` 
    })
  } catch (error) {
    console.error('Bulk cards update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
