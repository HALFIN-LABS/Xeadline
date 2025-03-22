'use client'

import React, { useState } from 'react'
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache'
import { MarkdownContent } from '../common/MarkdownContent'
import { CommentForm } from './CommentForm'
import { VoteButton } from './VoteButton'
import { Icon } from '../ui/Icon'

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
  onReplyCreated?: () => void
  darkMode?: boolean
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  depth = 0,
  maxDepth = 5,
  replies = [],
  onReplyCreated,
  darkMode = false
}) => {
  const { username } = useUserProfileWithCache(comment.pubkey)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(depth < 2) // Auto-expand first two levels
  
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
  
  // Determine if we should show "View more replies" button
  const hasMoreReplies = depth >= maxDepth && replies.length > 0
  
  return (
    <div 
      className={`comment-item ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} 
      style={{ marginLeft }}
    >
      <div className={`p-3 rounded-lg mb-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        {/* Comment header */}
        <div className="flex items-center mb-2">
          {/* User avatar placeholder */}
          <div className="w-8 h-8 rounded-full bg-bottle-green text-white flex items-center justify-center mr-2">
            {comment.pubkey.charAt(0)}
          </div>
          
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
      
      {/* Replies */}
      {replies.length > 0 && depth < maxDepth && (
        <div className="ml-8">
          {showReplies ? (
            <>
              {replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  onReplyCreated={onReplyCreated}
                  darkMode={darkMode}
                />
              ))}
            </>
          ) : (
            <button
              onClick={() => setShowReplies(true)}
              className={`flex items-center space-x-1 py-1 px-2 text-sm ${
                darkMode 
                  ? 'text-blue-400 hover:text-blue-300' 
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <Icon name="message-circle" size={14} />
              <span>Show {replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
            </button>
          )}
        </div>
      )}
      
      {/* "View more replies" button for deeply nested comments */}
      {hasMoreReplies && (
        <div className="ml-8 mt-1">
          <button
            className={`flex items-center space-x-1 py-1 px-2 text-sm ${
              darkMode 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <Icon name="message-circle" size={14} />
            <span>View more replies</span>
          </button>
        </div>
      )}
    </div>
  )
}