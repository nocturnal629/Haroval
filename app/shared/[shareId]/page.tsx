'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ThemeToggle } from '@/components/theme-toggle'

export default function SharedDeck({ params }: { params: { shareId: string } }) {
  const router = useRouter()
  const { user, loading: authLoading, login, register, loginWithGoogle, error: authHookError } = useAuth()
  const [deck, setDeck] = useState<any>(null)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [authData, setAuthData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authModalLoading, setAuthModalLoading] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    if (code) {
      // Google OAuth was successful, refresh auth status
      window.location.reload()
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (error === 'access_denied') {
      setAuthError('Google OAuth was cancelled')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (error) {
      setAuthError('Google OAuth failed. Please try again.')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {

    const fetchSharedDeck = async () => {
      try {
        // Fetch deck by share_id
        const { data: deckData, error: deckError } = await supabase
          .from('decks')
          .select('*')
          .eq('share_id', params.shareId)
          .single()

        if (deckError) {
          setError('Deck not found or not shared')
          setLoading(false)
          return
        }

        setDeck(deckData)

        // Fetch flashcards for this deck
        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('deck_id', deckData.id)
          .order('position')

        if (flashcardsError) {
          setError('Failed to load flashcards')
          setLoading(false)
          return
        }

        setFlashcards(flashcardsData || [])
        setLoading(false)
      } catch (err) {
        setError('An error occurred while loading the deck')
        setLoading(false)
      }
    }

    fetchSharedDeck()
  }, [params.shareId])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthModalLoading(true)

    if (!isLogin && authData.password !== authData.confirmPassword) {
      setAuthError('Passwords do not match')
      setAuthModalLoading(false)
      return
    }

    try {
      const result = isLogin 
        ? await login(authData.username, authData.password)
        : await register(authData.username, authData.password, authData.confirmPassword)

      if (result.success) {
        setShowAuthModal(false)
        setAuthData({ username: '', password: '', confirmPassword: '' })
      } else {
        setAuthError(result.error || 'Authentication failed')
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed')
    } finally {
      setAuthModalLoading(false)
    }
  }

  const openAuthModal = (login: boolean) => {
    setIsLogin(login)
    setShowAuthModal(true)
    setAuthError('')
    setAuthData({ username: '', password: '', confirmPassword: '' })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setAuthModalLoading(false)
  }

  const saveDeck = async () => {
    if (!user || !deck) return

    try {
      // Add deck to user's shared decks (save it for later reference)
      const response = await fetch('/api/decks/save-shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          deckId: deck.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Save deck failed:', errorData)
        
        // If deck is already saved, treat it as success and redirect
        if (response.status === 409 && errorData.error === 'Deck already saved') {
          setAuthError('')
          router.push('/')
          return
        }
        
        setAuthError(`Failed to save deck: ${errorData.error || 'Unknown error'}`)
        return
      }

      // Clear any previous errors and redirect to dashboard
      setAuthError('')
      router.push('/')
    } catch (err) {
      console.error('Error saving deck:', err)
      setAuthError('Failed to save deck. Please try again.')
    }
  }

  const studyDeck = () => {
    if (!deck || flashcards.length === 0) return
    setStudyMode(true)
    setCurrentCardIndex(0)
    setShowAnswer(false)
  }

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
      // End of deck - exit study mode
      setStudyMode(false)
      setCurrentCardIndex(0)
      setShowAnswer(false)
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

  const exitStudy = () => {
    setStudyMode(false)
    setCurrentCardIndex(0)
    setShowAnswer(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-fuchsia-900 relative">
        {/* Theme Toggle Button */}
        <div className="fixed top-6 right-6 z-50">
          <div className="glass rounded-2xl p-2 shadow-xl border border-violet-100 dark:border-violet-800">
            <ThemeToggle />
          </div>
        </div>
        
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-b-purple-600 dark:border-b-purple-400 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-xl font-semibold gradient-text">Loading shared deck...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-fuchsia-900 relative">
        {/* Theme Toggle Button */}
        <div className="fixed top-6 right-6 z-50">
          <div className="glass rounded-2xl p-2 shadow-xl border border-violet-100 dark:border-violet-800">
            <ThemeToggle />
          </div>
        </div>
        
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50 rounded-3xl flex items-center justify-center mx-auto">
              <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Oops!</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">{error}</p>
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white px-10 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-fuchsia-900 relative">
      {/* Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <div className="glass rounded-2xl p-2 shadow-xl border border-violet-100 dark:border-violet-800">
          <ThemeToggle />
        </div>
      </div>

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-300/30 dark:bg-violet-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-300/30 dark:bg-fuchsia-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16">
        {/* Header Card */}
        <div className="glass rounded-3xl p-10 mb-10 shadow-2xl border-2 border-violet-100 dark:border-violet-800 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600"></div>
          
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="inline-flex items-center space-x-2 bg-violet-100/80 dark:bg-violet-900/50 px-4 py-2 rounded-full mb-4">
                <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                <span className="text-sm font-bold text-violet-700 dark:text-violet-300">Shared Deck</span>
              </div>
              <h1 className="text-5xl font-black gradient-text mb-4 animate-gradient">{deck?.title}</h1>
              {deck?.description && (
                <p className="text-gray-700 dark:text-gray-300 text-xl leading-relaxed font-medium">{deck.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-violet-100 dark:border-violet-800">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black gradient-text">{flashcards.length}</span>
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{flashcards.length === 1 ? 'flashcard' : 'flashcards'}</span>
            </div>
            
            {/* Only show buttons if there are flashcards */}
            {flashcards.length > 0 && (
              <>
                <div className="flex items-center space-x-4">
                  {/* Study button - available to everyone */}
                  <button
                    onClick={studyDeck}
                    className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg btn-glow"
                  >
                    Study Deck
                  </button>
                  
                  {/* Save button - only for authenticated users */}
                  {user ? (
                    <button
                      onClick={saveDeck}
                      className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg btn-glow"
                    >
                      Save Deck
                    </button>
                  ) : (
                    <button
                      onClick={() => openAuthModal(false)}
                      className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg btn-glow flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Save Deck</span>
                    </button>
                  )}
                </div>
                
                {/* Info text */}
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Study Deck</span> - Available to everyone • 
                    <span className="font-medium"> Save Deck</span> - Requires account
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Flashcards List */}
        {flashcards.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 px-2">All Flashcards</h2>
            {flashcards.map((card, index) => (
              <div key={card.id} className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative glass rounded-3xl overflow-hidden border-2 border-violet-100 dark:border-violet-800">
                  <div className="h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600"></div>
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white font-bold text-sm shadow-lg">
                        {index + 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="font-bold text-violet-600 dark:text-violet-400 mb-3 text-sm uppercase tracking-wider flex items-center space-x-2">
                          <span>?</span>
                          <span>Question</span>
                        </h3>
                        <p className="bg-violet-50/50 dark:bg-violet-900/20 p-5 rounded-2xl text-gray-900 dark:text-gray-100 text-lg leading-relaxed font-medium border border-violet-100 dark:border-violet-800">{card.front}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-fuchsia-600 dark:text-fuchsia-400 mb-3 text-sm uppercase tracking-wider flex items-center space-x-2">
                          <span>✓</span>
                          <span>Answer</span>
                        </h3>
                        <p className="bg-fuchsia-50/50 dark:bg-fuchsia-900/20 p-5 rounded-2xl text-gray-900 dark:text-gray-100 text-lg leading-relaxed font-medium border border-fuchsia-100 dark:border-fuchsia-800">{card.back}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-200 to-purple-200 dark:from-violet-800 dark:to-purple-800 rounded-3xl flex items-center justify-center mx-auto shadow-lg border-2 border-violet-300 dark:border-violet-600">
                <svg className="w-12 h-12 text-violet-700 dark:text-violet-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <p className="text-xl text-gray-700 dark:text-gray-300 font-semibold">No flashcards in this deck yet.</p>
          </div>
        )}
      </div>

      {/* Study Mode */}
      {studyMode && flashcards.length > 0 && (
        <div className="fixed inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-fuchsia-900 z-50">
          {/* Theme Toggle Button */}
          <div className="fixed top-6 right-6 z-50">
            <div className="glass rounded-2xl p-2 shadow-xl border border-violet-100 dark:border-violet-800">
              <ThemeToggle />
            </div>
          </div>

          {/* Animated Background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-300/30 dark:bg-violet-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-300/30 dark:bg-fuchsia-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          </div>

          <div className="relative max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="glass rounded-2xl p-6 mb-8 border border-violet-100/50 dark:border-violet-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={exitStudy}
                    className="group p-2.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-xl transition-all"
                  >
                    <svg className="w-6 h-6 text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{deck?.title}</h1>
                    <p className="text-violet-600 dark:text-violet-400 font-semibold text-sm">Study Session</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-10">
              <div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                <span className="text-violet-600 dark:text-violet-400">{Math.round(((currentCardIndex + 1) / flashcards.length) * 100)}% Complete</span>
              </div>
              <div className="relative w-full bg-violet-200/50 dark:bg-violet-900/30 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 dark:bg-white/10 animate-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Flashcard */}
            <div className="relative group mb-12">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl blur-lg opacity-15 group-hover:opacity-25 transition duration-300"></div>
              <div className="relative glass rounded-3xl p-12 min-h-[500px] flex flex-col justify-center overflow-hidden border-2 border-violet-100 dark:border-violet-800 shadow-2xl">
                {/* Decorative gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-t-3xl"></div>
                
                {/* Card Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600 rounded-full -translate-y-20 translate-x-20"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-600 rounded-full translate-y-16 -translate-x-16"></div>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="mb-10">
                    <span className={`inline-flex items-center px-6 py-2.5 rounded-full text-sm font-bold ${
                      showAnswer 
                        ? 'bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 text-violet-700 dark:text-violet-300' 
                        : 'bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 text-violet-700 dark:text-violet-300'
                    }`}>
                      {showAnswer ? '✓ Answer' : '? Question'}
                    </span>
                  </div>
                  <div className="text-4xl text-gray-900 dark:text-white mb-14 leading-relaxed font-semibold px-4">
                    {showAnswer ? flashcards[currentCardIndex]?.back : flashcards[currentCardIndex]?.front}
                  </div>
                  <button
                    onClick={toggleAnswer}
                    className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow"
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
                className="group flex items-center space-x-2 glass hover:bg-white/90 dark:hover:bg-gray-800/90 disabled:opacity-40 disabled:cursor-not-allowed text-gray-800 dark:text-gray-200 px-8 py-4 rounded-2xl font-bold transition-all duration-200 hover:scale-105 border-2 border-violet-200/50 dark:border-violet-600/50 hover:border-violet-300 dark:hover:border-violet-500 disabled:hover:scale-100"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <button
                onClick={nextCard}
                className="group flex items-center space-x-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white px-10 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl btn-glow"
              >
                <span>{currentCardIndex === flashcards.length - 1 ? 'Finish' : 'Next'}</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-violet-100 dark:border-gray-700 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600"></div>
            
            <div className="text-center mb-6">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3">
                {isLogin ? 'Welcome Back!' : 'Join Haroval'}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {isLogin ? 'Sign in to save this deck to your Shared Decks' : 'Create an account to save this deck to your Shared Decks'}
              </p>
            </div>

            <form onSubmit={handleAuth}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                  Username
                </label>
                <input
                  type="text"
                  value={authData.username}
                  onChange={(e) => setAuthData({...authData, username: e.target.value})}
                  className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={authData.password}
                    onChange={(e) => setAuthData({...authData, password: e.target.value})}
                    className="w-full px-6 py-4 pr-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={authData.confirmPassword}
                      onChange={(e) => setAuthData({...authData, confirmPassword: e.target.value})}
                      className="w-full px-6 py-4 pr-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {authError && (
                <div className="mb-6 p-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl">
                  <p className="text-red-700 dark:text-red-400 font-semibold text-sm">{authError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={authModalLoading}
                className={`w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform shadow-xl mb-6 btn-glow ${
                  authModalLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {authModalLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={authModalLoading}
                className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform shadow-lg border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 flex items-center justify-center gap-3 mb-6"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 text-base font-semibold transition-colors"
                >
                  {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
