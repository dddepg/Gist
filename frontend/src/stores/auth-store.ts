import { create } from 'zustand'
import {
  checkAuthStatus,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  setOnUnauthorized,
  type AuthUser,
} from '@/api'

export type AuthState = 'loading' | 'unauthenticated' | 'no-user' | 'authenticated'

interface AuthStore {
  // State
  state: AuthState
  user: AuthUser | null
  error: string | null

  // Actions
  initialize: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // Set up unauthorized callback
  setOnUnauthorized(() => {
    get().logout()
  })

  return {
    state: 'loading',
    user: null,
    error: null,

    initialize: async () => {
      try {
        // Check if user exists in backend
        const { exists } = await checkAuthStatus()

        if (!exists) {
          // No user registered, show register page
          set({ state: 'no-user', user: null })
          return
        }

        // User exists, check if we have a valid token
        const token = getAuthToken()
        if (!token) {
          set({ state: 'unauthenticated', user: null })
          return
        }

        // Try to get current user with existing token
        try {
          const user = await getCurrentUser()
          set({ state: 'authenticated', user })
        } catch {
          // Token invalid, clear it
          clearAuthToken()
          set({ state: 'unauthenticated', user: null })
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err)
        set({ state: 'unauthenticated', user: null })
      }
    },

    login: async (username: string, password: string) => {
      set({ error: null })
      try {
        const response = await apiLogin(username, password)
        setAuthToken(response.token)
        set({ state: 'authenticated', user: response.user })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        set({ error: message })
        throw err
      }
    },

    register: async (username: string, email: string, password: string) => {
      set({ error: null })
      try {
        const response = await apiRegister(username, email, password)
        setAuthToken(response.token)
        set({ state: 'authenticated', user: response.user })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        set({ error: message })
        throw err
      }
    },

    logout: async () => {
      try {
        await apiLogout()
      } catch {
        // Ignore errors, still clear local state
      }
      clearAuthToken()
      set({ state: 'unauthenticated', user: null })
    },

    clearError: () => {
      set({ error: null })
    },
  }
})

// Actions that can be called from outside React
export const authActions = {
  initialize: () => useAuthStore.getState().initialize(),
  login: (username: string, password: string) => useAuthStore.getState().login(username, password),
  register: (username: string, email: string, password: string) =>
    useAuthStore.getState().register(username, email, password),
  logout: () => useAuthStore.getState().logout(),
}
