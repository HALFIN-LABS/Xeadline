'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CommunityCreationForm from '../../../components/community/CommunityCreationForm';
import MainLayout from '../../../components/layout/MainLayout';
import { useAppSelector } from '../../../redux/hooks';
import { selectCurrentUser } from '../../../redux/slices/authSlice';
import Link from 'next/link';

export default function CreateCommunityPage() {
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  
  const handleSuccess = (communityId: string) => {
    router.push(`/community/${communityId}`);
  };
  
  const handleCancel = () => {
    router.push('/community/discover');
  };
  
  // If user is not logged in, show login prompt
  if (!currentUser) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Login Required</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              You need to be logged in to create a community.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 border border-bottle-green text-bottle-green rounded-md hover:bg-bottle-green hover:text-white transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <CommunityCreationForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </MainLayout>
  );
}