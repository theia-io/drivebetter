import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ColorScheme = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ThemeState {
  mode: ThemeMode
  colorScheme: ColorScheme
  setMode: (mode: ThemeMode) => void
  setColorScheme: (scheme: ColorScheme) => void
  toggleMode: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      colorScheme: 'primary',

      setMode: (mode: ThemeMode) => {
        set({ mode })
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = document.documentElement
          if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      },

      setColorScheme: (colorScheme: ColorScheme) => {
        set({ colorScheme })
      },

      toggleMode: () => {
        const currentMode = get().mode
        const newMode = currentMode === 'light' ? 'dark' : 'light'
        get().setMode(newMode)
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ 
        mode: state.mode, 
        colorScheme: state.colorScheme 
      })
    }
  )
)

// Initialize theme on store creation
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState()
  store.setMode(store.mode)
}
