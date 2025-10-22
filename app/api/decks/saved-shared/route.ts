import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Get user's saved decks with deck details, excluding decks owned by the user
    const { data: savedDecks, error } = await supabase
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
          owner_id
        )
      `)
      .eq('user_id', userId)
      .neq('decks.owner_id', userId) // Exclude decks owned by the current user
      .order('saved_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved decks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved decks', details: error.message },
        { status: 500 }
      )
    }

    // Transform the data to match the expected format
    const decks = savedDecks?.map((item: any) => ({
      id: item.decks.id,
      title: item.decks.title,
      description: item.decks.description,
      visibility: item.decks.visibility,
      created_at: item.decks.created_at,
      owner_id: item.decks.owner_id,
      saved_at: item.saved_at
    })) || []

    return NextResponse.json({ decks })
  } catch (error) {
    console.error('Fetch saved decks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
