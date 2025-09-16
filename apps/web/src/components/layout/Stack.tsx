import React from 'react'

interface StackProps {
  children: React.ReactNode
  direction?: 'row' | 'column'
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  className?: string
}

const spacingClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
}

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = ''
}) => {
  const baseClasses = 'flex'
  const directionClass = direction === 'row' ? 'flex-row' : 'flex-col'
  const spacingClass = spacingClasses[spacing]
  const alignClass = alignClasses[align]
  const justifyClass = justifyClasses[justify]
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap'

  const classes = `${baseClasses} ${directionClass} ${spacingClass} ${alignClass} ${justifyClass} ${wrapClass} ${className}`

  return (
    <div className={classes}>
      {children}
    </div>
  )
}
