'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectCurrentTopic } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import Link from 'next/link';
import ModerationQueue from './ModerationQueue';
import MemberListPage from './MemberListPage';
import CommunitySettingsPage from './CommunitySettingsPage';

interface ModeratorDashboardProps {
  topicId: string;
}

export default function ModeratorDashboard({ topicId }: ModeratorDashboardProps) {
  const currentTopic = useAppSelector(selectCurrentTopic);
  const currentUser = useAppSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState<'queue' | 'members' | 'settings'>('queue');
  
  // Check if current user is a moderator
  const isModerator = currentTopic?.moderators.includes(currentUser?.publicKey || '') || false;
  
  if (!currentTopic) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 my-4 text-center">
        <p className="text-gray-700 dark:text-gray-300">Topic not found.</p>
      </div>
    );
  }
  
  if (!isModerator) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-6 my-4 text-center">
        <p className="text-yellow-700 dark:text-yellow-300">You do not have permission to access the moderator dashboard.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Moderator Dashboard: {currentTopic.name}
          </h1>
          <Link
            href={`/t/${currentTopic.slug}`}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Back to Community
          </Link>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'queue'
                  ? 'border-bottle-green text-bottle-green dark:text-bottle-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Moderation Queue
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-bottle-green text-bottle-green dark:text-bottle-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Manage Members
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-bottle-green text-bottle-green dark:text-bottle-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Community Settings
            </button>
          </nav>
        </div>
        
        {/* Tab content */}
        <div>
          {activeTab === 'queue' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Moderation Queue</h2>
              <ModerationQueue topicId={topicId} />
            </div>
          )}
          
          {activeTab === 'members' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Manage Members</h2>
              <MemberListPage topicId={topicId} />
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Community Settings</h2>
              <CommunitySettingsPage topicId={topicId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}