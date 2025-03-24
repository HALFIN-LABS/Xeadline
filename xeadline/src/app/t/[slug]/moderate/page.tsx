'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { fetchTopic, selectCurrentTopic, selectTopicLoading } from '../../../../redux/slices/topicSlice';
import ModeratorDashboard from '../../../../components/moderation/ModeratorDashboard';

export default function ModeratorDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const dispatch = useAppDispatch();
  const currentTopic = useAppSelector(selectCurrentTopic);
  const isLoading = useAppSelector(selectTopicLoading);
  
  useEffect(() => {
    if (slug) {
      // First try to fetch by slug
      dispatch(fetchTopic(slug));
    }
  }, [dispatch, slug]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
      </div>
    );
  }
  
  if (!currentTopic) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-6 my-4 text-center">
          <p className="text-red-700 dark:text-red-300">Topic not found.</p>
        </div>
      </div>
    );
  }
  
  return <ModeratorDashboard topicId={currentTopic.id} />;
}