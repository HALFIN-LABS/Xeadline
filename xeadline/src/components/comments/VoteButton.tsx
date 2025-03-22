'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { eventManager } from '../../services/eventManagement'
import { RootState } from '../../redux/store'

interface VoteButtonProps {
  contentId: string
  contentType: 'post' | 'comment'
  initialVotes: number
  initialVote?: 'up' | 'down' | null
  onVoteChange?: (newVote: 'up' | 'down' | null, voteCount: number) => void
  size?: 'sm' | 'md' | 'lg'
  darkMode?: boolean
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  contentId,
  contentType,
  initialVotes = 0,
  initialVote = null,
  onVoteChange,
  size = 'md',
  darkMode = false
}) => {
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(initialVote)
  const [voteCount, setVoteCount] = useState<number>(initialVotes)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentUser = useSelector((state: RootState) => state.auth.currentUser)
  
  // Size classes for the buttons and text
  const sizeClasses = {
    sm: {
      button: 'p-0.5',
      icon: 'h-3 w-3',
      text: 'text-xs'
    },
    md: {
      button: 'p-1',
      icon: 'h-4 w-4',
      text: 'text-sm'
    },
    lg: {
      button: 'p-1.5',
      icon: 'h-5 w-5',
      text: 'text-base'
    }
  }
  
  const handleVote = async (vote: 'up' | 'down') => {
    if (!currentUser) return
    
    // If already voted the same way, remove the vote
    const newVote = currentVote === vote ? null : vote
    
    setIsSubmitting(true)
    
    try {
      // Create vote event
      const event = await eventManager.createEvent(
        7, // kind 7 = reaction
        newVote === 'up' ? '+' : newVote === 'down' ? '-' : '',
        [['e', contentId]] // Reference to the content being voted on
      )
      
      // Sign and publish
      const result = await eventManager.signAndPublishEvent(event)
      
      if (result.success) {
        // Calculate new vote count
        let newCount = voteCount
        
        if (currentVote === 'up' && newVote === null) {
          newCount -= 1
        } else if (currentVote === 'down' && newVote === null) {
          newCount += 1
        } else if (currentVote === null && newVote === 'up') {
          newCount += 1
        } else if (currentVote === null && newVote === 'down') {
          newCount -= 1
        } else if (currentVote === 'up' && newVote === 'down') {
          newCount -= 2
        } else if (currentVote === 'down' && newVote === 'up') {
          newCount += 2
        }
        
        setVoteCount(newCount)
        setCurrentVote(newVote)
        
        if (onVoteChange) {
          onVoteChange(newVote, newCount)
        }
      }
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="vote-buttons flex items-center">
      <button
        type="button"
        onClick={() => handleVote('up')}
        disabled={isSubmitting || !currentUser}
        className={`${sizeClasses[size].button} rounded-full ${
          currentVote === 'up'
            ? darkMode
              ? 'text-green-400'
              : 'text-green-600'
            : darkMode
              ? 'text-gray-400 hover:text-gray-200'
              : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
        title="Upvote"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={sizeClasses[size].icon} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      
      <span className={`${sizeClasses[size].text} font-medium mx-1 ${
        currentVote === 'up'
          ? darkMode
            ? 'text-green-400'
            : 'text-green-600'
          : currentVote === 'down'
            ? darkMode
              ? 'text-red-400'
              : 'text-red-600'
            : darkMode
              ? 'text-gray-400'
              : 'text-gray-600'
      }`}>
        {voteCount}
      </span>
      
      <button
        type="button"
        onClick={() => handleVote('down')}
        disabled={isSubmitting || !currentUser}
        className={`${sizeClasses[size].button} rounded-full ${
          currentVote === 'down'
            ? darkMode
              ? 'text-red-400'
              : 'text-red-600'
            : darkMode
              ? 'text-gray-400 hover:text-gray-200'
              : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
        title="Downvote"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={sizeClasses[size].icon} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}