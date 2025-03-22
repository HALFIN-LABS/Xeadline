'use client'

import React from 'react'
import Image from 'next/image'
import { getSafeImageUrl, createImageErrorHandler } from '../../utils/imageUtils'

interface AvatarProps {
  src?: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  pubkey?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  className = '',
  pubkey = ''
}) => {
  // Define size classes
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  // Define pixel sizes for Image component
  const pixelSizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64
  }

  // Get the safe image URL
  const safeImageUrl = pubkey ? getSafeImageUrl(src, pubkey) : src || ''

  // Combine classes
  const avatarClasses = `rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ${sizeClasses[size]} ${className}`

  return (
    <div className={avatarClasses}>
      {safeImageUrl ? (
        <Image
          src={safeImageUrl}
          alt={alt}
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          className="object-cover w-full h-full"
          onError={pubkey ? createImageErrorHandler(pubkey) : undefined}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-bottle-green text-white font-medium">
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}