'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { Post } from '../../redux/slices/postSlice'
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache'
import { MarkdownContent } from '../common/MarkdownContent'
import { LinkPreview } from '../common/LinkPreview'
import { extractFirstUrl } from '../../utils/markdownUtils'
import { EmbeddedContent } from '../editor/EmbeddedContent'
import { VoteButton } from '../comments/VoteButton'

interface PostCardProps {
  post: Post;
  topicName?: string;
}

export const PostCard: React.FC<PostCardProps> = ({ post, topicName }) => {
  // Fetch the user profile for the post author with our improved hook
  const { username } = useUserProfileWithCache(post.pubkey);
  
  // Determine the post type
  const hasMedia = post.content.type === 'media' && post.content.media && post.content.media.length > 0
  const isTextPost = post.content.type === 'text'
  const isLinkPost = post.content.type === 'link'
  
  // Extract the first URL from the post content for link preview
  const firstUrl = useMemo(() => {
    if (isLinkPost && post.content.url) {
      return post.content.url;
    }
    
    if ((isTextPost || post.content.type === 'media') && post.content.text) {
      return extractFirstUrl(post.content.text);
    }
    
    return null;
  }, [isLinkPost, isTextPost, post.content, post.content.type]);
  
  return (
    <div className="rounded-xl hover:bg-gray-50 hover:shadow-md dark:hover:bg-gray-800/80 overflow-hidden flex flex-col md:flex-row transition-all">
      {/* Main content area */}
      <div className="flex flex-col md:flex-grow justify-between">
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
        
        {/* Media content - displayed below the title for media posts */}
        {hasMedia && post.content.media && post.content.media.length > 0 && (
          <div className="px-3 pb-2">
            <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-md">
              {/* Determine if the media is a video or an image based on URL or mediaTypes */}
              {(post.content.mediaTypes?.[0] === 'video' ||
                (post.content.media && post.content.media[0]?.match(/\.(mp4|mov|webm|avi)($|\?)/i))) ? (
                <video
                  src={post.content.media?.[0]}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                  poster={post.content.thumbnails?.[0] || ''}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={post.content.media?.[0]} // Show the first media item
                  alt="Media content"
                  className="w-full h-full object-cover"
                />
              )}
              {post.content.media.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-md">
                  +{post.content.media.length - 1}
                </div>
              )}
            </div>
            
            {/* Caption for media posts */}
            {post.content.text && (
              <div className="mt-2">
                <MarkdownContent
                  content={post.content.text}
                  makeLinksClickable={false}
                  className="text-sm text-gray-700 dark:text-gray-300"
                />
              </div>
            )}
          </div>
        )}
        
        {/* Link content with preview below */}
        {isLinkPost && post.content.url && (
          <div className="px-3 pb-2 flex-grow">
            <a
              href={post.content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline line-clamp-2"
            >
              {post.content.url}
            </a>
            
            {/* Link preview */}
            <div className="mt-3">
              {post.content.linkPreview ? (
                <div className="link-preview-container">
                  <EmbeddedContent
                    content={post.content.linkPreview}
                    className="link-post-preview"
                  />
                </div>
              ) : (
                <div className="link-preview-container">
                  <LinkPreview
                    url={post.content.url}
                    className="link-post-preview"
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Post content preview - only show for text posts */}
        {isTextPost && post.content.text && (
          <div className="px-3 pb-2 flex-grow">
            <MarkdownContent
              content={post.content.text}
              makeLinksClickable={false} // In card view, links are not clickable
              className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2"
            />
          </div>
        )}
        
        {/* Post actions */}
        <div className="px-3 py-2 flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-xs">
          <VoteButton
            contentId={post.id}
            contentType="post"
            initialVotes={post.likes || 0}
            initialVote={post.userVote}
            size="sm"
            darkMode={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches}
          />
          
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
      
      {/* Link preview for text posts with links */}
      {firstUrl && !isLinkPost && !hasMedia && (
        <div className="md:w-[160px] md:min-w-[160px] md:max-w-[160px] p-2 md:self-end">
          <LinkPreview url={firstUrl} className="h-full" />
        </div>
      )}
    </div>
  )
}