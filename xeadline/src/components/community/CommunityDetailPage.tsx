'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchCommunity,
  selectCurrentCommunity,
  selectCommunityLoading,
  selectCommunityError,
  subscribeToCommunity,
  unsubscribeFromCommunity,
  selectIsSubscribed
} from '../../redux/slices/communitySlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import Image from 'next/image';
import Link from 'next/link';

interface CommunityDetailPageProps {
  communityId: string;
}

export default function CommunityDetailPage({ communityId }: CommunityDetailPageProps) {
  const dispatch = useAppDispatch();
  const community = useAppSelector(selectCurrentCommunity);
  const isLoading = useAppSelector(selectCommunityLoading);
  const error = useAppSelector(selectCommunityError);
  const currentUser = useAppSelector(selectCurrentUser);
  const isSubscribed = useAppSelector(state => selectIsSubscribed(state, communityId));
  
  useEffect(() => {
    dispatch(fetchCommunity(communityId));
  }, [dispatch, communityId]);
  
  const handleSubscribe = () => {
    if (currentUser) {
      dispatch(subscribeToCommunity({
        communityId,
        privateKey: currentUser.privateKey
      }));
    }
  };
  
  const handleUnsubscribe = () => {
    if (currentUser) {
      dispatch(unsubscribeFromCommunity({
        communityId,
        privateKey: currentUser.privateKey
      }));
    }
  };
  
  if (isLoading && !community) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }
  
  if (!community) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 my-4 text-center">
        <p className="text-gray-700 dark:text-gray-300">Community not found.</p>
        <Link href="/community/discover" className="mt-4 inline-block px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors">
          Discover Communities
        </Link>
      </div>
    );
  }
  
  // Generate a placeholder image if none is provided
  const imageUrl = community.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(community.name)}&background=random&size=128`;
  const bannerUrl = community.banner || 'https://via.placeholder.com/1200x300/718096/FFFFFF?text=';
  
  // Format member count
  const formattedMemberCount = community.memberCount ? 
    community.memberCount > 1000 ? `${(community.memberCount / 1000).toFixed(1)}k` : community.memberCount.toString() 
    : '0';
  
  // Get moderation type label
  const getModerationLabel = () => {
    switch (community.moderationSettings.moderationType) {
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
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Banner */}
        <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
          {community.banner && (
            <Image
              src={bannerUrl}
              alt={`${community.name} banner`}
              fill
              className="object-cover"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        
        {/* Community Info */}
        <div className="px-6 py-4 relative">
          {/* Community Image */}
          <div className="absolute -top-16 left-6 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-200 dark:bg-gray-700 w-32 h-32">
            <Image
              src={imageUrl}
              alt={`${community.name} image`}
              width={128}
              height={128}
              className="object-cover"
            />
          </div>
          
          {/* Subscribe Button */}
          {currentUser && (
            <div className="absolute top-4 right-4">
              <button
                onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                className={`px-4 py-2 rounded-md font-medium ${
                  isSubscribed
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-bottle-green text-white hover:bg-bottle-green-700'
                }`}
              >
                {isSubscribed ? 'Joined' : 'Join Community'}
              </button>
            </div>
          )}
          
          {/* Community Details */}
          <div className="mt-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{community.name}</h1>
            </div>
            
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{formattedMemberCount} members</span>
              </div>
              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Created {new Date(community.createdAt * 1000).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{getModerationLabel()}</span>
              </div>
            </div>
            
            <div className="mt-4 text-gray-700 dark:text-gray-300">
              {community.description}
            </div>
            
            {/* Community Rules */}
            {community.rules && community.rules.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Community Rules</h2>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                  <ul className="list-disc pl-5 space-y-1">
                    {community.rules.map((rule, index) => (
                      <li key={index} className="text-gray-700 dark:text-gray-300">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Moderators */}
            {community.moderators && community.moderators.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Moderators</h2>
                <div className="flex flex-wrap gap-2">
                  {community.moderators.map((moderator, index) => (
                    <Link 
                      key={index}
                      href={`/profile/${moderator}`}
                      className="inline-flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {moderator.substring(0, 8)}...
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Posts would go here */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Posts</h2>
          
          {currentUser && (
            <Link href={`/community/${communityId}/post/create`} className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors">
              Create Post
            </Link>
          )}
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-6 text-center">
          <p className="text-gray-700 dark:text-gray-300">
            No posts yet. Be the first to post in this community!
          </p>
        </div>
      </div>
    </div>
  );
}