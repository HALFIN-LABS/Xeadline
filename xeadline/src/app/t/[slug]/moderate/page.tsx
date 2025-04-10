'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { fetchTopic, selectCurrentTopic, selectTopicLoading } from '../../../../redux/slices/topicSlice';
import ModeratorDashboard from '../../../../components/moderation/ModeratorDashboard';
import { getTopicIdFromSlug } from '../../../../services/topicSlugService';

export default function ModeratorDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const dispatch = useAppDispatch();
  const currentTopic = useAppSelector(selectCurrentTopic);
  const isLoading = useAppSelector(selectTopicLoading);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchTopicData() {
      if (!slug) return;
      
      console.log('ModeratorDashboardPage - Received slug:', slug);
      console.log('ModeratorDashboardPage - Current URL:', window.location.pathname);
      
      try {
        // Check if the slug contains a topic ID (format: topicId:slug)
        const slugParts = slug.split(':');
        let topicId;
        let actualSlug = slug;
        
        if (slugParts.length > 1) {
          // If the slug contains a colon, assume it's in the format topicId:slug
          console.log('ModeratorDashboardPage - Detected combined format, extracting topic ID');
          topicId = slugParts[0];
          actualSlug = slugParts[1];
          console.log('ModeratorDashboardPage - Extracted actual slug:', actualSlug);
        } else {
          // Otherwise, try to get the topic ID from the slug
          console.log('ModeratorDashboardPage - Using regular slug lookup');
          topicId = await getTopicIdFromSlug(slug);
        }
        
        console.log('ModeratorDashboardPage - Resolved topic ID:', topicId);
        
        if (topicId) {
          // Then fetch the topic using the ID
          dispatch(fetchTopic(topicId));
        } else {
          console.error('ModeratorDashboardPage - Topic ID not found for slug:', slug);
          setError('Topic not found');
        }
      } catch (err) {
        console.error('Error fetching topic:', err);
        setError('Error loading topic');
      }
    }
    
    fetchTopicData();
  }, [dispatch, slug]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
      </div>
    );
  }
  
  if (error || !currentTopic) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-6 my-4 text-center">
          <p className="text-red-700 dark:text-red-300">{error || 'Topic not found.'}</p>
        </div>
      </div>
    );
  }
  
  return <ModeratorDashboard topicId={currentTopic.id} />;
}