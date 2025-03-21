'use client'

import React from 'react'
import { Icon } from '../ui/Icon'
import { LinkPreviewData } from './LinkUnfurler'
import { VideoEmbedData } from './VideoEmbed'

interface EmbeddedContentProps {
  content: string // JSON string of LinkPreviewData or VideoEmbedData
  onRemove?: () => void
  darkMode?: boolean
  className?: string
}

export const EmbeddedContent: React.FC<EmbeddedContentProps> = ({
  content,
  onRemove,
  darkMode = false,
  className = ''
}) => {
  // Parse the content
  const parseContent = (): LinkPreviewData | VideoEmbedData | null => {
    try {
      return JSON.parse(content)
    } catch (error) {
      console.error('Error parsing embedded content:', error)
      return null
    }
  }
  
  const parsedContent = parseContent()
  
  if (!parsedContent) {
    return (
      <div className={`p-3 rounded-lg border ${darkMode ? 'border-red-500/30 bg-black/30 text-white' : 'border-red-300 bg-red-50'}`}>
        Invalid embedded content
      </div>
    )
  }
  
  // Determine if it's a video embed
  const isVideoEmbed = 'platform' in parsedContent && 'videoId' in parsedContent
  
  // Render video embed
  if (isVideoEmbed) {
    const videoData = parsedContent as VideoEmbedData
    
    return (
      <div className={`relative p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-black/30 text-white' : 'border-gray-300 bg-white'}`}>
        {onRemove && (
          <button
            className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1"
            onClick={onRemove}
            title="Remove"
          >
            ✕
          </button>
        )}
        
        <div className="aspect-video bg-black mb-2">
          {videoData.platform === 'youtube' ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoData.videoId}`}
              title={videoData.title || 'YouTube video'}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <iframe
              src={`https://player.vimeo.com/video/${videoData.videoId}`}
              title={videoData.title || 'Vimeo video'}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          )}
        </div>
        
        <div className="text-sm font-medium">{videoData.title || 'Video'}</div>
        <div className="text-xs text-gray-500 mt-1">
          {videoData.platform === 'youtube' ? 'YouTube' : 'Vimeo'}
        </div>
      </div>
    )
  }
  
  // Render link preview
  const linkData = parsedContent as LinkPreviewData
  
  // Check if this is a link-post preview (from className)
  const isLinkPost = className.includes('link-post-preview')
  
  return (
    <div className={`relative p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-black/30 text-white' : 'border-gray-300 bg-white'} ${className}`}>
      {onRemove && (
        <button
          className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1"
          onClick={onRemove}
          title="Remove"
        >
          ✕
        </button>
      )}
      
      <div className={isLinkPost ? "flex flex-col" : "flex"}>
        {linkData.image && (
          <div className={isLinkPost ? "w-full mb-3" : "mr-3 flex-shrink-0"}>
            <img
              src={linkData.image}
              alt={linkData.title || 'Link preview'}
              className={isLinkPost
                ? "w-full h-48 object-cover rounded-md"
                : "w-20 h-20 object-cover rounded-md"
              }
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className={`${isLinkPost ? 'text-base' : 'text-sm'} font-medium truncate`}>
            {linkData.title || 'No title'}
          </div>
          
          {linkData.description && (
            <div className={`${isLinkPost ? 'text-sm line-clamp-3' : 'text-xs line-clamp-2'} text-gray-500 mt-1`}>
              {linkData.description}
            </div>
          )}
          
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <Icon name="link" className="mr-1" size={12} />
            <span className="truncate">
              {linkData.siteName || new URL(linkData.url).hostname}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}