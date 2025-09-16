import React from 'react'

interface GridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const colsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  12: 'grid-cols-12'
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 3,
  gap = 'md',
  className = ''
}) => {
  const baseClasses = 'grid'
  const colsClass = colsClasses[cols]
  const gapClass = gapClasses[gap]

  const classes = `${baseClasses} ${colsClass} ${gapClass} ${className}`

  return (
    <div className={classes}>
      {children}
    </div>
  )
}

interface GridItemProps {
  children: React.ReactNode
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  className?: string
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  colSpan = 1,
  className = ''
}) => {
  const colSpanClass = `col-span-${colSpan}`

  return (
    <div className={`${colSpanClass} ${className}`}>
      {children}
    </div>
  )
}
