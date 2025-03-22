'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { uploadToBlob, registerProgressCallback, unregisterProgressCallback } from '../../lib/blob'

interface MediaUploaderProps {
  topicId: string
  postId?: string
  onUpload?: (url: string, type: 'image' | 'video' | 'gif' | 'embed') => void
  darkMode?: boolean
  hideButtons?: boolean
}

interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  topicId,
  postId,
  onUpload,
  darkMode = false,
  hideButtons = false
}) => {
  // Basic upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingType, setUploadingType] = useState<'image' | 'video' | 'gif' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadId, setUploadId] = useState<string>('')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [showRetry, setShowRetry] = useState(false)
  
  // Simplified progress tracking to avoid browser crashes
  const [uploadStage, setUploadStage] = useState<'preparing' | 'uploading' | 'processing' | 'complete'>('preparing')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const gifInputRef = useRef<HTMLInputElement>(null)
  
  // Helper function to format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  // Register and unregister progress callback with simplified tracking
  useEffect(() => {
    if (uploadId) {
      registerProgressCallback(uploadId, (progress) => {
        // Update basic progress
        setUploadProgress(progress);
        
        // Determine upload stage based on progress
        if (progress < 5) {
          setUploadStage('preparing');
        } else if (progress < 90) {
          setUploadStage('uploading');
        } else if (progress < 100) {
          setUploadStage('processing');
        } else {
          setUploadStage('complete');
        }
      });
      
      return () => {
        unregisterProgressCallback(uploadId);
      };
    }
  }, [uploadId]);

  // Media upload handler
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement> | null, type: 'image' | 'video' | 'gif', fileToRetry?: File) => {
    // If this is a retry, use the stored file
    const file = fileToRetry || (e?.target?.files?.[0])
    if (!file) return

    // Store the file for potential retries
    setCurrentFile(file)
    
    // Check file size limits
    const fileSizeInMB = file.size / (1024 * 1024)
    const sizeLimit = type === 'video' ? 150 : 10 // 150MB for videos, 10MB for images/GIFs
    
    if (fileSizeInMB > sizeLimit) {
      setError(`File too large. ${type === 'video' ? 'Videos' : 'Images'} must be under ${sizeLimit}MB.`)
      return
    }
    
    setIsUploading(true)
    setUploadingType(type)
    setError(null)
    setUploadProgress(0)
    setShowRetry(false)
    
    // Generate a unique upload ID for tracking progress
    const newUploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setUploadId(newUploadId);
    
    try {
      // Compress image if needed
      let fileToUpload = file
      if (type === 'image' && fileSizeInMB > 2) {
        fileToUpload = await compressImage(file)
      }
      
      // Use the uploadToBlob function with progress tracking
      const url = await uploadToBlob(
        fileToUpload,
        'post',
        type,
        topicId,
        postId || 'new-post',
        newUploadId // Pass the upload ID for progress tracking
      )
      
      // Call onUpload callback with the URL
      if (onUpload) {
        onUpload(url, type)
      }
      
      // Reset retry count on success
      setRetryCount(0)
      setCurrentFile(null)
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      
      // Show error message
      const errorMessage = error instanceof Error ? error.message : `Failed to upload ${type}`;
      setError(errorMessage)
      
      // Show retry button if we haven't exceeded max retries
      if (retryCount < 3) {
        setShowRetry(true)
      } else {
        setError(`Failed to upload after multiple attempts. Please try again later.`)
      }
    } finally {
      setIsUploading(false)
      setUploadingType(null)
      
      // Only reset upload ID and progress if not showing retry
      if (!showRetry) {
        setTimeout(() => {
          setUploadId('');
          setUploadProgress(0);
        }, 1000);
      }
    }
  }
  
  // Retry upload handler
  const handleRetry = () => {
    if (!currentFile || !uploadingType) return;
    
    // Increment retry count
    setRetryCount(prev => prev + 1);
    
    // Retry the upload with the same file
    handleMediaUpload(null, uploadingType, currentFile);
  }

  // Compress image using canvas
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width
          let height = img.height
          const maxDimension = 1920
          
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width
            width = maxDimension
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height
            height = maxDimension
          }
          
          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)
          
          // Convert to blob with reduced quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
              
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              
              resolve(newFile)
            },
            'image/jpeg',
            0.8 // Quality parameter (0.8 = 80% quality)
          )
        }
        img.onerror = () => {
          reject(new Error('Failed to load image for compression'))
        }
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file for compression'))
      }
    })
  }

  // Handle link unfurling
  const handleLinkUnfurl = async () => {
    if (!linkUrl.trim()) return
    
    setIsLoadingPreview(true)
    setError(null)
    
    try {
      // Validate URL format
      let url = linkUrl.trim()
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url
      }
      
      // Fetch link preview data
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch link preview')
      }
      
      const data = await response.json()
      
      setLinkPreview({
        url: data.url || url,
        title: data.title,
        description: data.description,
        image: data.image,
        siteName: data.siteName
      })
    } catch (error) {
      console.error('Error unfurling link:', error)
      setError('Failed to fetch link preview. Please check the URL and try again.')
      setLinkPreview(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Handle link submission
  const handleLinkSubmit = () => {
    if (!linkPreview) return
    
    if (onUpload) {
      // Pass the link preview data as a JSON string in the URL
      const embedData = JSON.stringify(linkPreview)
      onUpload(embedData, 'embed')
    }
    
    // Reset link input
    setLinkUrl('')
    setLinkPreview(null)
    setShowLinkInput(false)
  }

  // Handle YouTube/Vimeo embed
  const handleVideoEmbed = () => {
    if (!linkUrl.trim()) return
    
    // Extract video ID from YouTube or Vimeo URL
    let videoId = ''
    let platform = ''
    
    // YouTube URL patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    const youtubeMatch = linkUrl.match(youtubeRegex)
    
    // Vimeo URL patterns
    const vimeoRegex = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)(?:$|\/|\?))/i
    const vimeoMatch = linkUrl.match(vimeoRegex)
    
    if (youtubeMatch && youtubeMatch[1]) {
      videoId = youtubeMatch[1]
      platform = 'youtube'
    } else if (vimeoMatch && vimeoMatch[1]) {
      videoId = vimeoMatch[1]
      platform = 'vimeo'
    } else {
      setError('Invalid YouTube or Vimeo URL. Please check the URL and try again.')
      return
    }
    
    // Create embed data
    const embedData = {
      url: linkUrl,
      videoId,
      platform,
      type: 'video-embed'
    }
    
    if (onUpload) {
      onUpload(JSON.stringify(embedData), 'embed')
    }
    
    // Reset link input
    setLinkUrl('')
    setShowLinkInput(false)
  }

  return (
    <div className="media-uploader">
      {!hideButtons && (
        <div className="flex items-center flex-wrap gap-2">
          {/* Image upload */}
          <Button
            variant="secondary"
            size="sm"
            isLoading={isUploading && uploadingType === 'image'}
            disabled={isUploading}
            title="Upload image (max 10MB)"
            className={darkMode ? 'bg-black/30 border-gray-700/30 text-gray-300 hover:bg-black/50 backdrop-blur-sm rounded-md px-4 py-2' : ''}
            onClick={() => fileInputRef.current?.click()}
          >
            Image <Icon name="image" className="ml-2" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleMediaUpload(e, 'image')}
            className="hidden"
          />
          
          {/* Video upload */}
          <Button
            variant="secondary"
            size="sm"
            isLoading={isUploading && uploadingType === 'video' && uploadProgress === 0}
            disabled={isUploading}
            title="Upload video (max 150MB)"
            className={darkMode ? 'bg-black/30 border-gray-700/30 text-gray-300 hover:bg-black/50 backdrop-blur-sm rounded-md px-4 py-2' : ''}
            onClick={() => videoInputRef.current?.click()}
          >
            Video <Icon name="video" className="ml-2" />
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mov"
            onChange={(e) => handleMediaUpload(e, 'video')}
            className="hidden"
          />
          
          {/* GIF upload */}
          <Button
            variant="secondary"
            size="sm"
            isLoading={isUploading && uploadingType === 'gif'}
            disabled={isUploading}
            title="Upload GIF (max 10MB)"
            className={darkMode ? 'bg-black/30 border-gray-700/30 text-gray-300 hover:bg-black/50 backdrop-blur-sm rounded-md px-4 py-2' : ''}
            onClick={() => gifInputRef.current?.click()}
          >
            GIF <Icon name="gift" className="ml-2" />
          </Button>
          <input
            ref={gifInputRef}
            type="file"
            accept="image/gif"
            onChange={(e) => handleMediaUpload(e, 'gif')}
            className="hidden"
          />
          
          {/* Link embedding */}
          <Button
            variant="secondary"
            size="sm"
            disabled={isUploading}
            title="Embed link with preview"
            className={darkMode ? 'bg-black/30 border-gray-700/30 text-gray-300 hover:bg-black/50 backdrop-blur-sm rounded-md px-4 py-2' : ''}
            onClick={() => setShowLinkInput(!showLinkInput)}
          >
            Link <Icon name="link" className="ml-2" />
          </Button>
        </div>
      )}
      
      {/* Link input for embedding */}
      {showLinkInput && (
        <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-black/20 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL to embed"
              className={`flex-1 ${darkMode ? 'bg-black/30 border-gray-700/30 text-white' : ''}`}
            />
            <Button
              variant="primary"
              size="sm"
              isLoading={isLoadingPreview}
              disabled={!linkUrl.trim() || isLoadingPreview}
              onClick={handleLinkUnfurl}
            >
              Preview
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button
              type="button"
              className="text-blue-500 hover:underline"
              onClick={handleVideoEmbed}
            >
              YouTube/Vimeo
            </button>
            <span>•</span>
            <button
              type="button"
              className="text-blue-500 hover:underline"
              onClick={() => {
                setShowLinkInput(false)
                setLinkUrl('')
                setLinkPreview(null)
              }}
            >
              Cancel
            </button>
          </div>
          
          {/* Link preview */}
          {linkPreview && (
            <div className={`mt-3 p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-black/30' : 'border-gray-300 bg-white'}`}>
              {linkPreview.image && (
                <div className="mb-2">
                  <img
                    src={linkPreview.image}
                    alt={linkPreview.title || 'Link preview'}
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
              <div className="text-sm font-medium">{linkPreview.title || 'No title'}</div>
              {linkPreview.description && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{linkPreview.description}</div>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500">{linkPreview.siteName || new URL(linkPreview.url).hostname}</div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLinkSubmit}
                >
                  Add Link
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced upload progress bar */}
      {isUploading && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium flex items-center">
              <span className="mr-2">
                {uploadStage === 'preparing' ? 'Preparing' :
                 uploadStage === 'uploading' ? 'Uploading' :
                 uploadStage === 'processing' ? 'Processing' : 'Completing'} {uploadingType}...
              </span>
              <span className="font-bold">{uploadProgress}%</span>
            </div>
            {uploadingType === 'video' && uploadStage === 'preparing' && (
              <div className="text-xs text-blue-500 flex items-center">
                <Icon name="file-text" size={12} className="mr-1" />
                Optimizing for your connection
              </div>
            )}
          </div>
          
          {/* Progress bar with stages */}
          <div className={`w-full h-4 bg-gray-200 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : ''}`}>
            <div
              className={`h-full transition-all duration-300 ease-in-out ${
                uploadStage === 'preparing' ? 'bg-yellow-500' :
                uploadStage === 'uploading' ? 'bg-blue-500' :
                uploadStage === 'processing' ? 'bg-purple-500' : 'bg-green-500'
              }`}
              style={{ width: `${uploadProgress || 1}%` }}
            ></div>
          </div>
          
          {/* Simplified status information */}
          <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
            <span className="font-medium">
              {uploadStage === 'preparing' ? 'Preparing upload...' :
               uploadStage === 'uploading' ? 'Uploading to secure storage...' :
               uploadStage === 'processing' ? 'Processing upload...' : 'Finalizing...'}
            </span>
            <span>
              {uploadingType === 'video' ? 'Large files may take longer' : ''}
            </span>
          </div>
          
          {/* Video-specific guidance */}
          {uploadingType === 'video' && (
            <div className="mt-2 text-xs">
              {uploadStage === 'uploading' && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <Icon name="file-text" size={12} className="mr-1" />
                  <span>Video uploads use chunked uploading for reliability</span>
                </div>
              )}
              {uploadStage === 'processing' && (
                <div className="flex items-center text-purple-600 dark:text-purple-400">
                  <Icon name="zap" size={12} className="mr-1" />
                  <span>Processing video for optimal playback</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Error message with retry button */}
      {error && !showRetry && (
        <div className={`text-red-500 text-sm mt-2 ${darkMode ? 'bg-black/20 p-2 rounded-lg border border-red-500/30' : ''}`}>
          {error}
        </div>
      )}
      
      {/* Retry button */}
      {showRetry && !isUploading && (
        <div className="mt-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-50/10">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="ml-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Retry Upload
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Attempt {retryCount + 1} of 3
          </p>
        </div>
      )}
      
      {/* File size information */}
      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
        Max file sizes: Images/GIFs 10MB, Videos 150MB
      </div>
    </div>
  )
}