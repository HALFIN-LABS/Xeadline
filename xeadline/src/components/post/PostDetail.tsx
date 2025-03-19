'use client'

import React from 'react'
import Link from 'next/link'
import { Post } from '../../redux/slices/postSlice'
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache'
import { MarkdownContent } from '../common/MarkdownContent'

interface PostDetailProps {
  post: Post
  topicName?: string
}

/**
 * Component for displaying a post in detail view (expanded)
 * This is a basic implementation that will be enhanced later
 */
export const PostDetail: React.FC<PostDetailProps> = ({ post, topicName }) => {
  // Fetch the user profile for the post author
  const { username } = useUserProfileWithCache(post.pubkey)
  
  // Determine the post type
  const hasMedia = post.content.type === 'media' && post.content.media && post.content.media.length > 0
  const isTextPost = post.content.type === 'text' || (post.content.type === 'media' && !hasMedia)
  const isLinkPost = post.content.type === 'link'
  
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 shadow-md overflow-hidden flex flex-col">
      {/* Post header */}
      <div className="p-4 pb-3">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link href={`/topic/${post.topicId}`} className="font-medium text-bottle-green hover:underline mr-1">
            t/{topicName || post.topicId.split(':')[1] || post.topicId}
          </Link>
          <span className="mx-1">•</span>
          <Link href={`/profile/${post.pubkey}`} className="text-blue-600 dark:text-blue-400 hover:underline mx-1">
            {username}
          </Link>
          <span className="mx-1">•</span>
          <span>{new Date(post.createdAt * 1000).toLocaleString()}</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {post.content.title}
        </h1>
      </div>
      
      {/* Media content (if any) */}
      {hasMedia && post.content.media && post.content.media.length > 0 && (
        <div className="relative h-96 bg-gray-100 dark:bg-gray-700">
          {post.content.media.map((url, index) => (
            <div key={index} className="absolute inset-0 flex items-center justify-center">
              <img 
                src={url} 
                alt={`Media ${index + 1}`} 
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Link content */}
      {isLinkPost && post.content.url && (
        <div className="px-4 py-2">
          <a 
            href={post.content.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline text-lg"
          >
            {post.content.url}
          </a>
        </div>
      )}
      
      {/* Post content - in detail view, we make links clickable */}
      {isTextPost && post.content.text && (
        <div className="px-4 py-3">
          <MarkdownContent 
            content={post.content.text}
            makeLinksClickable={true} // In detail view, links are clickable
            className="text-gray-800 dark:text-gray-200 leading-relaxed"
          />
        </div>
      )}
      
      {/* Post actions */}
      <div className="px-4 py-3 flex items-center space-x-3 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 hover:text-bottle-green dark:hover:bg-gray-600 dark:hover:text-bottle-green transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="font-medium">{post.likes || 0}</span>
          </button>
          
          <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-600 dark:hover:text-red-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="font-medium">0</span>
          </button>
        </div>
        
        <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.comments || 0} comments</span>
        </button>
        
        <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 hover:text-yellow-500 dark:hover:bg-gray-600 dark:hover:text-yellow-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Zap</span>
        </button>
        
        <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>
      </div>
      
      {/* Comments section placeholder */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Comments</h3>
        <div className="text-gray-500 dark:text-gray-400 text-center py-8">
          Comments will be implemented in a future update
        </div>
      </div>
    </div>
  )
}