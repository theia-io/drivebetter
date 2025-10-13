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
            mode: 'light',
            colorScheme: 'primary',

            setMode: (mode: ThemeMode) => {
                set({ mode })

                if (typeof window !== 'undefined') {
                    const root = document.documentElement

                    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

                    if (isDark) {
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
            }),

            onRehydrateStorage: (state) => {
                return (state, error) => {
                    if (state) {
                        state.setMode(state.mode)
                    }
                    if (error) {
                        console.error('An error occurred during hydration:', error)
                    }
                }
            }
        }
    )
)
