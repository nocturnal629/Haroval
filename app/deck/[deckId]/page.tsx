'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/lib/auth'

export default function StudyDeck() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [deck, setDeck] = useState<any>(null)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studyMode, setStudyMode] = useState(false)
  const [showEditCards, setShowEditCards] = useState(false)
  const [editingCards, setEditingCards] = useState<Array<{ id?: string; front: string; back: string; position: number }>>([])
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Define openEditModal before useEffect that calls it
  const openEditModal = useCallback(async () => {
    // If flashcards are empty, try to fetch them first
    if (flashcards.length === 0) {
      try {
        const response = await fetch(`/api/decks/${params.deckId}/cards`, {
          credentials: 'include' // Include cookies for JWT authentication
        })
        const result = await response.json()

        if (!response.ok) {
          console.error('Error fetching cards:', result.error)
          // Set empty input row even if there's an error
          setEditingCards([{ front: '', back: '', position: 0 }])
        } else if (result.cards && result.cards.length > 0) {
          setFlashcards(result.cards)
          setEditingCards(result.cards.map((card: any) => ({
            id: card.id,
            front: card.front,
            back: card.back,
            position: card.position
          })))
        } else {
          // No cards found, start with empty input row
          setEditingCards([{ front: '', back: '', position: 0 }])
        }
      } catch (error) {
        console.error('Error fetching cards:', error)
        // Set empty input row even if there's an error
        setEditingCards([{ front: '', back: '', position: 0 }])
      }
    } else {
      // Use existing flashcards
      setEditingCards(flashcards.map((card: any) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        position: card.position
      })))
    }

    setShowEditCards(true)
  }, [flashcards, params.deckId])

  const fetchDeckAndCards = useCallback(async () => {
    try {
      // Fetch deck with ownership info
      const userId = user?.id
      const response = await fetch(`/api/decks/${params.deckId}?user=${userId}`, {
        credentials: 'include' // Include cookies for JWT authentication
      })
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          // Private deck access denied
          setDeck(null)
          return
        }
        console.error('Error fetching deck:', result.error)
        return
      }

      setDeck(result.deck)

      // Fetch flashcards
      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', params.deckId)
        .order('position')

      if (cardsError) {
        console.error('Error fetching flashcards:', cardsError)
      } else {
        // Shuffle flashcards for random study order
        const shuffledCards = cardsData ? [...cardsData].sort(() => Math.random() - 0.5) : []
        setFlashcards(shuffledCards)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, params.deckId])

  useEffect(() => {
    if (user) {
      fetchDeckAndCards()
    }
  }, [params.deckId, user, fetchDeckAndCards])


  useEffect(() => {
    if (searchParams?.get('study') === '1' && flashcards.length > 0) {
      startStudy()
    }
  }, [searchParams, flashcards])


  const startStudy = () => {
    setStudyMode(true)
    setCurrentCardIndex(0)
    setShowAnswer(false)
  }

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setShowAnswer(false)
    } else {
      // End of deck - redirect to dashboard
      router.push('/')
    }
  }

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
      setShowAnswer(false)
    }
  }

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-b-purple-600 dark:border-b-purple-400 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-xl font-semibold gradient-text">Loading deck...</div>
        </div>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-pink-300/30 dark:bg-pink-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Access Denied</h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">This deck is private and you don&apos;t have permission to view it.</p>
            <button
              onClick={() => window.history.back()}
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const createShareLink = async () => {
    try {
      const response = await fetch(`/api/decks/${params.deckId}/share`, {
        method: 'POST'
      })
      const result = await response.json()
      
      if (response.ok) {
        setShareUrl(result.shareUrl)
        setShowShareModal(true)
      } else {
        console.error('Error creating share link:', result.error)
      }
    } catch (err) {
      console.error('Error creating share link:', err)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const addCardRow = () => setEditingCards([...editingCards, { front: '', back: '', position: editingCards.length }])
  const updateCardRow = (i: number, field: 'front' | 'back', value: string) => {
    const copy = [...editingCards]
    copy[i] = { ...copy[i], [field]: value }
    setEditingCards(copy)
  }
  const removeCardRow = (i: number) => {
    const copy = [...editingCards]
    copy.splice(i, 1)
    // Update positions
    const updatedCopy = copy.map((card, index) => ({ ...card, position: index }))
    setEditingCards(updatedCopy.length ? updatedCopy : [{ front: '', back: '', position: 0 }])
  }

  const loadExistingCards = async () => {
    console.log('loadExistingCards called, flashcards length:', flashcards.length)
    setIsLoadingCards(true)
    
    // Add a small delay to ensure state is updated
    setTimeout(() => {
      try {
        console.log('Loading cards for deck:', params.deckId, 'Cards from state:', flashcards)
        
        // Use the existing flashcards state instead of making a new database call
        const cardsWithPosition = flashcards.map((card, index) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          position: index
        }))
        
        console.log('Cards with position:', cardsWithPosition)
        console.log('Setting editingCards to:', cardsWithPosition.length ? cardsWithPosition : [{ front: '', back: '', position: 0 }])
        setEditingCards(cardsWithPosition.length ? cardsWithPosition : [{ front: '', back: '', position: 0 }])
        setIsLoadingCards(false)
      } catch (err) {
        console.error('Error loading cards:', err)
        setIsLoadingCards(false)
      }
    }, 100)
  }


  const deleteDeck = async () => {
    try {
      if (!user?.id) {
        console.error('User not authenticated')
        return
      }

      // Delete all cards first
      await supabase.from('flashcards').delete().eq('deck_id', params.deckId)
      
      // Delete the deck
      const { error: deckError } = await supabase
        .from('decks')
        .delete()
        .eq('id', params.deckId)
        .eq('owner_id', user.id)

      if (deckError) {
        console.error('Error deleting deck:', deckError)
        return
      }

      // Close modal and redirect back to dashboard
      setShowDeleteModal(false)
      router.push('/')
    } catch (error) {
      console.error('Error deleting deck:', error)
    }
  }

  const saveCards = async () => {
    // Prevent multiple simultaneous saves
    if (isSaving) return
    
    setIsSaving(true)
    try {
      if (!user?.id) {
        console.error('User not authenticated')
        return
      }

      // Validate character limits
      const invalidCards = editingCards.filter(card => 
        card.front.length > 150 || card.back.length > 150
      )
      
      if (invalidCards.length > 0) {
        alert('Flashcard questions and answers must be 150 characters or less')
        return
      }

      // Filter out empty cards and prepare data
      const validCards = editingCards
        .map((c, idx) => ({ 
          front: c.front.trim(), 
          back: c.back.trim(), 
          position: idx
        }))
        .filter(c => c.front && c.back)

      // Use bulk update API instead of delete + insert
      const response = await fetch(`/api/decks/${params.deckId}/cards/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ cards: validCards })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error saving flashcards:', errorData)
        alert('Failed to save flashcards. Please try again.')
        return
      }

      // Refresh deck and cards data
      await fetchDeckAndCards()
      setShowEditCards(false)
      
      // Trigger a refresh of the dashboard cache by calling the parent window's refresh function
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REFRESH_DASHBOARD' }, '*')
      }
    } catch (err) {
      console.error('Error saving flashcards:', err)
      alert('Failed to save flashcards. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-pink-300/30 dark:bg-pink-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 py-16">
          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="group flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-semibold transition-colors"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>

           <div className="glass rounded-3xl p-12 text-center shadow-2xl border-2 border-purple-100 dark:border-gray-700 overflow-hidden relative">
             
             <h1 className="text-4xl font-black gradient-text mb-4 leading-tight">{deck.title}</h1>
             {deck.description && (
               <p className="text-gray-700 dark:text-gray-300 mb-10 text-lg">{deck.description}</p>
             )}
             <div className="relative inline-block mb-8">
               <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-30"></div>
               <div className="relative w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-purple-900/50 rounded-3xl flex items-center justify-center mx-auto">
                 <svg className="w-12 h-12 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                 </svg>
               </div>
             </div>
             <p className="text-xl text-gray-700 dark:text-gray-300 mb-10 font-semibold">No flashcards in this deck yet</p>
             <div className="flex gap-4 justify-center">
               {deck?.canEdit && (
                 <button
                   onClick={openEditModal}
                   className="inline-flex bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white px-10 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow items-center justify-center"
                 >
                   Edit Flashcards
                 </button>
               )}
               <button
                 onClick={createShareLink}
                 className="inline-flex bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white px-10 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow items-center gap-2"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                 </svg>
                 Share
               </button>
             </div>
           </div>
        </div>

        {/* Edit Flashcards Modal */}
        {showEditCards && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-3xl shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Edit Flashcards</h3>
                <button onClick={() => setShowEditCards(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
                {editingCards.map((card, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    <input
                      value={card.front}
                      onChange={(e) => updateCardRow(i, 'front', e.target.value)}
                      placeholder="Front (question)"
                      maxLength={150}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base hover:border-gray-300 dark:hover:border-gray-500"
                    />
                    <div className="flex gap-3">
                      <input
                        value={card.back}
                        onChange={(e) => updateCardRow(i, 'back', e.target.value)}
                        placeholder="Back (answer)"
                        maxLength={150}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base hover:border-gray-300 dark:hover:border-gray-500"
                      />
                      <button type="button" onClick={() => removeCardRow(i)} className="px-3 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 7V5a2 2 0 012-2h0a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6">
                <button type="button" onClick={addCardRow} className="px-5 py-3 text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20">
                  + Add another
                </button>
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={saveCards} 
                    disabled={isSaving}
                    className={`px-6 py-3 font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white'
                    }`}
                  >
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Deck Modal - Global Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-red-100 dark:border-red-900/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-600 to-red-700"></div>
              <div className="relative mb-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center">Delete Deck</h3>
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="absolute top-0 right-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-8">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">&quot;{deck?.title}&quot;</span>?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 text-center font-semibold">
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteDeck}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Delete Deck
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!studyMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-pink-300/30 dark:bg-pink-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 py-16">
          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="group flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-semibold transition-colors"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>

          <div className="glass rounded-3xl p-12 shadow-2xl border-2 border-purple-100 dark:border-gray-700 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
            
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black gradient-text mb-6 animate-gradient leading-tight">{deck.title}</h1>
              {deck.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg font-medium">{deck.description}</p>
              )}
              <div className="inline-flex items-baseline space-x-2 bg-purple-100/80 dark:bg-purple-900/30 px-6 py-3 rounded-full">
                <span className="text-2xl font-black gradient-text">{flashcards.length}</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{flashcards.length === 1 ? 'flashcard' : 'flashcards'}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startStudy}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow"
              >
                Study
              </button>
              {deck?.canEdit && (
                <button
                  onClick={openEditModal}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow"
                >
                  Edit Flashcards
                </button>
              )}
              <button
                onClick={createShareLink}
                className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Edit Flashcards Modal */}
        {showEditCards && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-3xl shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Edit Flashcards</h3>
                <button onClick={() => setShowEditCards(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
                {editingCards.map((card, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    <input
                      value={card.front}
                      onChange={(e) => updateCardRow(i, 'front', e.target.value)}
                      placeholder="Front (question)"
                      maxLength={150}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base hover:border-gray-300 dark:hover:border-gray-500"
                    />
                    <div className="flex gap-3">
                      <input
                        value={card.back}
                        onChange={(e) => updateCardRow(i, 'back', e.target.value)}
                        placeholder="Back (answer)"
                        maxLength={150}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base hover:border-gray-300 dark:hover:border-gray-500"
                      />
                      <button type="button" onClick={() => removeCardRow(i)} className="px-3 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 7V5a2 2 0 012-2h0a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6">
                <button type="button" onClick={addCardRow} className="px-5 py-3 text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20">
                  + Add another
                </button>
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={saveCards} 
                    disabled={isSaving}
                    className={`px-6 py-3 font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white'
                    }`}
                  >
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Deck Modal - Global Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-red-100 dark:border-red-900/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-600 to-red-700"></div>
              <div className="relative mb-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center">Delete Deck</h3>
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="absolute top-0 right-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-8">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">&quot;{deck?.title}&quot;</span>?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 text-center font-semibold">
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteDeck}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Delete Deck
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const currentCard = flashcards[currentCardIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-pink-300/30 dark:bg-pink-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {showEditCards && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-3xl shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Edit Flashcards</h3>
                <button onClick={() => setShowEditCards(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
                {editingCards.map((card, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    <input
                      value={card.front}
                      onChange={(e) => updateCardRow(i, 'front', e.target.value)}
                      placeholder="Front (question)"
                      maxLength={150}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base hover:border-gray-300 dark:hover:border-gray-500"
                    />
                    <div className="flex gap-3">
                      <input
                        value={card.back}
                        onChange={(e) => updateCardRow(i, 'back', e.target.value)}
                        placeholder="Back (answer)"
                        maxLength={150}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base hover:border-gray-300 dark:hover:border-gray-500"
                      />
                      <button type="button" onClick={() => removeCardRow(i)} className="px-3 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 7V5a2 2 0 012-2h0a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6">
                <button type="button" onClick={addCardRow} className="px-5 py-3 text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20">
                  + Add another
                </button>
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={saveCards} 
                    disabled={isSaving}
                    className={`px-6 py-3 font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white'
                    }`}
                  >
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="glass rounded-2xl p-6 mb-8 border border-purple-100/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="group p-2.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-xl transition-all"
              >
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-violet-700 dark:group-hover:text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{deck.title}</h1>
                <p className="text-purple-600 dark:text-purple-400 font-semibold text-sm">Study Session</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
            <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
            <span className="text-purple-600 dark:text-purple-400">{Math.round(((currentCardIndex + 1) / flashcards.length) * 100)}% Complete</span>
          </div>
          <div className="relative w-full bg-violet-200/50 dark:bg-violet-900/30 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/20 dark:bg-white/10 animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Flashcard */}
        <div className="relative group mb-12">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-3xl blur-lg opacity-15 group-hover:opacity-25 transition duration-300"></div>
          <div className="relative glass rounded-3xl p-12 min-h-[500px] flex flex-col justify-center overflow-hidden border-2 border-purple-100 dark:border-gray-700 shadow-2xl">
            {/* Decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-t-3xl"></div>
            
            {/* Card Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600 rounded-full -translate-y-20 translate-x-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-600 rounded-full translate-y-16 -translate-x-16"></div>
            </div>
            
            <div className="text-center relative z-10">
              <div className="mb-10">
                <span className={`inline-flex items-center px-6 py-2.5 rounded-full text-sm font-bold ${
                  showAnswer 
                    ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-violet-900/30 dark:to-purple-900/30 text-violet-700 dark:text-violet-300' 
                    : 'bg-gradient-to-r from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/30 text-purple-700 dark:text-purple-300'
                }`}>
                  {showAnswer ? '✓ Answer' : '? Question'}
                </span>
              </div>
              <div className="text-4xl text-gray-900 dark:text-white mb-14 leading-relaxed font-semibold px-4">
                {showAnswer ? currentCard.back : currentCard.front}
              </div>
              <button
                onClick={toggleAnswer}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow"
              >
                {showAnswer ? 'Show Question' : 'Reveal Answer'}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={previousCard}
            disabled={currentCardIndex === 0}
            className="group flex items-center space-x-2 glass hover:bg-white/90 dark:hover:bg-gray-800/90 disabled:opacity-40 disabled:cursor-not-allowed text-gray-800 dark:text-gray-200 px-8 py-4 rounded-2xl font-bold transition-all duration-200 hover:scale-105 border-2 border-purple-200/50 dark:border-gray-600/50 hover:border-purple-300 dark:hover:border-gray-500 disabled:hover:scale-100"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>

          <button
            onClick={nextCard}
            className="group flex items-center space-x-2 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-10 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow"
          >
            <span>{currentCardIndex === flashcards.length - 1 ? 'Finish' : 'Next'}</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Share Deck</h3>
                <button 
                  onClick={() => setShowShareModal(false)} 
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Share this deck with others using the link below:
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-mono text-gray-800 dark:text-gray-200"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold mb-1">Note:</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This deck will be set to &quot;Shared&quot; visibility, making it accessible to anyone with the link.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  )
}

