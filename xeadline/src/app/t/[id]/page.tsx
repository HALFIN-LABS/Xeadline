'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TopicDetailPage from '../../../components/topic/TopicDetailPage';
import { getTopicIdFromSlug } from '../../../services/topicSlugService';

export default function TopicPage() {
  const params = useParams();
  const slug = params?.id as string || '';
  const [topicId, setTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopicId() {
      if (!slug) {
        setLoading(false);
        setError('No slug provided');
        return;
      }

      try {
        const id = await getTopicIdFromSlug(slug);
        if (id) {
          setTopicId(id);
        } else {
          setError('Topic not found');
        }
      } catch (err) {
        console.error('Error fetching topic ID:', err);
        setError('Error loading topic');
      } finally {
        setLoading(false);
      }
    }

    fetchTopicId();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
        </div>
      </div>
    );
  }

  if (error || !topicId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-700 dark:text-gray-300">
            {error || 'The topic you\'re looking for could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  return <TopicDetailPage topicId={topicId} />;
}