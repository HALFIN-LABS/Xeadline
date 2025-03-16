'use client';

import React, { useState } from 'react';
import ImageUpload from '../ui/ImageUpload';
import { useAppSelector } from '../../redux/hooks';
import { selectCurrentUser } from '../../redux/slices/authSlice';

interface TopicImageManagerProps {
  topicId: string;
  currentIconUrl?: string;
  currentBannerUrl?: string;
  isModerator: boolean;
  onImageUpdated?: () => void;
}

export default function TopicImageManager({
  topicId,
  currentIconUrl,
  currentBannerUrl,
  isModerator,
  onImageUpdated
}: TopicImageManagerProps) {
  const currentUser = useAppSelector(selectCurrentUser);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  if (!isModerator) {
    return null;
  }
  
  const handleImageUpdate = async (imageType: 'icon' | 'banner', newImageUrl: string) => {
    if (!currentUser?.publicKey) {
      setError('You must be logged in to update images');
      return;
    }
    
    setUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/topic/update-image', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          imageType,
          newImageUrl,
          moderatorId: currentUser.publicKey
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update image');
      }
      
      setSuccess(`Topic ${imageType} updated successfully`);
      if (onImageUpdated) onImageUpdated();
    } catch (err) {
      console.error('Error updating topic image:', err);
      setError(err instanceof Error ? err.message : 'Failed to update image');
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Manage Topic Images</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ImageUpload
            imageType="icon"
            topicId={topicId}
            existingImageUrl={currentIconUrl}
            onImageUploaded={(url) => handleImageUpdate('icon', url)}
          />
        </div>
        
        <div>
          <ImageUpload
            imageType="banner"
            topicId={topicId}
            existingImageUrl={currentBannerUrl}
            onImageUploaded={(url) => handleImageUpdate('banner', url)}
          />
        </div>
      </div>
      
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        As a moderator, you can update the topic images at any time.
      </p>
    </div>
  );
}