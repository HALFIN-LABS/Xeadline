'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '../../redux/hooks';
import { Community, selectIsSubscribed } from '../../redux/slices/communitySlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';

interface CommunityCardProps {
  community: Community;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}

export default function CommunityCard({ community, onSubscribe, onUnsubscribe }: CommunityCardProps) {
  const currentUser = useAppSelector(selectCurrentUser);
  const isSubscribed = useAppSelector(state => selectIsSubscribed(state, community.id));
  
  const {
    id,
    name,
    description,
    image,
    memberCount,
    moderationSettings
  } = community;
  
  // Generate a placeholder image if none is provided
  const imageUrl = image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  
  // Format the community URL
  const communityUrl = `/community/${id}`;
  
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-32 bg-gray-200 dark:bg-gray-700">
        {image && (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-3 flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 overflow-hidden border-2 border-white">
            <Image
              src={imageUrl}
              alt={name}
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
          <div>
            <h3 className="text-white font-bold truncate">{name}</h3>
            <p className="text-white/80 text-xs">{formattedMemberCount} members</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3">
          {description}
        </p>
        
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
            {getModerationLabel()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <Link 
            href={communityUrl}
            className="text-bottle-green hover:text-bottle-green-700 font-medium text-sm"
          >
            View Community
          </Link>
          
          {currentUser && (
            <button
              onClick={isSubscribed ? onUnsubscribe : onSubscribe}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                isSubscribed
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'bg-bottle-green text-white hover:bg-bottle-green-700'
              }`}
            >
              {isSubscribed ? 'Joined' : 'Join'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}