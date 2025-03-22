'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Topic } from '../../redux/slices/topicSlice'
import { Button } from '../ui/Button'
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache'
import { getSafeImageUrl, createImageErrorHandler } from '../../utils/imageUtils'

interface ModeratorItemProps {
  pubkey: string
}

const ModeratorItem: React.FC<ModeratorItemProps> = ({ pubkey }) => {
  const { username } = useUserProfileWithCache(pubkey)
  
  return (
    <div className="flex items-center p-2 bg-gray-100 dark:bg-gray-800/30 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <Link
        href={`/profile/${pubkey}`}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {username}
      </Link>
    </div>
  )
}

interface TopicSidebarProps {
  topic: Topic
  isSubscribed?: boolean
  onSubscribe?: () => void
  onUnsubscribe?: () => void
  isSubscribing?: boolean
}

export const TopicSidebar: React.FC<TopicSidebarProps> = ({
  topic,
  isSubscribed = false,
  onSubscribe,
  onUnsubscribe,
  isSubscribing = false
}) => {
  // Format member count
  const formattedMemberCount = topic.memberCount ? 
    topic.memberCount > 1000 ? `${(topic.memberCount / 1000).toFixed(1)}k` : topic.memberCount.toString() 
    : '0'
  
  return (
    <>
      {/* Topic information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">About t/{topic.name}</h3>
        
        <div className="mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mx-auto mb-2">
            <Image
              src={getSafeImageUrl(topic.image, topic.id)}
              alt={`${topic.name} image`}
              width={64}
              height={64}
              className="object-cover"
              onError={createImageErrorHandler(topic.id)}
            />
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {topic.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div>
            <div className="font-medium">{formattedMemberCount}</div>
            <div>Members</div>
          </div>
          
          <div>
            <div className="font-medium">{new Date(topic.createdAt * 1000).toLocaleDateString()}</div>
            <div>Created</div>
          </div>
        </div>
        
        {onSubscribe && onUnsubscribe && (
          <Button
            variant="primary"
            className="w-full"
            onClick={isSubscribed ? onUnsubscribe : onSubscribe}
            isLoading={isSubscribing}
          >
            {isSubscribed ? 'Leave' : 'Join'}
          </Button>
        )}
      </div>
      
      {/* Moderators */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">Moderators</h3>
        
        {topic.moderators && topic.moderators.length > 0 ? (
          <div className="space-y-2">
            {topic.moderators.map((mod, index) => (
              <ModeratorItem key={index} pubkey={mod} />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">No moderators assigned to this topic.</p>
        )}
      </div>
      
      {/* Topic rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">t/{topic.name} Rules</h3>
        
        {topic.rules && topic.rules.length > 0 ? (
          <ol className="list-decimal list-inside space-y-2">
            {topic.rules.map((rule, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium">{rule}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="p-4 bg-gray-100 dark:bg-gray-800/30 rounded-lg text-gray-500 dark:text-gray-400 italic">
            No specific rules have been set for this topic. Please follow general community guidelines and be respectful to others.
          </div>
        )}
      </div>
    </>
  )
}