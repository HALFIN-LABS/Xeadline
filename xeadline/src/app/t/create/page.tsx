'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TopicCreationForm from '../../../components/topic/TopicCreationForm';
import { useAppSelector } from '../../../redux/hooks';
import { selectIsAuthenticated } from '../../../redux/slices/authSlice';

export default function CreateTopicPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const handleSuccess = (topicId: string, slug: string) => {
    router.push(`/t/${slug}`);
  };

  const handleCancel = () => {
    router.push('/t/discover');
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Create a New Topic</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            You need to be logged in to create a topic.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <TopicCreationForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}