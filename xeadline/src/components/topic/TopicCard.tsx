'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '../../redux/hooks';
import { Topic, selectIsSubscribed } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';

interface TopicCardProps {
  topic: Topic;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}

export default function TopicCard({ topic, onSubscribe, onUnsubscribe }: TopicCardProps) {
  const currentUser = useAppSelector(selectCurrentUser);
  const isSubscribed = useAppSelector(state => selectIsSubscribed(state, topic.id));
  
  const {
    id,
    name,
    slug,
    description,
    image,
    memberCount,
    moderationSettings
  } = topic;
  
  // Generate a placeholder image if none is provided
  const imageUrl = image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  
  // Format the topic URL
  const topicUrl = `/t/${slug}`;
  
  // Format member count
  const formattedMemberCount = memberCount ? 
    memberCount > 1000 ? `${(memberCount / 1000).toFixed(1)}k` : memberCount.toString() 
    : '0';
  
  // Get moderation type label
  const getModerationLabel = () => {
    switch (moderationSettings.moderationType) {
      case 'pre-approval':
        return 'Pre-approval moderation';
      case 'post-publication':
        return 'Post-publication moderation';
      case 'hybrid':
        return 'Hybrid moderation';
      default:
        return 'Standard moderation';
    }
  };
  
  return (
    <div className="rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 overflow-hidden flex-shrink-0">
          <Image
            src={imageUrl}
            alt={name}
            width={40}
            height={40}
            className="object-cover"
          />
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formattedMemberCount} members</p>
        </div>
        {currentUser && (
          <button
            onClick={isSubscribed ? onUnsubscribe : onSubscribe}
            className={`px-4 py-1 rounded-full text-sm font-medium ${
              isSubscribed
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-bottle-green text-white hover:bg-bottle-green-700'
            }`}
          >
            {isSubscribed ? 'Joined' : 'Join'}
          </button>
        )}
      </div>
      <Link href={topicUrl} className="block mt-2">
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {description}
        </p>
      </Link>
    </div>
  );
}