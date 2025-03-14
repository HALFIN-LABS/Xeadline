'use client';

import React from 'react';
import { Event } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';

interface ProfileActivityProps {
  activities: Event[];
  isLoading: boolean;
}

export default function ProfileActivity({ activities, isLoading }: ProfileActivityProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Activity</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-bottle-green"></div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Activity</h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No activity found
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Activity</h2>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: Event;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const { kind, content, created_at, tags } = activity;
  
  // Format the timestamp
  const timestamp = new Date(created_at * 1000);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
  
  // Determine activity type
  const isTextNote = kind === 1;
  const isReaction = kind === 7;
  
  // Find referenced event (for reactions)
  const referencedEventId = isReaction ? 
    tags.find(tag => tag[0] === 'e')?.[1] : 
    null;
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
      <div className="flex items-start">
        <div className="flex-1">
          {isTextNote && (
            <div>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {content}
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {timeAgo}
              </div>
            </div>
          )}
          
          {isReaction && (
            <div>
              <div className="flex items-center">
                <span className="text-xl mr-2">{content}</span>
                <span className="text-gray-700 dark:text-gray-300">
                  reacted to a post
                </span>
              </div>
              {referencedEventId && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Event: {referencedEventId.substring(0, 8)}...
                </div>
              )}
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {timeAgo}
              </div>
            </div>
          )}
          
          {!isTextNote && !isReaction && (
            <div>
              <div className="text-gray-700 dark:text-gray-300">
                Event kind: {kind}
              </div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {timeAgo}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}