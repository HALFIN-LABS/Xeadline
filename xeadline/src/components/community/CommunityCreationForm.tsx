'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { createCommunity, selectCommunityLoading, selectCommunityError } from '../../redux/slices/communitySlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';

interface CommunityCreationFormProps {
  onSuccess?: (communityId: string) => void;
  onCancel?: () => void;
}

export default function CommunityCreationForm({ onSuccess, onCancel }: CommunityCreationFormProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectCommunityLoading);
  const error = useAppSelector(selectCommunityError);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>(['Be respectful', 'Stay on topic']);
  const [newRule, setNewRule] = useState('');
  const [image, setImage] = useState('');
  const [banner, setBanner] = useState('');
  const [moderationType, setModerationType] = useState<'pre-approval' | 'post-publication' | 'hybrid'>('post-publication');
  const [autoApproveAfter, setAutoApproveAfter] = useState(5);
  const [requireLightningDeposit, setRequireLightningDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(100);
  
  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };
  
  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !description) {
      return;
    }
    
    try {
      const moderationSettings = {
        moderationType,
        ...(moderationType === 'hybrid' && { autoApproveAfter }),
        requireLightningDeposit,
        ...(requireLightningDeposit && { depositAmount })
      };
      
      const resultAction = await dispatch(createCommunity({
        name,
        description,
        rules,
        image,
        banner,
        moderationSettings,
        privateKey: currentUser?.privateKey
      }));
      
      if (createCommunity.fulfilled.match(resultAction)) {
        if (onSuccess) {
          onSuccess(resultAction.payload.id);
        }
      }
    } catch (error) {
      console.error('Failed to create community:', error);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create a New Community</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Community Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Community Name*
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Xeadline News"
            required
          />
        </div>
        
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description*
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
            placeholder="What is this community about?"
            required
          />
        </div>
        
        {/* Community Rules */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Community Rules
          </label>
          <div className="mb-2">
            <ul className="list-disc pl-5 space-y-1">
              {rules.map((rule, index) => (
                <li key={index} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{rule}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex">
            <input
              type="text"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
              placeholder="Add a rule"
            />
            <button
              type="button"
              onClick={handleAddRule}
              className="px-4 py-2 bg-bottle-green text-white rounded-r-md hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
            >
              Add
            </button>
          </div>
        </div>
        
        {/* Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Community Image */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Community Image URL
            </label>
            <input
              id="image"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          {/* Banner Image */}
          <div>
            <label htmlFor="banner" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Banner Image URL
            </label>
            <input
              id="banner"
              type="url"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
              placeholder="https://example.com/banner.jpg"
            />
          </div>
        </div>
        
        {/* Moderation Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Moderation Settings</h3>
          
          {/* Moderation Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Moderation Type
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="post-publication"
                  type="radio"
                  name="moderationType"
                  value="post-publication"
                  checked={moderationType === 'post-publication'}
                  onChange={() => setModerationType('post-publication')}
                  className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 dark:border-gray-700"
                />
                <label htmlFor="post-publication" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Post-Publication (content appears immediately, can be removed later)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="pre-approval"
                  type="radio"
                  name="moderationType"
                  value="pre-approval"
                  checked={moderationType === 'pre-approval'}
                  onChange={() => setModerationType('pre-approval')}
                  className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 dark:border-gray-700"
                />
                <label htmlFor="pre-approval" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Pre-Approval (content must be approved by moderators before appearing)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="hybrid"
                  type="radio"
                  name="moderationType"
                  value="hybrid"
                  checked={moderationType === 'hybrid'}
                  onChange={() => setModerationType('hybrid')}
                  className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 dark:border-gray-700"
                />
                <label htmlFor="hybrid" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Hybrid (pre-approval for new users, auto-approval for trusted users)
                </label>
              </div>
            </div>
          </div>
          
          {/* Auto-Approve Settings (for Hybrid) */}
          {moderationType === 'hybrid' && (
            <div className="mb-4 ml-6">
              <label htmlFor="autoApproveAfter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Auto-approve after how many successful posts?
              </label>
              <input
                id="autoApproveAfter"
                type="number"
                min="1"
                max="50"
                value={autoApproveAfter}
                onChange={(e) => setAutoApproveAfter(parseInt(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          
          {/* Lightning Deposit */}
          <div className="mb-4">
            <div className="flex items-center">
              <input
                id="requireLightningDeposit"
                type="checkbox"
                checked={requireLightningDeposit}
                onChange={(e) => setRequireLightningDeposit(e.target.checked)}
                className="h-4 w-4 text-bottle-green focus:ring-bottle-green border-gray-300 dark:border-gray-700"
              />
              <label htmlFor="requireLightningDeposit" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Require Lightning deposit for new posts (anti-spam measure)
              </label>
            </div>
            
            {requireLightningDeposit && (
              <div className="mt-2 ml-6">
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deposit amount (sats)
                </label>
                <input
                  id="depositAmount"
                  type="number"
                  min="10"
                  max="10000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !name || !description}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Community'}
          </button>
        </div>
      </form>
    </div>
  );
}