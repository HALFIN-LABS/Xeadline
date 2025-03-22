'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { eventManager } from '../../services/eventManagement'
import { RootState } from '../../redux/store'
import { Button } from '../ui/Button'
import { TextArea } from '../ui/TextArea'
import { Icon } from '../ui/Icon'
import { MediaUploader } from '../editor/MediaUploader'

interface CommentFormProps {
  postId: string
  parentCommentId?: string
  onCommentCreated?: () => void
  darkMode?: boolean
}

export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentCommentId,
  onCommentCreated,
  darkMode = false
}) => {
  const [content, setContent] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaTypes, setMediaTypes] = useState<('image' | 'video' | 'gif')[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMediaUploader, setShowMediaUploader] = useState(false)
  const currentUser = useSelector((state: RootState) => state.auth.currentUser)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && mediaUrls.length === 0) {
      setError('Comment cannot be empty')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Prepare tags for the comment event
      const tags = [
        ['e', postId, 'root', 'reply'] // Reference to the post as the root
      ]
      
      // If this is a reply to another comment, add that reference
      if (parentCommentId) {
        tags.push(['e', parentCommentId, 'reply'])
      }
      
      // Prepare content with media if present
      const eventContent = JSON.stringify({
        text: content,
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
        thumbnails: thumbnails.length > 0 ? thumbnails : undefined
      })
      
      // Create comment event using the EventManager
      const event = await eventManager.createEvent(
        1, // kind 1 = text note
        eventContent,
        tags
      )
      
      // Sign and publish with proper error handling
      const result = await eventManager.signAndPublishEvent(event)
      
      if (result.success) {
        // Reset form on success
        setContent('')
        setMediaUrls([])
        setMediaTypes([])
        setThumbnails([])
        setShowMediaUploader(false)
        
        // Call the onCommentCreated callback if provided
        if (onCommentCreated) {
          onCommentCreated()
        }
      } else {
        setError('Failed to publish comment. Please try again.')
      }
    } catch (error) {
      console.error('Error creating comment:', error)
      setError('An error occurred while creating your comment.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle media upload
  const handleMediaUpload = (url: string, type: 'image' | 'video' | 'gif' | 'embed') => {
    if (type === 'embed') {
      // Embeds are not supported in comments for now
      return
    }
    
    // For media files, add to mediaUrls and track the media type
    setMediaUrls(prev => [...prev, url])
    setMediaTypes(prev => [...prev, type])
    
    // For videos, we could generate a thumbnail in the future
    if (type === 'video') {
      // For now, just add an empty placeholder
      setThumbnails(prev => [...prev, ''])
    }
  }
  
  // Remove media
  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index))
    setMediaTypes(prev => prev.filter((_, i) => i !== index))
    setThumbnails(prev => prev.filter((_, i) => i !== index))
  }
  
  if (!currentUser) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 mb-4 shadow`}>
        <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Sign in to comment on this post
        </p>
      </div>
    )
  }
  
  return (
    <form onSubmit={handleSubmit} className={`mb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
      <div className="flex flex-col">
        <div className="flex items-start">
          {/* User avatar placeholder - replace with actual avatar component when available */}
          <div className="w-10 h-10 rounded-full bg-bottle-green text-white flex items-center justify-center mr-3">
            {currentUser.publicKey?.charAt(0) || 'U'}
          </div>
          
          <div className="flex-1">
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={parentCommentId ? "Write a reply..." : "Write a comment..."}
              className={`w-full mb-3 min-h-[100px] ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
            />
            
            {/* Media preview */}
            {mediaUrls.length > 0 && (
              <div className="mt-2 mb-3 grid grid-cols-1 gap-2">
                {mediaUrls.map((url, index) => (
                  <div key={`media-${index}`} className="relative">
                    {mediaTypes[index] === 'video' ? (
                      <video
                        src={url}
                        controls
                        preload="metadata"
                        playsInline
                        className="w-full h-40 object-contain rounded-md bg-black"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={url}
                        alt={`Uploaded media ${index + 1}`}
                        className="w-full h-40 object-contain rounded-md"
                      />
                    )}
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      onClick={() => handleRemoveMedia(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Media uploader */}
            {showMediaUploader && (
              <div className="mb-3">
                <MediaUploader
                  topicId=""
                  postId={postId}
                  onUpload={handleMediaUpload}
                  darkMode={darkMode}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max file sizes: Images/GIFs 5MB, Videos 50MB
                </div>
              </div>
            )}
            
            {error && (
              <div className={`text-red-500 text-sm mb-3 ${darkMode ? 'bg-red-900/20 p-2 rounded-lg border border-red-500/30' : ''}`}>
                {error}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMediaUploader(!showMediaUploader)}
                  className={`flex items-center space-x-1 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} p-1 rounded-md transition-colors`}
                >
                  <Icon name="image" size={18} />
                  <span className="text-sm">Media</span>
                </button>
              </div>
              
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={(!content.trim() && mediaUrls.length === 0) || isSubmitting}
                isLoading={isSubmitting}
              >
                {parentCommentId ? 'Reply' : 'Comment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}