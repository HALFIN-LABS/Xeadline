'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CommunityDetailPage from '../../../components/community/CommunityDetailPage';
import MainLayout from '../../../components/layout/MainLayout';

export default function CommunityPage() {
  const params = useParams();
  const communityId = params?.id as string || '';
  
  if (!communityId) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Community Not Found</h1>
            <p className="text-gray-700 dark:text-gray-300">
              The community you're looking for could not be found.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <CommunityDetailPage communityId={communityId} />
    </MainLayout>
  );
}