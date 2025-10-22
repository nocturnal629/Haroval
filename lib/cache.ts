interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    const now = Date.now()
    const isExpired = (now - item.timestamp) > item.ttl

    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear cache entries that match a pattern
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    this.cache.forEach((item) => {
      const isExpired = (now - item.timestamp) > item.ttl
      if (isExpired) {
        expiredEntries++
      } else {
        validEntries++
      }
    })

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries
    }
  }
}

// Singleton cache instance
export const cache = new CacheManager()

// Cache key generators
export const CacheKeys = {
  userDecks: (userId: string) => `user_decks_${userId}`,
  sharedDecks: (excludeUserId?: string) => `shared_decks_${excludeUserId || 'all'}`,
  userDashboard: (userId: string) => `user_dashboard_${userId}`,
  deck: (deckId: string) => `deck_${deckId}`,
  deckCards: (deckId: string) => `deck_cards_${deckId}`,
  user: (userId: string) => `user_${userId}`
} as const

// Helper function to invalidate user-related cache
export function invalidateUserCache(userId: string): void {
  cache.clearPattern(`user_decks_${userId}`)
  cache.clearPattern(`user_dashboard_${userId}`)
  cache.clearPattern(`deck_.*`)
  cache.clearPattern(`deck_cards_.*`)
  cache.delete(CacheKeys.user(userId))
}
