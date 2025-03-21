'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'

interface LinkUnfurlerProps {
  onUnfurl: (linkData: LinkPreviewData) => void
  darkMode?: boolean
}

export interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

export const LinkUnfurler: React.FC<LinkUnfurlerProps> = ({
  onUnfurl,
  darkMode = false
}) => {
  const [url, setUrl] = useState(() => {
    // Check for prefilled URL from localStorage
    const prefillUrl = typeof window !== 'undefined' ? localStorage.getItem('prefill_link_url') : null
    if (prefillUrl) {
      // Clear it immediately to avoid reuse
      localStorage.removeItem('prefill_link_url')
      return prefillUrl
    }
    return ''
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null)
  
  // Handle link unfurling
  const handleUnfurl = React.useCallback(async () => {
    if (!url.trim()) return
    
    setIsLoading(true)
    setError(null)
    setPreviewData(null)
    
    try {
      // Validate URL format
      let validUrl = url.trim()
      if (!/^https?:\/\//i.test(validUrl)) {
        validUrl = 'https://' + validUrl
      }
      
      // Fetch link preview data
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(validUrl)}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch link preview')
      }
      
      const data = await response.json()
      
      setPreviewData({
        url: data.url || validUrl,
        title: data.title,
        description: data.description,
        image: data.image,
        siteName: data.siteName
      })
    } catch (error) {
      console.error('Error unfurling link:', error)
      setError('Failed to fetch link preview. Please check the URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [url])
  
  // Auto-unfurl if URL is prefilled
  React.useEffect(() => {
    // Only run this effect once on mount, but only if URL is not empty
    const initialUrl = url
    if (initialUrl && initialUrl.trim()) {
      handleUnfurl()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array to run only on mount

  // Handle embed
  const handleEmbed = () => {
    if (!previewData) return
    
    onUnfurl(previewData)
    
    // Reset form
    setUrl('')
    setPreviewData(null)
  }

  return (
    <div className={`link-unfurler ${darkMode ? 'text-white' : ''}`}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Website URL
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={`flex-1 ${darkMode ? 'bg-black/30 border-gray-700/30 text-white' : ''}`}
          />
          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            disabled={!url.trim() || isLoading}
            onClick={handleUnfurl}
          >
            Preview
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Paste a URL to generate a rich preview card
        </p>
      </div>
      
      {error && (
        <div className={`text-red-500 text-sm mb-4 ${darkMode ? 'bg-black/20 p-2 rounded-lg border border-red-500/30' : ''}`}>
          {error}
        </div>
      )}
      
      {previewData && (
        <div className={`mb-4 p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-black/30' : 'border-gray-300 bg-white'}`}>
          {previewData.image && (
            <div className="mb-2">
              <img 
                src={previewData.image} 
                alt={previewData.title || 'Link preview'} 
                className="w-full h-32 object-cover rounded-md"
              />
            </div>
          )}
          <div className="text-sm font-medium">{previewData.title || 'No title'}</div>
          {previewData.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{previewData.description}</div>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              {previewData.siteName || new URL(previewData.url).hostname}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEmbed}
            >
              Add Link
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}