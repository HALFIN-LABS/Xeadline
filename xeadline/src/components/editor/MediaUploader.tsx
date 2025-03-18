'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { storageService } from '../../services/storage'

interface MediaUploaderProps {
  topicId: string
  postId?: string
  onUpload?: (url: string, type: 'image' | 'video' | 'gif') => void
  darkMode?: boolean
  hideButtons?: boolean
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  topicId,
  postId,
  onUpload,
  darkMode = false,
  hideButtons = false
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simple media upload handler for Phase 1
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'gif') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Check file size limits
    const fileSizeInMB = file.size / (1024 * 1024)
    const sizeLimit = type === 'video' ? 150 : 10 // 150MB for videos, 10MB for images/GIFs
    
    if (fileSizeInMB > sizeLimit) {
      setError(`File too large. ${type === 'video' ? 'Videos' : 'Images'} must be under ${sizeLimit}MB.`)
      return
    }
    
    setIsUploading(true)
    setError(null)
    
    try {
      // Upload media using storage service
      const result = await storageService.store(file, {
        contentType: file.type,
        metadata: {
          fileName: file.name,
          topicId,
          postId: postId || 'new-post',
          mediaType: type,
          uploadedAt: new Date().toISOString()
        }
      })
      
      // Call onUpload callback with the URL
      if (onUpload) {
        onUpload(result.url, type)
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      setError(`Failed to upload ${type}. Please try again.`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="media-uploader">
      {!hideButtons && (
        <div className="flex items-center">
          {/* Image upload */}
          <label className="cursor-pointer mr-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleMediaUpload(e, 'image')}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              isLoading={isUploading}
              disabled={isUploading}
              title="Upload image (max 10MB)"
              className={darkMode ? 'bg-black/30 border-gray-700/30 text-gray-300 hover:bg-black/50 backdrop-blur-sm rounded-md px-4 py-2' : ''}
            >
              Image <Icon name="image" className="ml-2" />
            </Button>
          </label>
          
          {/* Video upload - will be implemented in Phase 3 */}
          <label className="cursor-pointer mr-2">
            <input
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={(e) => handleMediaUpload(e, 'video')}
              className="hidden"
              disabled
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={true}
              title="Coming soon"
              className={darkMode ? 'bg-black/30 border-gray-700/30 text-gray-300 hover:bg-black/50 backdrop-blur-sm rounded-md px-4 py-2' : ''}
            >
              Video <Icon name="video" className="ml-2" />
            </Button>
          </label>
          
          {/* Link embedding - will be implemented in Phase 3 */}
          <Button
            variant="secondary"
            size="sm"
            disabled={true}
            title="Coming soon"
            className={darkMode ? 'bg-black/30 border-gray-700/30 text-gray-300 hover:bg-black/50 backdrop-blur-sm rounded-md px-4 py-2' : ''}
          >
            Link <Icon name="link" className="ml-2" />
          </Button>
        </div>
      )}
      
      {error && (
        <div className={`text-red-500 text-sm mt-2 ${darkMode ? 'bg-black/20 p-2 rounded-lg border border-red-500/30' : ''}`}>
          {error}
        </div>
      )}
      
      {/* File size information */}
      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
        Max file sizes: Images 10MB (Videos 150MB coming soon)
      </div>
    </div>
  )
}