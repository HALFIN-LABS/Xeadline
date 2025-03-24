'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchPostsForTopic, selectPostsByTopic, selectPostsLoading } from '../../redux/slices/postSlice';
import { selectCurrentTopic } from '../../redux/slices/topicSlice';
import { PostCard } from '../post/PostCard';
import CommunityFeedSorter, { SortOption } from './CommunityFeedSorter';
import ContentTypeFilter, { ContentType } from './ContentTypeFilter';
import { useSearchParams } from 'next/navigation';

interface CommunityFeedProps {
  topicId: string;
}

export default function CommunityFeed({ topicId }: CommunityFeedProps) {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const currentTopic = useAppSelector(selectCurrentTopic);
  const posts = useAppSelector(state => selectPostsByTopic(state, topicId));
  const isLoading = useAppSelector(selectPostsLoading);
  
  // Get sort and filter parameters from URL or use defaults
  const [sortOption, setSortOption] = useState<SortOption>(
    (searchParams?.get('sort') as SortOption) || 'new'
  );
  const [contentType, setContentType] = useState<ContentType>(
    (searchParams?.get('type') as ContentType) || 'all'
  );
  
  useEffect(() => {
    if (topicId) {
      dispatch(fetchPostsForTopic(topicId));
    }
  }, [dispatch, topicId]);
  
  // Update state when URL parameters change
  useEffect(() => {
    const sort = searchParams?.get('sort') as SortOption;
    const type = searchParams?.get('type') as ContentType;
    
    if (sort && ['new', 'hot', 'top', 'rising'].includes(sort)) {
      setSortOption(sort);
    }
    
    if (type && ['all', 'text', 'link', 'media', 'poll'].includes(type)) {
      setContentType(type);
    }
  }, [searchParams]);
  
  // Filter posts based on content type
  const filteredPosts = posts.filter(post => {
    if (contentType === 'all') return true;
    return post.content.type === contentType;
  });
  
  // Sort posts based on sort option
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortOption) {
      case 'new':
        return b.createdAt - a.createdAt;
      case 'hot':
        // Simple hot algorithm: likes + comments, weighted by recency
        const aHotScore = (a.likes + a.comments) * Math.pow(1.5, (a.createdAt - Date.now()/1000) / 86400);
        const bHotScore = (b.likes + b.comments) * Math.pow(1.5, (b.createdAt - Date.now()/1000) / 86400);
        return bHotScore - aHotScore;
      case 'top':
        // Simple top algorithm: just likes + comments
        return (b.likes + b.comments) - (a.likes + a.comments);
      case 'rising':
        // Simple rising algorithm: (likes + comments) / age in hours
        const aAge = (Date.now()/1000 - a.createdAt) / 3600;
        const bAge = (Date.now()/1000 - b.createdAt) / 3600;
        const aRisingScore = aAge > 0 ? (a.likes + a.comments) / aAge : 0;
        const bRisingScore = bAge > 0 ? (b.likes + b.comments) / bAge : 0;
        return bRisingScore - aRisingScore;
      default:
        return b.createdAt - a.createdAt;
    }
  });
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar with filters */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-20 space-y-6">
            <ContentTypeFilter 
              currentType={contentType}
              onTypeChange={setContentType}
            />
            
            {/* Additional filters could go here */}
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex-1">
          {/* Sticky sort options at the top */}
          <div className="sticky top-14 z-10 bg-gray-50 dark:bg-[rgb(10,10,10)] py-4 border-b border-gray-800 mb-4">
            <CommunityFeedSorter 
              currentSort={sortOption}
              onSortChange={setSortOption}
            />
          </div>
          
          {/* Posts */}
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-bottle-green"></div>
            </div>
          ) : sortedPosts.length > 0 ? (
            <div className="space-y-6 pt-2">
              {sortedPosts.map((post, index, array) => (
                <div key={post.id}>
                  <PostCard post={post} topicName={currentTopic?.name || ''} />
                  {index < array.length - 1 && (
                    <div className="h-[1px] bg-gray-300 dark:bg-gray-600 border-t border-gray-400 dark:border-gray-500 mt-6 mb-6 max-w-[45rem] mx-auto" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-[rgb(10,10,10)] rounded-md p-6 text-center">
              <p className="text-gray-700 dark:text-gray-300">
                No posts found matching your filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}