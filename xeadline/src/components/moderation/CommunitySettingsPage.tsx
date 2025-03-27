'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectCurrentTopic, updateTopicSettings } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { Button } from '../ui/Button';

interface CommunitySettingsPageProps {
  topicId: string;
}

export default function CommunitySettingsPage({ topicId }: CommunitySettingsPageProps) {
  const dispatch = useAppDispatch();
  const currentTopic = useAppSelector(selectCurrentTopic);
  const currentUser = useAppSelector(selectCurrentUser);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Settings state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  const [moderationType, setModerationType] = useState<'standard' | 'pre-approval' | 'post-publication' | 'hybrid'>('standard');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedContentTypes, setAllowedContentTypes] = useState({
    text: true,
    link: true,
    media: true,
    poll: true
  });
  
  // Check if current user is an admin
  const isAdmin = currentTopic?.moderators.includes(currentUser?.publicKey || '') || false;
  
  useEffect(() => {
    if (currentTopic) {
      setName(currentTopic.name);
      setDescription(currentTopic.description || '');
      setRules(currentTopic.rules || []);
      setModerationType(currentTopic.moderationSettings?.moderationType || 'standard');
      
      // For now, we'll use a mock value for isPrivate since it's not in the Topic interface
      setIsPrivate(false);
      
      // We'll use default values for allowedContentTypes since it's not in the Topic interface
    }
  }, [currentTopic]);
  
  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };
  
  const handleRemoveRule = (index: number) => {
    const updatedRules = [...rules];
    updatedRules.splice(index, 1);
    setRules(updatedRules);
  };
  
  const handleContentTypeChange = (type: keyof typeof allowedContentTypes) => {
    setAllowedContentTypes({
      ...allowedContentTypes,
      [type]: !allowedContentTypes[type]
    });
  };
  
  const handleSaveSettings = async () => {
    if (!isAdmin) {
      setError('You do not have permission to modify community settings');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate settings
      if (!name.trim()) {
        throw new Error('Community name is required');
      }
      
      // Check if at least one content type is allowed
      if (!Object.values(allowedContentTypes).some(value => value)) {
        throw new Error('At least one content type must be allowed');
      }
      
      console.log('Updating community settings:', {
        topicId,
        name,
        description,
        rules,
        moderationType,
        isPrivate,
        allowedContentTypes
      });
      
      // Map the moderationType to the expected format
      // 'standard' in the UI maps to 'post-publication' in the backend
      const mappedModerationType = moderationType === 'standard' ? 'post-publication' : moderationType;
      
      // Dispatch the action to update topic settings
      const result = await dispatch(updateTopicSettings({
        topicId,
        name,
        description,
        rules,
        moderationSettings: {
          moderationType: mappedModerationType as 'pre-approval' | 'post-publication' | 'hybrid',
          // Include other moderation settings from the current topic
          ...(currentTopic?.moderationSettings?.autoApproveAfter !== undefined && {
            autoApproveAfter: currentTopic.moderationSettings.autoApproveAfter
          }),
          ...(currentTopic?.moderationSettings?.requireLightningDeposit !== undefined && {
            requireLightningDeposit: currentTopic.moderationSettings.requireLightningDeposit
          }),
          ...(currentTopic?.moderationSettings?.depositAmount !== undefined && {
            depositAmount: currentTopic.moderationSettings.depositAmount
          })
        },
        isPrivate,
        allowedContentTypes
      })).unwrap();
      
      console.log('Settings updated successfully:', result);
      
      // Show success message
      setSuccess('Community settings updated successfully');
      setIsLoading(false);
    } catch (err) {
      console.error('Error updating community settings:', err);
      setError(typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to update community settings');
      setIsLoading(false);
    }
  };
  
  if (!currentTopic) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 my-4 text-center">
        <p className="text-gray-700 dark:text-gray-300">Topic not found.</p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-6 my-4 text-center">
        <p className="text-yellow-700 dark:text-yellow-300">You do not have permission to access community settings.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Community Settings
        </h1>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-6">
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Community Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter community name"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter community description"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Privacy
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={() => setIsPrivate(!isPrivate)}
                className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 rounded"
              />
              <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Private Community (only visible to members)
              </label>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Content Settings</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed Content Types
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowText"
                  checked={allowedContentTypes.text}
                  onChange={() => handleContentTypeChange('text')}
                  className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 rounded"
                />
                <label htmlFor="allowText" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Text Posts
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowLink"
                  checked={allowedContentTypes.link}
                  onChange={() => handleContentTypeChange('link')}
                  className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 rounded"
                />
                <label htmlFor="allowLink" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Link Posts
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowMedia"
                  checked={allowedContentTypes.media}
                  onChange={() => handleContentTypeChange('media')}
                  className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 rounded"
                />
                <label htmlFor="allowMedia" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Media Posts (Images, Videos)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowPoll"
                  checked={allowedContentTypes.poll}
                  onChange={() => handleContentTypeChange('poll')}
                  className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 rounded"
                />
                <label htmlFor="allowPoll" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Poll Posts
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="moderationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Moderation Type
            </label>
            <select
              id="moderationType"
              value={moderationType}
              onChange={(e) => setModerationType(e.target.value as any)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="standard">Standard (Post-publication moderation)</option>
              <option value="pre-approval">Pre-approval (All posts require moderator approval)</option>
              <option value="post-publication">Post-publication (Posts are published immediately but can be removed)</option>
              <option value="hybrid">Hybrid (New members require approval, trusted members post directly)</option>
            </select>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Community Rules</h2>
          
          <div className="mb-4">
            <label htmlFor="newRule" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Add Rule
            </label>
            <div className="flex">
              <input
                type="text"
                id="newRule"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter rule"
              />
              <button
                onClick={handleAddRule}
                className="px-4 py-2 bg-bottle-green text-white rounded-r-md hover:bg-bottle-green-700"
              >
                Add
              </button>
            </div>
          </div>
          
          {rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-start">
                    <div className="bg-bottle-green text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{rule}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveRule(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No rules added yet.</p>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="px-6 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}