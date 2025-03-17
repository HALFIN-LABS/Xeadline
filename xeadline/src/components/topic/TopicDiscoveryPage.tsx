'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchTrendingTopics,
  fetchNewTopics,
  selectTrendingTopics,
  selectNewTopics,
  selectTopicLoading,
  selectTopicError,
  subscribeToTopic,
  unsubscribeFromTopic,
  selectIsSubscribed
} from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import TopicCard from './TopicCard';
import Link from 'next/link';

export default function TopicDiscoveryPage() {
  const dispatch = useAppDispatch();
  const trendingTopics = useAppSelector(selectTrendingTopics);
  const newTopics = useAppSelector(selectNewTopics);
  const isLoading = useAppSelector(selectTopicLoading);
  const error = useAppSelector(selectTopicError);
  const currentUser = useAppSelector(selectCurrentUser);
  
  const [activeTab, setActiveTab] = useState<'trending' | 'new'>('trending');
  
  useEffect(() => {
    // Fetch topics on component mount
    dispatch(fetchTrendingTopics());
    dispatch(fetchNewTopics());
  }, [dispatch]);
  
  const handleSubscribe = (topicId: string) => {
    if (currentUser) {
      dispatch(subscribeToTopic({
        topicId,
        privateKey: currentUser.privateKey
      }));
    }
  };
  
  const handleUnsubscribe = (topicId: string) => {
    if (currentUser) {
      dispatch(unsubscribeFromTopic({
        topicId,
        privateKey: currentUser.privateKey
      }));
    }
  };
  
  const renderTopics = () => {
    const topics = activeTab === 'trending' ? trendingTopics : newTopics;
    
    if (isLoading && topics.length === 0) {
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
    
    if (topics.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 my-4 text-center">
          <p className="text-gray-700 dark:text-gray-300">
            {activeTab === 'trending' 
              ? 'No trending topics found.' 
              : 'No new topics found.'}
          </p>
          <Link href="/t/create" className="mt-4 inline-block px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors">
            Create a Topic
          </Link>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            onSubscribe={() => handleSubscribe(topic.id)}
            onUnsubscribe={() => handleUnsubscribe(topic.id)}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Sticky filters at the top */}
      <div className="sticky top-14 z-10 bg-gray-50 dark:bg-[rgb(10,10,10)] py-4 border-b border-gray-800">
        <div className="max-w-[80rem] mx-auto flex items-center justify-between px-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('trending')}
              className={`tab ${
                activeTab === 'trending'
                  ? 'tab-selected'
                  : 'tab-unselected'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`tab ${
                activeTab === 'new'
                  ? 'tab-selected'
                  : 'tab-unselected'
              }`}
            >
              New
            </button>
          </div>
          <div className="flex items-center">
            <Link href="/t/create" className="tab tab-selected">
              Create Topic
            </Link>
          </div>
        </div>
      </div>
      
      {/* Topics grid with max width and centered */}
      <div className="max-w-[80rem] mx-auto px-4">
        {renderTopics()}
      </div>
    </div>
  );
}