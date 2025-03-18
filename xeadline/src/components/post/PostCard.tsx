'use client'

import React from 'react'
import Link from 'next/link'
import { Post } from '../../redux/slices/postSlice'
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache'

interface PostCardProps {
  post: Post;
  topicName?: string;
}

export const PostCard: React.FC<PostCardProps> = ({ post, topicName }) => {
  // Fetch the user profile for the post author with our improved hook
  const { username } = useUserProfileWithCache(post.pubkey);
  // Determine the post type
  const hasMedia = post.content.type === 'media' && post.content.media && post.content.media.length > 0
  const isTextPost = post.content.type === 'text' || (post.content.type === 'media' && !hasMedia)
  const isLinkPost = post.content.type === 'link'
  
  return (
    <div className="rounded-xl hover:bg-gray-50 hover:shadow-md dark:hover:bg-gray-800/80 overflow-hidden flex flex-col transition-all">
      {/* Post header */}
      <div className="p-3 pb-2">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
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
        <h2 className="text-lg font-semibold mb-1">
          <Link href={`/post/${post.id}`} className="hover:underline">
            {post.content.title}
          </Link>
        </h2>
      </div>
      
      {/* Media content (if any) */}
      {hasMedia && post.content.media && post.content.media.length > 0 && (
        <div className="relative h-64 bg-gray-100 dark:bg-gray-700">
          {post.content.media.map((url, index) => (
            <div key={index} className="absolute inset-0 flex items-center justify-center">
              <img 
                src={url} 
                alt={`Media ${index + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Link content */}
      {isLinkPost && post.content.url && (
        <div className="px-3 pb-2">
          <a 
            href={post.content.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {post.content.url}
          </a>
        </div>
      )}
      
      {/* Post content preview - only show for text posts */}
      {isTextPost && post.content.text && (
        <div className="px-3 pb-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {post.content.text}
          </p>
        </div>
      )}
      
      {/* Post actions */}
      <div className="px-3 py-2 flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-xs">
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 hover:text-bottle-green dark:hover:bg-gray-600 dark:hover:text-bottle-green transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="font-medium">{post.likes || 0}</span>
          </button>
          
          <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-600 dark:hover:text-red-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="font-medium">0</span>
          </button>
        </div>
        
        <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.comments || 0} comments</span>
        </button>
        
        <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 hover:text-yellow-500 dark:hover:bg-gray-600 dark:hover:text-yellow-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Zap</span>
        </button>
        
        <button className="flex items-center space-x-1 btn-transparent px-2 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  )
}