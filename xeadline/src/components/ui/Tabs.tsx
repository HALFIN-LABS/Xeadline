'use client'

import React from 'react'

interface TabsProps {
  children: React.ReactNode
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({ children, className = '' }) => {
  const baseClasses = 'flex border-b border-gray-200 dark:border-gray-700'
  const classes = [baseClasses, className].join(' ')

  return (
    <div className={classes}>
      {children}
    </div>
  )
}

interface TabProps {
  label: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

export const Tab: React.FC<TabProps> = ({
  label,
  active = false,
  onClick,
  className = ''
}) => {
  const baseClasses = 'px-4 py-2 text-sm font-medium cursor-pointer'
  const activeClasses = active
    ? 'text-bottle-green border-b-2 border-bottle-green'
    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
  const classes = [baseClasses, activeClasses, className].join(' ')

  return (
    <div className={classes} onClick={onClick}>
      {label}
    </div>
  )
}