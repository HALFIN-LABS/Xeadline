'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { eventManager } from '../../services/eventManagement'
import { RootState } from '../../redux/store'
import { Button } from '../ui/Button'
import { TextArea } from '../ui/TextArea'
import { Icon } from '../ui/Icon'

interface QuickCommentInputProps {
  postId: string
  onCommentCreated?: () => void
  darkMode?: boolean
}

export const QuickCommentInput: React.FC<QuickCommentInputProps> = ({
  postId,
  onCommentCreated,
  darkMode = false
}) => {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUser = useSelector((state: RootState) => state.auth.currentUser)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError('Comment cannot be empty')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Create comment event
      const event = await eventManager.createEvent(
        1, // kind 1 = text note
        JSON.stringify({ text: content }),
        [['e', postId, 'root', 'reply']] // Reference to the post
      )
      
      // Sign and publish
      const result = await eventManager.signAndPublishEvent(event)
      
      if (result.success) {
        // Reset form
        setContent('')
        
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
  
  if (!currentUser) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
        <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Sign in to comment on this post
        </p>
      </div>
    )
  }
  
  return (
    <form onSubmit={handleSubmit} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
      <div className="flex items-start">
        {/* User avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-bottle-green text-white flex items-center justify-center mr-3">
          {currentUser.publicKey?.charAt(0) || 'U'}
        </div>
        
        <div className="flex-1">
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className={`w-full mb-3 min-h-[100px] ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
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
                    ? 'text-gray-300 hover:bg-gray-700' 
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