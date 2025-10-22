import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, deckId } = await request.json()

    if (!userId || !deckId) {
      return NextResponse.json(
        { error: 'User ID and Deck ID are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Check if the deck exists and is shared
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id, title, description, visibility, owner_id')
      .eq('id', deckId)
      .single()

    if (deckError || !deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    if (deck.visibility !== 'shared') {
      return NextResponse.json(
        { error: 'Only shared decks can be saved' },
        { status: 400 }
      )
    }

    // Prevent users from saving their own decks
    if (deck.owner_id === userId) {
      return NextResponse.json(
        { error: 'You cannot save your own deck' },
        { status: 400 }
      )
    }

    // Check if user has already saved this deck
    const { data: existingSave, error: checkError } = await supabase
      .from('saved_decks')
      .select('id')
      .eq('user_id', userId)
      .eq('deck_id', deckId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing save:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing save' },
        { status: 500 }
      )
    }

    if (existingSave) {
      return NextResponse.json(
        { error: 'Deck already saved' },
        { status: 409 }
      )
    }

    // Save the deck to user's saved decks
    const { data: savedDeck, error: saveError } = await supabase
      .from('saved_decks')
      .insert({
        user_id: userId,
        deck_id: deckId,
        saved_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving deck:', saveError)
      return NextResponse.json(
        { error: 'Failed to save deck', details: saveError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      savedDeck,
      message: 'Deck saved successfully' 
    })
  } catch (error) {
    console.error('Save deck error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
