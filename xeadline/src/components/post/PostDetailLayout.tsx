'use client'

import React from 'react'
import Link from 'next/link'
import { Post } from '../../redux/slices/postSlice'
import { Topic } from '../../redux/slices/topicSlice'
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache'
import { MarkdownContent } from '../common/MarkdownContent'
import { CommentList } from '../comments/CommentList'
import { VoteButton } from '../comments/VoteButton'
import { TopicSidebar } from '../topic/TopicSidebar'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

interface PostDetailLayoutProps {
  post: Post
  topic: Topic
  isSubscribed?: boolean
  onSubscribe?: () => void
  onUnsubscribe?: () => void
  isSubscribing?: boolean
}

export const PostDetailLayout: React.FC<PostDetailLayoutProps> = ({
  post,
  topic,
  isSubscribed = false,
  onSubscribe,
  onUnsubscribe,
  isSubscribing = false
}) => {
  // Fetch the user profile for the post author
  const { username } = useUserProfileWithCache(post.pubkey)
  
  // Determine the post type
  const hasMedia = post.content.type === 'media' && post.content.media && post.content.media.length > 0
  const isTextPost = post.content.type === 'text' || (post.content.type === 'media' && !hasMedia)
  const isLinkPost = post.content.type === 'link'
  
  // Determine if dark mode is enabled by checking the HTML element class
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  
  return (
    <div className="post-detail-container max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content area */}
        <div className="flex-1">
          {/* Post content with voting - styled minimalist black like other pages */}
          <div className="bg-black rounded-lg overflow-hidden mb-4">
            {/* Post header with topic, username, and date */}
            <div className="p-4">
              <div className="flex items-center text-sm text-gray-300 mb-2">
                <Link href={`/topic/${topic.id}`} className="font-medium text-green-500 hover:underline mr-1">
                  t/{topic.name}
                </Link>
                <span className="mx-1">•</span>
                <div className="flex items-center">
                  <Avatar
                    src={undefined}
                    alt={username || 'User'}
                    size="xs"
                    pubkey={post.pubkey}
                    className="mr-1"
                  />
                  <Link href={`/profile/${post.pubkey}`} className="text-blue-400 hover:underline">
                    {username}
                  </Link>
                </div>
                <span className="mx-1">•</span>
                <span>{new Date(post.createdAt * 1000).toLocaleString()}</span>
              </div>
              
              <h1 className="text-2xl font-bold mb-4 text-white">{post.content.title}</h1>
              
              {/* Media content (if any) */}
              {hasMedia && post.content.media && post.content.media.length > 0 && (
                <div className="relative h-96 bg-black mb-4 rounded-lg overflow-hidden">
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
                      className="w-full h-full object-contain"
                    />
                  )}
                  {post.content.media.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-md">
                      +{post.content.media.length - 1}
                    </div>
                  )}
                </div>
              )}
              
              {/* Link content */}
              {isLinkPost && post.content.url && (
                <div className="mb-4">
                  <a
                    href={post.content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-lg"
                  >
                    {post.content.url}
                  </a>
                </div>
              )}
              
              {/* Post content - in detail view, we make links clickable */}
              {isTextPost && post.content.text && (
                <div className="mb-4">
                  <MarkdownContent
                    content={post.content.text}
                    makeLinksClickable={true} // In detail view, links are clickable
                    className="text-gray-200 leading-relaxed"
                  />
                </div>
              )}
            </div>
            
            {/* Post action bar */}
            <div className="border-t border-gray-700 px-4 py-2 flex items-center space-x-4">
              <button
                className="flex items-center text-gray-300 hover:bg-gray-900 px-2 py-1 rounded-full transition-colors"
                onClick={() => {
                  // Scroll to comment section
                  document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' });
                  // Focus on comment input if available
                  const commentInput = document.querySelector('.comment-input textarea');
                  if (commentInput instanceof HTMLElement) {
                    setTimeout(() => commentInput.focus(), 500);
                  }
                }}
              >
                <Icon name="message-circle" className="mr-1" />
                <span>{post.comments || 0} Comments</span>
              </button>
              
              <button className="flex items-center space-x-1 text-gray-300 px-2 py-1 rounded-full hover:bg-gray-900 hover:text-yellow-500 transition-colors">
                <Icon name="zap" className="mr-1" />
                <span>Zap</span>
              </button>
              
              <button className="flex items-center space-x-1 text-gray-300 px-2 py-1 rounded-full hover:bg-gray-900 transition-colors">
                <Icon name="share" className="mr-1" />
                <span>Share</span>
              </button>
            </div>
          </div>
          
          {/* Comment section */}
          <div id="comment-section" className="mt-6">
            <CommentList
              postId={post.id}
              darkMode={true}
            />
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:w-80 space-y-4">
          <TopicSidebar
            topic={topic}
            isSubscribed={isSubscribed}
            onSubscribe={onSubscribe}
            onUnsubscribe={onUnsubscribe}
            isSubscribing={isSubscribing}
          />
        </div>
      </div>
    </div>
  )
}