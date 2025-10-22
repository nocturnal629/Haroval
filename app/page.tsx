'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  const { user, loading, login, register, logout, loginWithGoogle, checkAuthStatus, error: authHookError } = useAuth()
  const [decks, setDecks] = useState<any[]>([])
  const [sharedDecks, setSharedDecks] = useState<any[]>([])
  const [dashboardCache, setDashboardCache] = useState<any>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [decksLoading, setDecksLoading] = useState(false)
  const [sharedDecksLoading, setSharedDecksLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateDeck, setShowCreateDeck] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDeck, setEditingDeck] = useState<any>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharingDeck, setSharingDeck] = useState<any>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [newDeckTitle, setNewDeckTitle] = useState('')
  const [newDeckDescription, setNewDeckDescription] = useState('')
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
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [profileError, setProfileError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [linkRegenerated, setLinkRegenerated] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deckToDelete, setDeckToDelete] = useState<any>(null)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [deletingDeck, setDeletingDeck] = useState<string | null>(null)

  const fetchDashboard = useCallback(async (forceRefresh = false) => {
    if (!user) return
    
    const now = Date.now()
    const CACHE_DURATION = 60 * 60 * 1000 // 1 hour cache
    
    // Check if we have cached data and it's still fresh
    if (!forceRefresh && dashboardCache && (now - lastFetchTime) < CACHE_DURATION) {
      setDecks(dashboardCache.ownDecks || [])
      setSharedDecks(dashboardCache.savedDecks || [])
      return
    }
    
    setDecksLoading(true)
    setSharedDecksLoading(true)
    
    try {
      const response = await fetch('/api/decks/dashboard', {
        credentials: 'include' // Include cookies for JWT authentication
      })
      const result = await response.json()

      if (!response.ok) {
        // Handle error silently
        setDecks([])
        setSharedDecks([])
      } else {
        // Update state with the fetched data
        setDecks(result.ownDecks || [])
        setSharedDecks(result.savedDecks || [])
        
        // Cache the results
        setDashboardCache(result)
        setLastFetchTime(now)
      }
    } catch (err) {
      // Handle error silently
      setDecks([])
      setSharedDecks([])
    } finally {
      setDecksLoading(false)
      setSharedDecksLoading(false)
    }
  }, [user, dashboardCache, lastFetchTime])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchDashboard(true)
    } finally {
      setRefreshing(false)
    }
  }

  const deleteSharedDeck = useCallback(async (deckId: string) => {
    if (!user) return
    
    setDeletingDeck(deckId)
    try {
      const response = await fetch('/api/decks/unsave-shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          deckId: deckId
        })
      })

      if (response.ok) {
        // Remove from local state
        setSharedDecks(prev => prev.filter(deck => deck.id !== deckId))
        // Update dashboard cache
        setDashboardCache((prev: any) => prev ? {
          ...prev,
          savedDecks: prev.savedDecks.filter((deck: any) => deck.id !== deckId)
        } : null)
      } else {
        const errorData = await response.json()
        console.error('Failed to delete shared deck:', errorData)
        alert('Failed to remove deck from saved decks')
      }
    } catch (err) {
      console.error('Error deleting shared deck:', err)
      alert('Failed to remove deck from saved decks')
    } finally {
      setDeletingDeck(null)
    }
  }, [user])

  // Fetch dashboard when user changes
  useEffect(() => {
    if (user) {
      fetchDashboard()
    }
  }, [user, fetchDashboard])

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const googleAuthSuccess = urlParams.get('google_auth_success')
    const error = urlParams.get('error')

    if (googleAuthSuccess === 'true') {
      // Google OAuth was successful, refresh auth status
      checkAuthStatus()
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (error === 'google_oauth_denied') {
      setAuthError('Google OAuth was cancelled')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (error === 'google_oauth_failed') {
      setAuthError('Google OAuth failed. Please try again.')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [checkAuthStatus])

  // Listen for refresh messages from deck pages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REFRESH_DASHBOARD') {
        fetchDashboard(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fetchDashboard])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    if (!isLogin && authData.password !== authData.confirmPassword) {
      setAuthError('Passwords do not match')
      setAuthLoading(false)
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
      setAuthLoading(false)
    }
  }

  const handleSignOut = () => {
    openSignOutModal()
  }

  const openProfileModal = () => {
    if (!user) return
    
    setProfileData({
      username: user.username || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setProfileError('')
    setShowProfileModal(true)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')

    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      setProfileError('New passwords do not match')
      return
    }

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: profileData.username,
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Profile updated successfully
        setShowProfileModal(false)
        setProfileError('')
        // The auth hook will automatically refresh the user data
      } else {
        setProfileError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setProfileError('An error occurred while updating your profile')
    }
  }

  const openAuthModal = (login: boolean) => {
    setIsLogin(login)
    setShowAuthModal(true)
    setAuthError('')
    setAuthData({ username: '', password: '', confirmPassword: '' })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setAuthLoading(false)
  }

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newDeckTitle.trim()) return

    // Validate character limits
    if (newDeckTitle.length > 50) {
      alert('Deck title must be 50 characters or less')
      return
    }
    if (newDeckDescription.length > 150) {
      alert('Deck description must be 150 characters or less')
      return
    }

    try {
      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newDeckTitle,
          description: newDeckDescription,
          owner_id: user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle error silently
      } else {
        // Add the new deck with 0 cards initially
        const newDeck = { ...result.deck, cardCount: 0 }
        const updatedDecks = [newDeck, ...decks]
        setDecks(updatedDecks)
        
        // Update dashboard cache
        setDashboardCache((prev: any) => prev ? {
          ...prev,
          ownDecks: [newDeck, ...prev.ownDecks]
        } : null)
        
        setNewDeckTitle('')
        setNewDeckDescription('')
        setShowCreateDeck(false)
        router.push(`/deck/${result.deck.id}?add=1`)
      }
    } catch (err) {
      // Handle error silently
    }
  }

  // Edit deck modal functions
  const openEditModal = (deck: any) => {
    setEditingDeck(deck)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingDeck(null)
  }

  const openDeleteModal = useCallback((deck: any) => {
    setDeckToDelete(deck)
    setShowDeleteModal(true)
  }, [])

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false)
    setDeckToDelete(null)
  }, [])

  const openSignOutModal = useCallback(() => {
    setShowSignOutModal(true)
  }, [])

  const closeSignOutModal = useCallback(() => {
    setShowSignOutModal(false)
  }, [])


  const handleDeleteDeckFromCard = useCallback((deck: any) => {
    openDeleteModal(deck)
  }, [openDeleteModal])

  const confirmDeleteDeck = useCallback(async () => {
    if (!deckToDelete) return

    try {
      if (!user?.id) {
        console.error('User not authenticated')
        return
      }

      // Delete all cards first
      await supabase.from('flashcards').delete().eq('deck_id', deckToDelete.id)
      
      // Delete the deck
      const { error: deckError } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckToDelete.id)
        .eq('owner_id', user.id)

      if (deckError) {
        console.error('Error deleting deck:', deckError)
        return
      }

      // Remove from local state
      setDecks(prevDecks => prevDecks.filter(d => d.id !== deckToDelete.id))
      
      // Update dashboard cache
      setDashboardCache((prev: any) => prev ? {
        ...prev,
        ownDecks: prev.ownDecks.filter((deck: any) => deck.id !== deckToDelete.id)
      } : null)
      
      // Close modals
      closeDeleteModal()
      if (editingDeck && editingDeck.id === deckToDelete.id) {
        closeEditModal()
      }
    } catch (error) {
      console.error('Error deleting deck:', error)
    }
  }, [deckToDelete, user?.id, editingDeck, closeDeleteModal])

  const confirmSignOut = useCallback(async () => {
    try {
      await logout()
      setDecks([])
      setSharedDecks([])
      setDashboardCache(null)
      closeSignOutModal()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [logout, closeSignOutModal])

  const handleEditDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDeck) return

    try {
      const userId = user?.id || user
      const response = await fetch(`/api/decks/${editingDeck.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editingDeck.title,
          description: editingDeck.description,
          visibility: editingDeck.visibility,
          currentUser: userId
        })
      })

      if (response.ok) {
        // Update the deck in the local state
        setDecks(decks.map(d => d.id === editingDeck.id ? editingDeck : d))
        closeEditModal()
      }
    } catch (err) {
      // Handle error silently
    }
  }

  // Share deck functions
  const openShareModal = async (deck: any) => {
    setSharingDeck(deck)
    setShowShareModal(true)
    setLinkRegenerated(false) // Reset notification state when opening modal
    
    try {
      const response = await fetch(`/api/decks/${deck.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentUser: user?.id || user
        })
      })

      if (response.ok) {
        const result = await response.json()
        setShareUrl(`${window.location.origin}/shared/${result.shareId}`)
      }
    } catch (err) {
      // Handle error silently
    }
  }

  const closeShareModal = () => {
    setShowShareModal(false)
    setSharingDeck(null)
    setShareUrl('')
    setCopySuccess(false)
    setLinkRegenerated(false)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000) // Reset after 2 seconds
    } catch (err) {
      // Handle error silently
    }
  }

  const regenerateShareLink = async () => {
    if (!sharingDeck) return
    
    try {
      const response = await fetch(`/api/decks/${sharingDeck.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentUser: user?.id || user,
          forceRegenerate: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        setShareUrl(`${window.location.origin}/shared/${result.shareId}`)
        setCopySuccess(false) // Reset copy success state
        setLinkRegenerated(true) // Show success notification
      } else {
        // Handle error silently
      }
    } catch (err) {
      // Handle error silently
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-purple-900 dark:to-rose-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-b-purple-600 dark:border-b-purple-400 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-xl font-semibold gradient-text">Loading your workspace...</div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative flex flex-col">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-300/30 dark:bg-pink-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md sticky top-0 z-50 border-b border-purple-200/60 dark:border-gray-700/50 shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Image 
                src="/icons/haroval-icon.png" 
                alt="Haroval" 
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-2xl font-bold gradient-text">Haroval</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={openProfileModal}
                    className="relative group cursor-pointer"
                  >
                    <div className="w-11 h-11 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105">
                      <span className="text-white text-base font-bold">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </button>
                  <ThemeToggle />
                  <button
                    onClick={handleSignOut}
                    className="text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal(true)}
                    className="text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => openAuthModal(false)}
                    className="relative group bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-7 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform btn-glow"
                  >
                    <span className="relative z-10">Get Started</span>
                  </button>
                  <ThemeToggle />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-[calc(100vh-120px)] pb-8">
        {!user ? (
          // Not signed in - Hero Section
          <div className="relative w-full">
            <div className="text-center relative z-10 pt-20">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white mb-8 leading-[1.1]">
                  Master any subject
                  <span className="block mt-2">
                    <span className="inline-block gradient-text animate-gradient">with Haroval</span>
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
                  Create, study, and share intelligent flashcards to learn anything faster.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
                  <button
                    onClick={() => openAuthModal(false)}
                    className="group relative bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-10 py-4 rounded-xl text-base font-bold transition-all duration-300 transform shadow-xl hover:shadow-2xl btn-glow"
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-2">
                      <span>Start Learning Free</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                  <button 
                    onClick={() => openAuthModal(true)}
                    className="group glass hover:bg-white/90 dark:hover:bg-gray-800/90 text-gray-800 dark:text-gray-200 px-10 py-4 rounded-xl text-base font-bold transition-all duration-300 border-2 border-purple-200/50 dark:border-gray-600/50 hover:border-purple-300 dark:hover:border-gray-500"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>Already have an account?</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </span>
                  </button>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-8">
                  <div className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative glass text-center p-8 rounded-2xl">
                      <div className="relative mb-5">
                        <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Create Decks</h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">Build custom flashcard decks for any subject with our intuitive editor</p>
                    </div>
                  </div>
                  
                  <div className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative glass text-center p-8 rounded-2xl">
                      <div className="relative mb-5">
                        <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Study Smart</h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">Master subjects faster with spaced repetition and intelligent algorithms</p>
                    </div>
                  </div>
                  
                  <div className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative glass text-center p-8 rounded-2xl">
                      <div className="relative mb-5">
                        <div className="relative w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Share & Collaborate</h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">Share decks with friends and study together to achieve your goals</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Signed in - Dashboard
          <div className="relative space-y-6 w-full pt-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
              <div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white leading-tight">
                  Welcome back, <span className="gradient-text animate-gradient">{user.username || 'User'}</span>!
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">Create and manage your flashcard collections</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCreateDeck(true)}
                  className="group bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-7 py-3.5 rounded-xl font-bold transition-all duration-300 transform flex items-center space-x-2 shadow-xl hover:shadow-2xl btn-glow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create New Deck</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 w-32 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <svg 
                    className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Decks Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Decks</h2>
            </div>

            {/* Decks Grid */}
            <div className="min-h-[200px]">
              {refreshing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Loading skeleton cards */}
                  {[1, 2].map((i) => (
                    <div key={i} className="group relative">
                      <div className="relative glass rounded-2xl overflow-hidden h-64 flex flex-col animate-pulse">
                        <div className="h-1 bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800"></div>
                        <div className="p-7 flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-5">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </div>
                          <div className="flex-1">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-5 border-t border-purple-100/50 dark:border-gray-700/50">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                            <div className="flex space-x-1.5">
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : decks.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-8">
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-3xl blur-lg opacity-30 dark:opacity-20"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center">
                    <svg className="w-12 h-12 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">No decks yet</h3>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-lg mx-auto leading-relaxed">
                  Use the &quot;Create New Deck&quot; button above to get started with your first flashcard collection
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {decks.map((deck, index) => (
                  <div key={deck.id} className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative glass rounded-2xl overflow-hidden h-64 flex flex-col">
                      {/* Decorative gradient bar */}
                      <div className="h-2 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 shadow-lg flex-shrink-0"></div>
                      
                      <div className="p-7 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-5">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-tight pr-2">
                            {deck.title}
                          </h3>
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 shrink-0">
                            {deck.visibility === 'public' ? 'Public' : 
                             deck.visibility === 'shared' ? 'Shared' : 'Private'}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          {deck.description ? (
                            <p className="text-gray-700 dark:text-gray-300 text-base mb-5 line-clamp-2 leading-relaxed min-h-[3rem]">{deck.description}</p>
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500 text-base mb-5 italic min-h-[3rem]">No description</p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-5 border-t border-purple-100/50 dark:border-gray-700/50">
                          <button
                            onClick={() => router.push(`/deck/${deck.id}`)}
                            className="flex items-baseline space-x-1 hover:opacity-80 transition-opacity duration-200 cursor-pointer group relative"
                            title="Edit Flashcards"
                          >
                            <span className="text-2xl font-black gradient-text group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{deck.cardCount || 0}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">cards</span>
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400 dark:bg-gray-500"></div>
                          </button>
                          <div className="flex space-x-1.5">
                            <Link
                              href={`/deck/${deck.id}?study=1`}
                              className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 transform shadow-lg"
                            >
                              Study
                            </Link>
                            <button
                              onClick={() => openShareModal(deck)}
                              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => openEditModal(deck)}
                              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                              title="Edit Deck"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteDeckFromCard(deck)}
                              className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-700 hover:via-red-700 hover:to-red-800 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg flex items-center justify-center"
                              title="Delete Deck"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Other Decks Section */}
            <div className="mt-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Decks</h2>
              </div>

              <div className="min-h-[250px] pb-8">
                {refreshing ? (
                  <div className="text-center py-16">
                    <div className="relative inline-block mb-8">
                      <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl blur-lg opacity-30 dark:opacity-20 animate-pulse"></div>
                      <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-2xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400"></div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Loading shared decks...</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
                      Please wait while we fetch the latest shared decks.
                    </p>
                  </div>
                ) : sharedDecks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative inline-block mb-8">
                    <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl blur-lg opacity-30 dark:opacity-20"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-2xl flex items-center justify-center">
                      <svg className="w-12 h-12 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Saved Decks Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
                    Save decks from shared links to access them here. Click &quot;Save Deck&quot; on any shared deck.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sharedDecks.map((deck, index) => (
                    <div key={deck.id} className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                      <div className="relative glass rounded-2xl overflow-hidden h-64 flex flex-col">
                        {/* Decorative gradient bar */}
                        <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600"></div>
                        
                        <div className="p-7 flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-5">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight pr-2">
                              {deck.title}
                            </h3>
                          </div>
                          
                          <div className="flex-1">
                            {deck.description ? (
                              <p className="text-gray-700 dark:text-gray-300 text-base mb-5 line-clamp-2 leading-relaxed min-h-[3rem]">{deck.description}</p>
                            ) : (
                              <p className="text-gray-500 dark:text-gray-400 text-base mb-5 italic min-h-[3rem]">No description provided</p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-5 border-t border-emerald-100/50 dark:border-gray-700/50">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-baseline space-x-1">
                                <span className="text-2xl font-black gradient-text">{deck.cardCount || 0}</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">cards</span>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Link
                                href={`/deck/${deck.id}?study=1`}
                                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 transform shadow-lg"
                              >
                                Study
                              </Link>
                              <button
                                onClick={() => openShareModal(deck)}
                                className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                              >
                                Share
                              </button>
                              <button
                                onClick={() => deleteSharedDeck(deck.id)}
                                disabled={deletingDeck === deck.id}
                                className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-700 hover:via-red-700 hover:to-red-800 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove Deck"
                              >
                                {deletingDeck === deck.id ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
            
            <div className="text-center mb-6">
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3">
                {isLogin ? 'Welcome Back!' : 'Join Haroval'}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {isLogin ? 'Sign in to continue learning' : 'Start your learning journey today'}
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
                  className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
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
                    className="w-full px-6 py-4 pr-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
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
                      className="w-full px-6 py-4 pr-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
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
                disabled={authLoading}
                className={`w-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform shadow-xl mb-4 btn-glow ${
                  authLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {authLoading ? (
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
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={authLoading}
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
                  className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 text-base font-semibold transition-colors"
                >
                  {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                </button>
              </div>
            </form>

            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-6 right-6 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Create Deck Modal */}
    {showCreateDeck && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
          
          <div className="text-center mb-8">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Create New Deck</h3>
            <p className="text-gray-600 dark:text-gray-300 text-base">Start building your flashcard collection</p>
          </div>
          <form onSubmit={handleCreateDeck}>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                Deck Title
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({newDeckTitle.length}/50)
                </span>
              </label>
              <input
                type="text"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                maxLength={50}
                className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                placeholder="e.g., Spanish Vocabulary"
                required
              />
            </div>
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                Description (Optional)
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({newDeckDescription.length}/150)
                </span>
              </label>
              <textarea
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                maxLength={150}
                className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500 resize-none"
                placeholder="Describe what this deck is about..."
                rows={3}
              />
            </div>
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateDeck(false)}
                className="px-8 py-3.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 transform  shadow-lg btn-glow"
              >
                Create Deck
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Profile Settings Modal */}
    {showProfileModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
          
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-50"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Profile Settings</h3>
            <p className="text-gray-600 dark:text-gray-300 text-base">Update your account information</p>
          </div>
          
          <form onSubmit={handleProfileUpdate}>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                Username
              </label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={profileData.currentPassword}
                  onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                  className="w-full px-6 py-4 pr-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                  className="w-full px-6 py-4 pr-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-8 py-3.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 transform  shadow-lg btn-glow"
              >
                Update Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Edit Deck Modal */}
    {showEditModal && editingDeck && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-purple-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600"></div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Edit Deck</h2>
            <p className="text-gray-600 dark:text-gray-300">Update your flashcard deck information</p>
          </div>

          <form onSubmit={handleEditDeck} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                Deck Title
              </label>
              <input
                type="text"
                value={editingDeck.title}
                onChange={(e) => setEditingDeck({...editingDeck, title: e.target.value})}
                className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg hover:border-gray-300 dark:hover:border-gray-500"
                placeholder="Enter deck title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                Description
              </label>
              <textarea
                value={editingDeck.description || ''}
                onChange={(e) => setEditingDeck({...editingDeck, description: e.target.value})}
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
                    onClick={() => setEditingDeck({ ...editingDeck, visibility: opt.key })}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${editingDeck.visibility === opt.key ? 'border-transparent ring-4 ' + opt.ring : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'} bg-gradient-to-br ${opt.color}`}
                  >
                    <div className={`font-bold ${opt.text}`}>{opt.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-6">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-8 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg btn-glow"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Share Deck Modal */}
    {showShareModal && sharingDeck && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-emerald-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600"></div>
          
          <div className="text-center mb-6">
            <button
              onClick={closeShareModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Share Deck</h3>
            <p className="text-gray-600 dark:text-gray-300">Share &quot;{sharingDeck.title}&quot; with others</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                Share Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-sm font-mono bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-3 rounded-xl font-bold transition-all duration-200 ${
                    copySuccess 
                      ? 'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white' 
                      : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white'
                  }`}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="text-center">
              {linkRegenerated ? (
                <div className="flex items-center justify-center space-x-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>New link generated!</span>
                </div>
              ) : (
                <button
                  onClick={regenerateShareLink}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline decoration-dotted underline-offset-4"
                >
                  Generate new link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Delete Deck Confirmation Modal */}
    {showDeleteModal && deckToDelete && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-red-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-600 to-red-700"></div>
          
          <div className="relative mb-6">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center">Delete Deck</h3>
            <button 
              onClick={closeDeleteModal} 
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
              Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">&quot;{deckToDelete.title}&quot;</span>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 text-center font-semibold">
              This action cannot be undone.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={closeDeleteModal}
              className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteDeck}
              className="flex-1 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-700 hover:via-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Delete Deck
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Sign Out Confirmation Modal */}
    {showSignOutModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-orange-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700"></div>
          
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Sign Out</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to sign out?
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={closeSignOutModal}
              className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={confirmSignOut}
              className="flex-1 bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 hover:from-orange-700 hover:via-orange-700 hover:to-orange-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )}
  </>
)
}
