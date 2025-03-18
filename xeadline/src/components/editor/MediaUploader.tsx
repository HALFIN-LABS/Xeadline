'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { storageService } from '../../services/storage'

interface MediaUploaderProps {
  topicId: string
  postId?: string
  onUpload?: (url: string, type: 'image' | 'video' | 'gif') => void
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  topicId,
  postId,
  onUpload
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
          >
            <Icon name="image" className="mr-1" />
            Image
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
          >
            <Icon name="video" className="mr-1" />
            Video
          </Button>
        </label>
        
        {/* Link embedding - will be implemented in Phase 3 */}
        <Button variant="secondary" size="sm" disabled={true} title="Coming soon">
          <Icon name="link" className="mr-1" />
          Link
        </Button>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}
      
      {/* File size information */}
      <div className="text-xs text-gray-500 mt-1">
        Max file sizes: Images 10MB (Videos 150MB coming soon)
      </div>
    </div>
  )
}