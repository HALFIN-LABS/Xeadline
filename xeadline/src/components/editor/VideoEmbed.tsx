'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'

interface VideoEmbedProps {
  onEmbed: (embedData: VideoEmbedData) => void
  darkMode?: boolean
}

export interface VideoEmbedData {
  url: string
  videoId: string
  platform: 'youtube' | 'vimeo'
  title?: string
  thumbnailUrl?: string
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({
  onEmbed,
  darkMode = false
}) => {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<VideoEmbedData | null>(null)

  // Extract video ID and platform from URL
  const parseVideoUrl = (inputUrl: string): { videoId: string; platform: 'youtube' | 'vimeo' } | null => {
    // YouTube URL patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    const youtubeMatch = inputUrl.match(youtubeRegex)
    
    // Vimeo URL patterns
    const vimeoRegex = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)(?:$|\/|\?))/i
    const vimeoMatch = inputUrl.match(vimeoRegex)
    
    if (youtubeMatch && youtubeMatch[1]) {
      return { videoId: youtubeMatch[1], platform: 'youtube' }
    } else if (vimeoMatch && vimeoMatch[1]) {
      return { videoId: vimeoMatch[1], platform: 'vimeo' }
    }
    
    return null
  }

  // Fetch video metadata
  const fetchVideoMetadata = async (videoId: string, platform: 'youtube' | 'vimeo') => {
    setIsLoading(true)
    setError(null)
    
    try {
      // In a real implementation, we would call an API to get video metadata
      // For now, we'll just create a mock response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let title = ''
      let thumbnailUrl = ''
      
      if (platform === 'youtube') {
        title = `YouTube Video (ID: ${videoId})`
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      } else {
        title = `Vimeo Video (ID: ${videoId})`
        thumbnailUrl = `https://i.vimeocdn.com/video/${videoId}_640.jpg`
      }
      
      return { title, thumbnailUrl }
    } catch (error) {
      console.error('Error fetching video metadata:', error)
      throw new Error('Failed to fetch video metadata')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle URL preview
  const handlePreview = async () => {
    if (!url.trim()) return
    
    setIsLoading(true)
    setError(null)
    setPreviewData(null)
    
    try {
      const parsedVideo = parseVideoUrl(url.trim())
      
      if (!parsedVideo) {
        setError('Invalid YouTube or Vimeo URL. Please enter a valid video URL.')
        return
      }
      
      const { videoId, platform } = parsedVideo
      
      // Fetch video metadata
      const metadata = await fetchVideoMetadata(videoId, platform)
      
      // Set preview data
      setPreviewData({
        url: url.trim(),
        videoId,
        platform,
        title: metadata.title,
        thumbnailUrl: metadata.thumbnailUrl
      })
    } catch (error) {
      console.error('Error previewing video:', error)
      setError('Failed to preview video. Please check the URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle embed
  const handleEmbed = () => {
    if (!previewData) return
    
    onEmbed(previewData)
    
    // Reset form
    setUrl('')
    setPreviewData(null)
  }

  return (
    <div className={`video-embed ${darkMode ? 'text-white' : ''}`}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          YouTube or Vimeo URL
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`flex-1 ${darkMode ? 'bg-black/30 border-gray-700/30 text-white' : ''}`}
          />
          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            disabled={!url.trim() || isLoading}
            onClick={handlePreview}
          >
            Preview
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Paste a YouTube or Vimeo video URL to embed it in your post
        </p>
      </div>
      
      {error && (
        <div className={`text-red-500 text-sm mb-4 ${darkMode ? 'bg-black/20 p-2 rounded-lg border border-red-500/30' : ''}`}>
          {error}
        </div>
      )}
      
      {previewData && (
        <div className={`mb-4 p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-black/30' : 'border-gray-300 bg-white'}`}>
          <div className="relative aspect-video bg-black mb-2">
            {previewData.platform === 'youtube' ? (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src={previewData.thumbnailUrl} 
                  alt={previewData.title || 'YouTube video'} 
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                    <Icon name="play" className="text-white" size={24} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src={previewData.thumbnailUrl} 
                  alt={previewData.title || 'Vimeo video'} 
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Icon name="play" className="text-white" size={24} />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-sm font-medium mb-1">{previewData.title}</div>
          <div className="text-xs text-gray-500 mb-2">
            {previewData.platform === 'youtube' ? 'YouTube' : 'Vimeo'} • {previewData.url}
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={handleEmbed}
            >
              Embed Video
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}