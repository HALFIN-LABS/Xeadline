'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateTopicModerators, selectCurrentTopic } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import Modal from '../ui/Modal';

interface TopicManagersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TopicManagersModal({ isOpen, onClose }: TopicManagersModalProps) {
  const dispatch = useAppDispatch();
  const currentTopic = useAppSelector(selectCurrentTopic);
  const currentUser = useAppSelector(selectCurrentUser);
  
  const [moderators, setModerators] = useState<string[]>([]);
  const [newModeratorPubkey, setNewModeratorPubkey] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Initialize moderators from current topic
  useEffect(() => {
    if (currentTopic) {
      setModerators([...currentTopic.moderators]);
    }
  }, [currentTopic]);
  
  // Check if current user is the topic creator or a moderator
  const isCreator = currentUser?.publicKey === currentTopic?.pubkey;
  const isModerator = currentTopic?.moderators.includes(currentUser?.publicKey || '');
  const canManageModerators = isCreator || isModerator;
  
  const handleAddModerator = () => {
    // Validate pubkey format (simple check for now)
    if (!newModeratorPubkey || newModeratorPubkey.length < 32) {
      setError('Please enter a valid public key');
      return;
    }
    
    // Check if already in the list
    if (moderators.includes(newModeratorPubkey)) {
      setError('This public key is already a manager');
      return;
    }
    
    // Add to the list
    setModerators([...moderators, newModeratorPubkey]);
    setNewModeratorPubkey('');
    setError('');
  };
  
  const handleRemoveModerator = (pubkey: string) => {
    // Don't allow removing the creator
    if (pubkey === currentTopic?.pubkey) {
      setError('Cannot remove the topic creator');
      return;
    }
    
    setModerators(moderators.filter(mod => mod !== pubkey));
    setError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTopic) {
      setError('No topic selected');
      return;
    }
    
    if (!canManageModerators) {
      setError('Only topic moderators can update managers');
      return;
    }
    
    // Ensure the creator is always a moderator
    if (!moderators.includes(currentTopic.pubkey)) {
      setError('The topic creator must remain a manager');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      console.log('Updating topic moderators:', {
        topicId: currentTopic.id,
        moderatorsCount: moderators.length,
        hasPrivateKey: !!currentUser?.privateKey
      });
      
      const result = await dispatch(updateTopicModerators({
        topicId: currentTopic.id,
        moderators,
        privateKey: currentUser?.privateKey
      })).unwrap();
      
      console.log('Successfully updated topic moderators:', result);
      onClose();
    } catch (error) {
      console.error('Error updating topic managers:', error);
      console.error('Current user:', currentUser ? {
        publicKey: currentUser.publicKey,
        hasPrivateKey: !!currentUser.privateKey
      } : 'No current user');
      console.error('Current topic:', currentTopic ? {
        id: currentTopic.id,
        pubkey: currentTopic.pubkey,
        moderators: currentTopic.moderators
      } : 'No current topic');
      
      setError(typeof error === 'string' ? error : 'Failed to update topic managers');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Footer with action buttons
  const modalFooter = (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="managers-form"
        disabled={isUpdating || !canManageModerators}
        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green disabled:opacity-70"
      >
        {isUpdating ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Topic Managers"
      footer={modalFooter}
    >
      {!canManageModerators && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-600 dark:text-yellow-400">
          Only topic moderators can manage topic managers.
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} id="managers-form" className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Topic managers can moderate content and manage the topic settings. The topic creator cannot be removed as a manager.
          </p>
          
          {/* Current Managers List */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Managers</h3>
            <ul className="space-y-2">
              {moderators.map(pubkey => (
                <li key={pubkey} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  <div className="flex items-center">
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                      {pubkey}
                    </span>
                    {pubkey === currentTopic?.pubkey && (
                      <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                        Creator
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveModerator(pubkey)}
                    disabled={pubkey === currentTopic?.pubkey || !canManageModerators}
                    className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Add New Manager */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Manager</h3>
            <div className="flex">
              <input
                type="text"
                value={newModeratorPubkey}
                onChange={(e) => setNewModeratorPubkey(e.target.value)}
                placeholder="Enter public key"
                disabled={!canManageModerators}
                className="flex-grow mr-2 p-2 border rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-sm"
              />
              <button
                type="button"
                onClick={handleAddModerator}
                disabled={!canManageModerators}
                className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 disabled:opacity-70"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter the Nostr public key of the user you want to add as a manager.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}