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
  darkMode: propDarkMode = false
}) => {
  // Use the HTML class for dark mode detection, falling back to the prop
  const darkMode = typeof window !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : propDarkMode;
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
        // Fetch comments from the API with a timestamp to prevent caching
        const timestamp = Date.now();
        const response = await fetch(`/api/posts/${postId}/comments?sort=${sortBy}&_=${timestamp}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch comments: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.comments?.length || 0} comments for post ${postId}`);
        if (data.comments?.length > 0) {
          console.log('First comment:', JSON.stringify(data.comments[0]));
        }
        setComments(data.comments || []);
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
    
    console.log('Organizing comments:', flatComments.length);
    
    // First pass: identify all top-level comments and create empty arrays for replies
    flatComments.forEach(comment => {
      console.log(`Comment ${comment.id} replyTo: ${comment.replyTo || 'none'}`);
      
      if (!comment.replyTo) {
        console.log(`Adding ${comment.id} as top-level comment`);
        topLevelComments.push(comment)
      } else {
        if (!commentReplies[comment.replyTo]) {
          commentReplies[comment.replyTo] = []
        }
        console.log(`Adding ${comment.id} as reply to ${comment.replyTo}`);
        commentReplies[comment.replyTo].push(comment)
      }
    })
    
    console.log('Top-level comments:', topLevelComments.length);
    console.log('Comment replies:', Object.keys(commentReplies).length);
    
    return { topLevelComments, commentReplies }
  }
  
  // Handle comment creation
  const handleCommentCreated = () => {
    // Add a small delay to allow the relays to propagate the new comment
    console.log('Comment created, waiting 2 seconds before refetching...');
    
    // Refetch comments when a new comment is created
    const fetchComments = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Wait for 2 seconds to give relays time to propagate the new comment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch comments from the API with a timestamp to prevent caching
        const timestamp = Date.now();
        const response = await fetch(`/api/posts/${postId}/comments?sort=${sortBy}&_=${timestamp}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch comments: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Refetched ${data.comments?.length || 0} comments for post ${postId} after comment creation`);
        
        // Log all comments for debugging
        if (data.comments?.length > 0) {
          console.log('All comments after creation:');
          data.comments.forEach((comment: any, index: number) => {
            console.log(`Comment ${index + 1}:`, JSON.stringify({
              id: comment.id,
              replyTo: comment.replyTo || 'none',
              content: comment.content
            }));
          });
        }
        
        setComments(data.comments || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError('Failed to load comments. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComments();
  }
  
  // Get organized comments
  const { topLevelComments, commentReplies } = organizeComments(comments)
  
  // Debug the comment structure
  console.log('Comment structure:');
  topLevelComments.forEach(comment => {
    console.log(`Top-level comment: ${comment.id}`);
    
    const replies = commentReplies[comment.id] || [];
    if (replies.length > 0) {
      console.log(`  Has ${replies.length} direct replies:`);
      replies.forEach(reply => {
        console.log(`  - Reply: ${reply.id}`);
        
        const nestedReplies = commentReplies[reply.id] || [];
        if (nestedReplies.length > 0) {
          console.log(`    Has ${nestedReplies.length} nested replies:`);
          nestedReplies.forEach(nestedReply => {
            console.log(`    - Nested reply: ${nestedReply.id}`);
          });
        }
      });
    }
  });
  
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
                ? 'bg-black border-gray-600 text-white'
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
              commentReplies={commentReplies}
              onReplyCreated={handleCommentCreated}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}