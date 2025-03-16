'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectCurrentTopic } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import TopicManagersModal from './TopicManagersModal';

export default function TopicManagersButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentTopic = useAppSelector(selectCurrentTopic);
  const currentUser = useAppSelector(selectCurrentUser);
  
  // Check if the current user is authenticated
  if (!currentUser || !currentUser.publicKey) {
    return null;
  }
  
  // Check if there is a current topic
  if (!currentTopic) {
    return null;
  }
  
  // Check if the current user is a moderator of the topic
  const isModerator = currentTopic.moderators.includes(currentUser.publicKey);
  
  // Only render the button if the user is a moderator
  if (!isModerator) {
    return null;
  }
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Manage Managers
      </button>
      
      <TopicManagersModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}