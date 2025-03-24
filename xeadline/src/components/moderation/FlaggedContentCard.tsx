'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { FlaggedContent } from '../../redux/slices/flagSlice';
import { formatDistanceToNow } from 'date-fns';

interface FlaggedContentCardProps {
  flaggedContent: FlaggedContent;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

export default function FlaggedContentCard({
  flaggedContent,
  onApprove,
  onReject,
  isLoading
}: FlaggedContentCardProps) {
  const [contentPreview, setContentPreview] = useState<string>('Loading content...');
  const [error, setError] = useState<string | null>(null);
  
  // Get the post content if it's a post
  const post = useAppSelector(state =>
    flaggedContent.contentType === 'post'
      ? state.post.byId[flaggedContent.contentId]
      : null
  );
  
  useEffect(() => {
    // If it's a post and we have it in the store, use that
    if (flaggedContent.contentType === 'post' && post) {
      // Extract the text content from the post
      const textContent = post.content.text || post.content.title || 'No content available';
      setContentPreview(textContent);
      return;
    }
    
    // Otherwise, fetch the content
    fetchContent();
  }, [flaggedContent.contentId, flaggedContent.contentType, post]);
  
  const fetchContent = async () => {
    try {
      // In a real implementation, you would fetch the content from the API
      // For now, we'll just use a placeholder
      if (flaggedContent.contentType === 'post') {
        // Try to fetch the post content
        const response = await fetch(`/api/post/${flaggedContent.contentId}`);
        if (response.ok) {
          const data = await response.json();
          setContentPreview(data.content);
        } else {
          setContentPreview('Content not available');
        }
      } else {
        // For comments, we would fetch the comment content
        const response = await fetch(`/api/comment/${flaggedContent.contentId}`);
        if (response.ok) {
          const data = await response.json();
          setContentPreview(data.content);
        } else {
          setContentPreview('Comment not available');
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load content');
      setContentPreview('Content not available');
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 mr-2">
            {flaggedContent.contentType}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Flagged {formatTimestamp(flaggedContent.createdAt)}
          </span>
        </div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          Reason: {flaggedContent.reason}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content:</h3>
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p className="whitespace-pre-wrap break-words">{contentPreview}</p>
          )}
        </div>
      </div>
      
      {flaggedContent.details && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional details:</h3>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200">
            <p className="whitespace-pre-wrap break-words">{flaggedContent.details}</p>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Flagged by: {flaggedContent.flaggerPubkey.substring(0, 8)}...
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Reject Flag
          </button>
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Approve Flag
          </button>
        </div>
      </div>
    </div>
  );
}