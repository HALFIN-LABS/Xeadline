'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { flagContent, selectFlagLoading } from '../../redux/slices/flagSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import FlagContentModal from './FlagContentModal';

interface FlagContentButtonProps {
  contentId: string;
  contentType: 'post' | 'comment';
  topicId: string;
  className?: string;
}

export default function FlagContentButton({
  contentId,
  contentType,
  topicId,
  className = ''
}: FlagContentButtonProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectFlagLoading);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleOpenModal = () => {
    if (!currentUser) {
      setError('You must be logged in to flag content');
      return;
    }
    
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };
  
  const handleFlagContent = async (reason: string, details?: string) => {
    if (!currentUser) {
      setError('You must be logged in to flag content');
      return;
    }
    
    try {
      await dispatch(flagContent({
        contentId,
        contentType,
        topicId,
        reason,
        details,
        privateKey: currentUser.privateKey
      })).unwrap();
      
      setIsModalOpen(false);
      setError(null);
    } catch (error) {
      setError(typeof error === 'string' ? error : 'Failed to flag content');
    }
  };
  
  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={isLoading}
        className={`text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors ${className}`}
        title="Report this content"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21a2 2 0 012 2v7.5a2 2 0 01-2 2h-5.5l-1-1H5a2 2 0 00-2 2zm12-12v4" />
        </svg>
        <span className="sr-only">Report</span>
      </button>
      
      <FlagContentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFlagContent}
        contentType={contentType}
        error={error}
        isLoading={isLoading}
      />
    </>
  );
}