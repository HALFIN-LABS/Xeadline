'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { 
  fetchFlaggedContent, 
  resolveFlaggedContent, 
  selectFlaggedContent, 
  selectPendingFlagIds, 
  selectFlagLoading 
} from '../../redux/slices/flagSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { selectCurrentTopic } from '../../redux/slices/topicSlice';
import FlaggedContentCard from './FlaggedContentCard';

interface ModerationQueueProps {
  topicId: string;
}

export default function ModerationQueue({ topicId }: ModerationQueueProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentTopic = useAppSelector(selectCurrentTopic);
  const flaggedContent = useAppSelector(selectFlaggedContent);
  const pendingFlagIds = useAppSelector(selectPendingFlagIds);
  const isLoading = useAppSelector(selectFlagLoading);
  
  const [error, setError] = useState<string | null>(null);
  
  // Check if current user is a moderator
  const isModerator = currentTopic?.moderators.includes(currentUser?.publicKey || '') || false;
  
  useEffect(() => {
    if (topicId && isModerator) {
      loadFlaggedContent();
    }
  }, [topicId, isModerator]);
  
  const loadFlaggedContent = async () => {
    try {
      await dispatch(fetchFlaggedContent({ topicId, status: 'pending' })).unwrap();
      setError(null);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to load flagged content');
    }
  };
  
  const handleApprove = async (flagId: string) => {
    if (!currentUser?.privateKey) {
      setError('You must be logged in to approve flagged content');
      return;
    }
    
    try {
      await dispatch(resolveFlaggedContent({
        flagId,
        status: 'approved',
        privateKey: currentUser.privateKey
      })).unwrap();
      
      setError(null);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to approve flagged content');
    }
  };
  
  const handleReject = async (flagId: string) => {
    if (!currentUser?.privateKey) {
      setError('You must be logged in to reject flagged content');
      return;
    }
    
    try {
      await dispatch(resolveFlaggedContent({
        flagId,
        status: 'rejected',
        privateKey: currentUser.privateKey
      })).unwrap();
      
      setError(null);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to reject flagged content');
    }
  };
  
  if (!isModerator) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 my-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          Only moderators can access the moderation queue.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 my-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Moderation Queue
        </h2>
        <button
          onClick={loadFlaggedContent}
          disabled={isLoading}
          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {pendingFlagIds.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No flagged content waiting for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingFlagIds.map((flagId) => (
            <FlaggedContentCard
              key={flagId}
              flaggedContent={flaggedContent[flagId]}
              onApprove={() => handleApprove(flagId)}
              onReject={() => handleReject(flagId)}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}