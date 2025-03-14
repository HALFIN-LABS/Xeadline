'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  fetchProfile,
  fetchActivity,
  selectViewingProfile,
  selectActivityFeed,
  selectProfileLoading,
  selectProfileError
} from '../../../redux/slices/profileSlice';
import { selectCurrentUser, selectIsAuthenticated } from '../../../redux/slices/authSlice';
import ProfileHeader from '@/components/profile/ProfileHeader';
import GeneratedProfileHeader from '@/components/profile/GeneratedProfileHeader';
import ProfileActivity from '@/components/profile/ProfileActivity';
import ProfileEditModal from '@/components/profile/ProfileEditModal';

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const pubkey = params?.pubkey as string;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const profile = useAppSelector(selectViewingProfile);
  const activityFeed = useAppSelector(selectActivityFeed);
  const isLoading = useAppSelector(selectProfileLoading);
  const error = useAppSelector(selectProfileError);
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Debug logs
  console.log('Current user public key:', currentUser?.publicKey);
  console.log('URL pubkey parameter:', pubkey);
  
  const isOwnProfile = isAuthenticated && currentUser?.publicKey === pubkey;
  console.log('Is own profile:', isOwnProfile);
  
  // Fetch profile data
  useEffect(() => {
    if (pubkey) {
      dispatch(fetchProfile(pubkey as string));
      dispatch(fetchActivity(pubkey as string));
    }
  }, [dispatch, pubkey]);
  
  // If it's the user's own profile and the user clicks "Create Profile",
  // open the edit modal
  const handleCreateProfile = () => {
    setIsEditModalOpen(true);
  };
  
  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };
  
  if (isLoading && !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-6">
        <GeneratedProfileHeader
          publicKey={pubkey as string}
          isOwnProfile={isOwnProfile}
          onEditProfile={handleCreateProfile}
        />
        
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Activity</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {error
                ? "Error loading activity feed."
                : "No activity found for this user yet."}
            </p>
          </div>
        </div>
        
        {isOwnProfile && (
          <ProfileEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            profile={null}
          />
        )}
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <ProfileHeader 
        profile={profile} 
        isOwnProfile={isOwnProfile} 
        onEditProfile={handleEditProfile} 
      />
      
      <div className="mt-8">
        <ProfileActivity 
          activities={activityFeed} 
          isLoading={isLoading && activityFeed.length === 0} 
        />
      </div>
      
      {isOwnProfile && (
        <ProfileEditModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          profile={profile} 
        />
      )}
    </div>
  );
}