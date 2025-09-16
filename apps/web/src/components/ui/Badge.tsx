import React from 'react'
import { useThemeStore, ColorScheme, Size } from '@/stores/theme'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'solid' | 'outline' | 'subtle'
  colorScheme?: ColorScheme
  size?: Size
  className?: string
}

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-base',
  xl: 'px-4 py-2.5 text-lg'
}

const colorSchemes = {
  primary: {
    solid: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    outline: 'border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-200',
    subtle: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
  },
  secondary: {
    solid: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    outline: 'border-gray-200 text-gray-800 dark:border-gray-600 dark:text-gray-200',
    subtle: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  },
  success: {
    solid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    outline: 'border-green-200 text-green-800 dark:border-green-800 dark:text-green-200',
    subtle: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
  },
  warning: {
    solid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    outline: 'border-yellow-200 text-yellow-800 dark:border-yellow-800 dark:text-yellow-200',
    subtle: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
  },
  error: {
    solid: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    outline: 'border-red-200 text-red-800 dark:border-red-800 dark:text-red-200',
    subtle: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
  },
  info: {
    solid: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    outline: 'border-cyan-200 text-cyan-800 dark:border-cyan-800 dark:text-cyan-200',
    subtle: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300'
  }
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'solid',
  colorScheme = 'primary',
  size = 'sm',
  className = ''
}) => {
  const { colorScheme: themeColorScheme } = useThemeStore()
  const scheme = colorScheme || themeColorScheme

  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  const sizeClass = sizeClasses[size]
  const colorClass = colorSchemes[scheme][variant]
  const borderClass = variant === 'outline' ? 'border' : ''

  const classes = `${baseClasses} ${sizeClass} ${colorClass} ${borderClass} ${className}`

  return (
    <span className={classes}>
      {children}
    </span>
  )
}
