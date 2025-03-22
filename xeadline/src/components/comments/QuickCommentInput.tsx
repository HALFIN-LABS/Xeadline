'use client'

import React, { useState } from 'react'
import { useAppSelector } from '../../redux/hooks'
import { eventManager } from '../../services/eventManagement'
import { RootState } from '../../redux/store'
import { Button } from '../ui/Button'
import { RichTextEditor } from '../editor/RichTextEditor'
import { Icon } from '../ui/Icon'

interface QuickCommentInputProps {
  postId: string
  onCommentCreated?: () => void
  darkMode?: boolean
}

export const QuickCommentInput: React.FC<QuickCommentInputProps> = ({
  postId,
  onCommentCreated,
  darkMode: propDarkMode = false
}) => {
  // Use the HTML class for dark mode detection, falling back to the prop
  const darkMode = typeof window !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : propDarkMode;
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUser = useAppSelector((state: RootState) => state.auth.currentUser)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError('Comment cannot be empty')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Generate a unique identifier for the 'd' tag
      const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      
      // Prepare tags for the comment event
      const tags = [
        ['e', postId, '', 'root'], // Reference to the post as the root
        ['d', uniqueId] // Add the 'd' tag required for addressable events
      ];
      
      // Prepare content with media if present
      const eventContent = JSON.stringify({
        text: content
      });
      
      // Import EVENT_TYPES
      const { EVENT_TYPES } = await import('../../constants/eventTypes');
      
      // Create comment event using the EventManager
      const event = await eventManager.createEvent(
        EVENT_TYPES.COMMENT, // Use the correct event kind for comments (33305)
        eventContent,
        tags
      );
      
      // Sign and publish with proper error handling
      const result = await eventManager.signAndPublishEvent(event);
      
      if (result.success) {
        // Reset form
        setContent('')
        
        // Call the onCommentCreated callback if provided
        if (onCommentCreated) {
          onCommentCreated()
        }
        
        console.log('Comment published successfully:', result);
      } else {
        setError('Failed to publish comment. Please try again.')
        console.error('Failed to publish comment:', result);
      }
    } catch (error) {
      console.error('Error creating comment:', error)
      setError('An error occurred while creating your comment.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!currentUser) {
    return (
      <div className={`${darkMode ? 'bg-black' : 'bg-white'} rounded-lg p-4 shadow`}>
        <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Sign in to comment on this post
        </p>
      </div>
    )
  }
  
  return (
    <form onSubmit={handleSubmit} className={`${darkMode ? 'bg-black' : 'bg-white'} rounded-lg p-4 shadow`}>
      <div className="flex items-start">
        {/* User avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-bottle-green text-white flex items-center justify-center mr-3">
          {currentUser.publicKey?.charAt(0) || 'U'}
        </div>
        
        <div className="flex-1">
          <RichTextEditor
            onChange={(text) => setContent(text)}
            placeholder="Add a comment..."
            initialContent={content}
            className={`comment-input w-full mb-3 ${darkMode ? 'bg-black text-white border-gray-600' : ''}`}
          />
          
          {error && (
            <div className={`text-red-500 text-sm mb-3 ${darkMode ? 'bg-red-900/20 p-2 rounded-lg border border-red-500/30' : ''}`}>
              {error}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className={`flex items-center space-x-1 ${
                  darkMode
                    ? 'text-gray-300 hover:bg-gray-900'
                    : 'text-gray-600 hover:bg-gray-100'
                } p-1 rounded-md transition-colors`}
                title="Add media (coming soon)"
                disabled
              >
                <Icon name="image" size={18} />
                <span className="text-sm">Media</span>
              </button>
            </div>
            
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!content.trim() || isSubmitting}
              isLoading={isSubmitting}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}