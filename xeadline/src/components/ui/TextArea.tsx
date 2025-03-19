'use client'

import React, { forwardRef } from 'react'

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'block w-full rounded-md border border-gray-300 dark:border-gray-700 shadow-sm focus:border-bottle-green focus:ring focus:ring-bottle-green focus:ring-opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
  const classes = [baseClasses, errorClasses, className].join(' ')

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <textarea ref={ref} className={classes} {...props} />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
})

TextArea.displayName = 'TextArea'