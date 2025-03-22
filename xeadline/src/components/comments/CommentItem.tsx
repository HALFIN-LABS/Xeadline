'use client'

import React, { useState } from 'react'
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache'
import { MarkdownContent } from '../common/MarkdownContent'
import { CommentForm } from './CommentForm'
import { VoteButton } from '../comments/VoteButton'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'

export interface Comment {
  id: string
  pubkey: string
  content: {
    text?: string
    media?: string[]
    mediaTypes?: ('image' | 'video' | 'gif')[]
    thumbnails?: string[]
  }
  createdAt: number
  replyTo?: string
  likes: number
  userVote?: 'up' | 'down' | null
}

interface CommentItemProps {
  comment: Comment
  postId: string
  depth?: number
  maxDepth?: number
  replies?: Comment[]
  commentReplies?: Record<string, Comment[]>
  onReplyCreated?: () => void
  darkMode?: boolean
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  depth = 0,
  maxDepth = 20, // Increase max depth to allow for deeper nesting
  replies = [],
  commentReplies = {},
  onReplyCreated,
  darkMode: propDarkMode = false
}) => {
  // Use the HTML class for dark mode detection, falling back to the prop
  const darkMode = typeof window !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : propDarkMode;
  const { username, profile } = useUserProfileWithCache(comment.pubkey)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(true) // Always show replies by default
  
  // Format timestamp
  const formattedDate = new Date(comment.createdAt * 1000).toLocaleString()
  
  // Handle vote change
  const handleVoteChange = (newVote: 'up' | 'down' | null, voteCount: number) => {
    // This would typically update the comment in the store
    console.log(`Vote changed to ${newVote}, new count: ${voteCount}`)
  }
  
  // Handle reply creation
  const handleReplyCreated = () => {
    setShowReplyForm(false)
    if (onReplyCreated) {
      onReplyCreated()
    }
  }
  
  // Calculate left margin for nested comments
  const marginLeft = depth > 0 ? `${Math.min(depth * 16, 64)}px` : '0'
  
  // We'll always show replies, but we'll log nesting information for debugging
  if (replies.length > 0) {
    console.log(`Comment ${comment.id} has ${replies.length} replies at depth ${depth}`);
  }
  
  return (
    <div 
      className={`comment-item ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} 
      style={{ marginLeft }}
    >
      <div className={`p-3 rounded-lg mb-2 ${darkMode ? 'bg-black' : 'bg-white'} shadow-sm`}>
        {/* Comment header */}
        <div className="flex items-center mb-2">
          {/* User avatar */}
          <Avatar
            src={profile?.picture}
            alt={username || comment.pubkey.substring(0, 8)}
            size="sm"
            className="mr-2"
            pubkey={comment.pubkey}
          />
          
          <div className="flex items-center text-xs">
            <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {username}
            </span>
            <span className={`mx-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>•</span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              {formattedDate}
            </span>
          </div>
        </div>
        
        {/* Comment content */}
        <div className="mb-3">
          {comment.content.text && (
            <MarkdownContent
              content={comment.content.text}
              makeLinksClickable={true}
              className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}
            />
          )}
          
          {/* Media content */}
          {comment.content.media && comment.content.media.length > 0 && (
            <div className="mt-2 grid grid-cols-1 gap-2">
              {comment.content.media.map((url, index) => {
                const isVideo = 
                  (comment.content.mediaTypes && comment.content.mediaTypes[index] === 'video') ||
                  url.match(/\.(mp4|mov|webm|avi)($|\?)/i);
                
                return (
                  <div key={`media-${index}`} className="relative">
                    {isVideo ? (
                      <video
                        src={url}
                        controls
                        preload="metadata"
                        playsInline
                        className="max-w-full h-auto rounded-md"
                        poster={comment.content.thumbnails?.[index] || ''}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={url}
                        alt={`Media content ${index + 1}`}
                        className="max-w-full h-auto rounded-md"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Comment actions */}
        <div className="flex items-center space-x-4 text-xs">
          {/* Vote buttons */}
          <VoteButton
            contentId={comment.id}
            contentType="comment"
            initialVotes={comment.likes}
            initialVote={comment.userVote}
            onVoteChange={handleVoteChange}
            size="sm"
            darkMode={darkMode}
          />
          
          {/* Reply button */}
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className={`flex items-center space-x-1 ${
              darkMode 
                ? 'text-gray-400 hover:text-gray-200' 
                : 'text-gray-600 hover:text-gray-900'
            } transition-colors`}
          >
            <Icon name="message-circle" size={14} />
            <span>Reply</span>
          </button>
          
          {/* Zap button */}
          <button
            className={`flex items-center space-x-1 ${
              darkMode 
                ? 'text-gray-400 hover:text-yellow-400' 
                : 'text-gray-600 hover:text-yellow-500'
            } transition-colors`}
          >
            <Icon name="zap" size={14} />
            <span>Zap</span>
          </button>
        </div>
      </div>
      
      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-8 mb-3">
          <CommentForm
            postId={postId}
            parentCommentId={comment.id}
            onCommentCreated={handleReplyCreated}
            darkMode={darkMode}
          />
        </div>
      )}
      
      {/* Replies - always show them regardless of depth */}
      {replies.length > 0 && (
        <div className="ml-8">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              maxDepth={maxDepth}
              replies={commentReplies[reply.id] || []}
              commentReplies={commentReplies}
              onReplyCreated={onReplyCreated}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
      
      {/* We always show all replies now, no need for a "View more replies" button */}
    </div>
  )
}