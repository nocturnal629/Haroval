import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const { deckId } = params
    const { forceRegenerate } = await request.json()

    // Verify the deck exists and belongs to the user
    const { data: deck, error: deckError } = await supabaseAdmin
      .from('decks')
      .select('id, owner_id, visibility, share_id')
      .eq('id', deckId)
      .single()

    if (deckError || !deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Check if deck already has a share ID and forceRegenerate is not true
    if (deck.share_id && !forceRegenerate) {
      return NextResponse.json({
        shareId: deck.share_id,
        shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/shared/${deck.share_id}`
      })
    }

    // Generate a unique share ID (new or first time)
    const shareId = createHash('sha256')
      .update(deckId + Date.now().toString())
      .digest('hex')
      .substring(0, 16)

    // Update the deck with the share ID and set visibility to shared
    const { data: updatedDeck, error: updateError } = await supabaseAdmin
      .from('decks')
      .update({ 
        share_id: shareId,
        visibility: 'shared'
      })
      .eq('id', deckId)
      .select('share_id')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      shareId: updatedDeck.share_id,
      shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/shared/${updatedDeck.share_id}`
    })

  } catch (error) {
    console.error('Error creating share link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
