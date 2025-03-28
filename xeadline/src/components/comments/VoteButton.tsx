'use client'

import React, { useState, useEffect } from 'react'
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
  darkMode: propDarkMode = false
}) => {
  // Use the HTML class for dark mode detection, falling back to the prop
  const darkMode = typeof window !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : propDarkMode;
  // Use only the initial vote from Nostr data
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(initialVote)
  const [voteCount, setVoteCount] = useState<number>(initialVotes)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentUser = useSelector((state: RootState) => state.auth.currentUser)
  
  // Debug log
  useEffect(() => {
    console.log(`VoteButton for ${contentId}: vote=${currentVote}, count=${voteCount}, initial vote=${initialVote}`)
  }, [contentId, currentVote, voteCount, initialVote])
  
  // Make sure we update if initialVote changes
  useEffect(() => {
    console.log(`Initial vote changed for ${contentId}: ${initialVote}`)
    // Always set the current vote to the initial vote, even if it's null
    setCurrentVote(initialVote)
    
    // Log the current user to help debug
    console.log(`Current user: ${currentUser?.publicKey?.substring(0, 8) || 'none'}`)
  }, [contentId, initialVote, currentUser])
  
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
    if (!currentUser) {
      console.log('Cannot vote: No current user')
      return
    }
    
    // If already voted the same way, remove the vote
    const newVote = currentVote === vote ? null : vote
    console.log(`Voting on ${contentId}: ${currentVote} -> ${newVote}`)
    
    setIsSubmitting(true)
    
    try {
      // Create vote event
      console.log(`Creating vote event for ${contentId}: ${newVote === 'up' ? '+' : newVote === 'down' ? '-' : ''}`)
      const event = await eventManager.createEvent(
        7, // kind 7 = reaction
        newVote === 'up' ? '+' : newVote === 'down' ? '-' : '',
        [['e', contentId]] // Reference to the content being voted on
      )
      
      // Sign and publish
      console.log(`Signing and publishing vote event for ${contentId}`)
      const result = await eventManager.signAndPublishEvent(event)
      console.log(`Vote event result:`, result)
      
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
    <div className="flex items-center space-x-2">
      <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-full overflow-hidden h-8 px-2">
        <button
          type="button"
          onClick={() => handleVote('up')}
          disabled={isSubmitting || !currentUser}
          className={`flex items-center justify-center ${sizeClasses[size].button} ${
            currentVote === 'up'
              ? 'text-bottle-green dark:text-bottle-green'
              : 'text-gray-500 hover:text-bottle-green dark:text-gray-400 dark:hover:text-bottle-green'
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
        
        <span className={`${sizeClasses[size].text} font-medium px-2 ${
          currentVote === 'up'
            ? 'text-bottle-green'
            : currentVote === 'down'
              ? 'text-red-500'
              : 'text-gray-600 dark:text-gray-400'
        }`}>
          {voteCount}
        </span>
        
        <button
          type="button"
          onClick={() => handleVote('down')}
          disabled={isSubmitting || !currentUser}
          className={`flex items-center justify-center ${sizeClasses[size].button} ${
            currentVote === 'down'
              ? 'text-red-500 dark:text-red-500'
              : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500'
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
    </div>
  )
}