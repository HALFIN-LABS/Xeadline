'use client'

import React, { useState, useEffect } from 'react'
import { Comment, CommentItem } from './CommentItem'
import { CommentForm } from './CommentForm'
import { Icon } from '../ui/Icon'

interface CommentListProps {
  postId: string
  darkMode?: boolean
}

export const CommentList: React.FC<CommentListProps> = ({ 
  postId,
  darkMode = false
}) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'oldest' | 'controversial'>('popular')
  
  // Fetch comments for the post
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // This would be replaced with an actual API call
        // For now, we'll use mock data
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
        
        const mockComments: Comment[] = [
          {
            id: '1',
            pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
            content: {
              text: 'This is a great post! I really enjoyed reading it.'
            },
            createdAt: Date.now() / 1000 - 3600, // 1 hour ago
            likes: 5,
            userVote: 'up'
          },
          {
            id: '2',
            pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
            content: {
              text: 'I disagree with some points, but overall it was informative.'
            },
            createdAt: Date.now() / 1000 - 7200, // 2 hours ago
            likes: 2,
            userVote: null
          },
          {
            id: '3',
            pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
            content: {
              text: 'Has anyone tried implementing this approach in a real-world scenario?'
            },
            createdAt: Date.now() / 1000 - 10800, // 3 hours ago
            likes: 3,
            userVote: null,
            replyTo: '1'
          }
        ]
        
        // Sort comments based on the selected sort option
        const sortedComments = sortComments(mockComments, sortBy)
        setComments(sortedComments)
      } catch (error) {
        console.error('Error fetching comments:', error)
        setError('Failed to load comments. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchComments()
  }, [postId, sortBy])
  
  // Sort comments based on the selected option
  const sortComments = (commentsToSort: Comment[], sortOption: string) => {
    const commentsCopy = [...commentsToSort]
    
    switch (sortOption) {
      case 'popular':
        return commentsCopy.sort((a, b) => b.likes - a.likes)
      case 'newest':
        return commentsCopy.sort((a, b) => b.createdAt - a.createdAt)
      case 'oldest':
        return commentsCopy.sort((a, b) => a.createdAt - b.createdAt)
      case 'controversial':
        // This would require additional data like downvotes
        // For now, just return the comments as is
        return commentsCopy
      default:
        return commentsCopy
    }
  }
  
  // Organize comments into a tree structure
  const organizeComments = (flatComments: Comment[]) => {
    const topLevelComments: Comment[] = []
    const commentReplies: Record<string, Comment[]> = {}
    
    // First pass: identify all top-level comments and create empty arrays for replies
    flatComments.forEach(comment => {
      if (!comment.replyTo) {
        topLevelComments.push(comment)
      } else {
        if (!commentReplies[comment.replyTo]) {
          commentReplies[comment.replyTo] = []
        }
        commentReplies[comment.replyTo].push(comment)
      }
    })
    
    return { topLevelComments, commentReplies }
  }
  
  // Handle comment creation
  const handleCommentCreated = () => {
    // Refetch comments
    // This would be replaced with an actual API call
    console.log('Comment created, refetching comments...')
  }
  
  // Get organized comments
  const { topLevelComments, commentReplies } = organizeComments(comments)
  
  return (
    <div className={`comments-section mt-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Comments ({comments.length})</h3>
        
        <div className="flex items-center">
          <label htmlFor="comment-sort" className={`mr-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Sort by:
          </label>
          <select
            id="comment-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`text-sm rounded-md border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-700'
            } py-1 px-2`}
          >
            <option value="popular">Most Liked</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="controversial">Controversial</option>
          </select>
        </div>
      </div>
      
      {/* Comment form */}
      <div className="mb-6">
        <CommentForm 
          postId={postId} 
          onCommentCreated={handleCommentCreated}
          darkMode={darkMode}
        />
      </div>
      
      {/* Comments list */}
      {isLoading ? (
        <div className={`flex justify-center items-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading comments...</span>
        </div>
      ) : error ? (
        <div className={`text-center py-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className={`mt-2 text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
          >
            Try again
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Icon name="message-circle" size={32} className="mx-auto mb-2 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              replies={commentReplies[comment.id] || []}
              onReplyCreated={handleCommentCreated}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}