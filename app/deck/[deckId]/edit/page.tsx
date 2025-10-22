'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'

export default function EditDeck() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.deckId as string

  const [deck, setDeck] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'private'
  })

  const fetchDeck = useCallback(async (user: any) => {
    try {
      const userId = user?.id || user
      const response = await fetch(`/api/decks/${deckId}?user=${userId}`, {
        credentials: 'include' // Include cookies for JWT authentication
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to fetch deck')
        return
      }

      // Check if user can edit this deck
      if (!result.deck.canEdit) {
        setError('You can only edit your own decks')
        return
      }

      setDeck(result.deck)
      setFormData({
        title: result.deck.title,
        description: result.deck.description || '',
        visibility: result.deck.visibility || 'private'
      })
    } catch (err) {
      setError('Failed to fetch deck')
    } finally {
      setLoading(false)
    }
  }, [deckId])

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setUser(user)
        if (deckId) {
          fetchDeck(user)
        }
      } catch (err) {
        setError('Invalid user session')
        setLoading(false)
      }
    } else {
      setError('Authentication required')
      setLoading(false)
    }
  }, [deckId, fetchDeck])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    // Validate character limits
    if (formData.title.length > 50) {
      setError('Deck title must be 50 characters or less')
      setSaving(false)
      return
    }
    if (formData.description.length > 150) {
      setError('Deck description must be 150 characters or less')
      setSaving(false)
      return
    }

    try {
      const userId = user?.id || user
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for JWT authentication
        body: JSON.stringify({
          ...formData,
          currentUser: userId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update deck')
        return
      }

      // Redirect back to the deck page
      router.push(`/deck/${deckId}`)
    } catch (err) {
      setError('Failed to update deck')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const userId = user?.id || user
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for JWT authentication
        body: JSON.stringify({
          currentUser: userId
        })
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || 'Failed to delete deck')
        return
      }

      router.push('/')
    } catch (err) {
      setError('Failed to delete deck')
    } finally {
      setSaving(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading deck...</p>
        </div>
      </div>
    )
  }

  if (error && !deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Link
            href="/"
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-purple-100 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Image 
                src="/icons/haroval-icon.png" 
                alt="Haroval" 
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-xl font-black text-gray-900 dark:text-white">Haroval</span>
            </Link>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                href={`/deck/${deckId}`}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                View Deck
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-purple-100 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 px-8 py-6">
            <h1 className="text-3xl font-black text-white mb-2">Edit Deck</h1>
            <p className="text-purple-100">Update your flashcard deck information</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                  Deck Title
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({formData.title.length}/50)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  maxLength={50}
                  className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                  placeholder="Enter deck title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                  Description
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({formData.description.length}/150)
                  </span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  maxLength={150}
                  className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500 resize-none"
                  placeholder="Describe what this deck covers..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                  Visibility
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'private', title: 'Private', desc: 'Only you can view', color: 'from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600', text: 'text-gray-800 dark:text-gray-200', ring: 'ring-gray-200 dark:ring-gray-500' },
                    { key: 'public', title: 'Public', desc: 'Visible to everyone', color: 'from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-purple-900/50', text: 'text-purple-800 dark:text-purple-200', ring: 'ring-purple-200 dark:ring-purple-500' },
                    { key: 'shared', title: 'Shared', desc: 'Anyone with link', color: 'from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50', text: 'text-amber-800 dark:text-amber-200', ring: 'ring-amber-200 dark:ring-amber-500' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: opt.key as any })}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${formData.visibility === opt.key ? 'border-transparent ring-4 ' + opt.ring : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'} bg-gradient-to-br ${opt.color}`}
                    >
                      <div className={`font-bold ${opt.text}`}>{opt.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-6">
                <Link
                  href="/"
                  className="px-8 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg btn-glow disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-red-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500"></div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 7V5a2 2 0 012-2h0a2 2 0 012 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1">Delete deck?</h3>
                <p className="text-gray-600">This action cannot be undone. All flashcards in this deck will be removed.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 font-bold transition-all duration-200 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
