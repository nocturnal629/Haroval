import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cache, CacheKeys } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, originalDeckId, duplicatedDeckId } = await request.json()

    if (!userId || !originalDeckId || !duplicatedDeckId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Record the duplication
    const { data, error } = await supabase
      .from('deck_duplications')
      .insert({
        user_id: userId,
        original_deck_id: originalDeckId,
        duplicated_deck_id: duplicatedDeckId
      })

    if (error) {
      console.error('Error recording deck duplication:', error)
      return NextResponse.json(
        { error: 'Failed to record duplication' },
        { status: 500 }
      )
    }

    // Invalidate shared decks cache for this user
    cache.delete(CacheKeys.sharedDecks(userId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in duplicate endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
