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
    
    // Remove the deck from user's saved decks
    const { error: deleteError } = await supabase
      .from('saved_decks')
      .delete()
      .eq('user_id', userId)
      .eq('deck_id', deckId)

    if (deleteError) {
      console.error('Error removing saved deck:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove saved deck', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Deck removed from saved decks' 
    })
  } catch (error) {
    console.error('Remove saved deck error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
