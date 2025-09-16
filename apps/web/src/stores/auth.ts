import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: 'driver' | 'admin'
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        
        // Mock authentication - accept any email/password for demo
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
        
        const mockUser: User = {
          id: '1',
          email,
          name: email.split('@')[0],
          role: 'driver'
        }
        
        set({ 
          user: mockUser, 
          isAuthenticated: true, 
          isLoading: false 
        })
        
        return true
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false 
        })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
)
