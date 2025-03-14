'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchTrendingCommunities,
  fetchNewCommunities,
  selectTrendingCommunities,
  selectNewCommunities,
  selectCommunityLoading,
  selectCommunityError,
  subscribeToCommunity,
  unsubscribeFromCommunity,
  selectIsSubscribed
} from '../../redux/slices/communitySlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import CommunityCard from './CommunityCard';
import Link from 'next/link';

export default function CommunityDiscoveryPage() {
  const dispatch = useAppDispatch();
  const trendingCommunities = useAppSelector(selectTrendingCommunities);
  const newCommunities = useAppSelector(selectNewCommunities);
  const isLoading = useAppSelector(selectCommunityLoading);
  const error = useAppSelector(selectCommunityError);
  const currentUser = useAppSelector(selectCurrentUser);
  
  const [activeTab, setActiveTab] = useState<'trending' | 'new'>('trending');
  
  useEffect(() => {
    // Fetch communities on component mount
    dispatch(fetchTrendingCommunities());
    dispatch(fetchNewCommunities());
  }, [dispatch]);
  
  const handleSubscribe = (communityId: string) => {
    if (currentUser) {
      dispatch(subscribeToCommunity({
        communityId,
        privateKey: currentUser.privateKey
      }));
    }
  };
  
  const handleUnsubscribe = (communityId: string) => {
    if (currentUser) {
      dispatch(unsubscribeFromCommunity({
        communityId,
        privateKey: currentUser.privateKey
      }));
    }
  };
  
  const renderCommunities = () => {
    const communities = activeTab === 'trending' ? trendingCommunities : newCommunities;
    
    if (isLoading && communities.length === 0) {
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
    
    if (communities.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 my-4 text-center">
          <p className="text-gray-700 dark:text-gray-300">
            {activeTab === 'trending' 
              ? 'No trending communities found.' 
              : 'No new communities found.'}
          </p>
          <Link href="/community/create" className="mt-4 inline-block px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors">
            Create a Community
          </Link>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {communities.map(community => (
          <CommunityCard
            key={community.id}
            community={community}
            onSubscribe={() => handleSubscribe(community.id)}
            onUnsubscribe={() => handleUnsubscribe(community.id)}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discover Communities</h1>
        <Link href="/community/create" className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors">
          Create Community
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('trending')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'trending'
                  ? 'border-bottle-green text-bottle-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'new'
                  ? 'border-bottle-green text-bottle-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              New
            </button>
          </nav>
        </div>
        
        <div className="p-4">
          {renderCommunities()}
        </div>
      </div>
    </div>
  );
}