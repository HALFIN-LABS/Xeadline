'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { createTopic, selectTopicLoading, selectTopicError } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { generateSlug, isSlugAvailable, generateUniqueSlug } from '../../services/topicSlugService';
import ImageUpload from '../ui/ImageUpload';

interface TopicCreationFormProps {
  onSuccess?: (topicId: string, slug: string) => void;
  onCancel?: () => void;
}

export default function TopicCreationForm({ onSuccess, onCancel }: TopicCreationFormProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectTopicLoading);
  const error = useAppSelector(selectTopicError);
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugValid, setIsSlugValid] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>(['Be respectful', 'Stay on topic']);
  const [newRule, setNewRule] = useState('');
  const [image, setImage] = useState('');
  const [banner, setBanner] = useState('');
  const [moderationType, setModerationType] = useState<'pre-approval' | 'post-publication' | 'hybrid'>('post-publication');
  const [autoApproveAfter, setAutoApproveAfter] = useState(5);
  const [requireLightningDeposit, setRequireLightningDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(100);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Generate slug from name
  useEffect(() => {
    if (name) {
      const generatedSlug = generateSlug(name);
      setSlug(generatedSlug);
      validateSlug(generatedSlug);
    } else {
      setSlug('');
      setIsSlugValid(false);
      setSlugError('');
    }
  }, [name]);
  
  // Validate slug
  const validateSlug = async (slugToValidate: string) => {
    if (!slugToValidate) {
      setIsSlugValid(false);
      setSlugError('Slug cannot be empty');
      return;
    }
    
    setIsCheckingSlug(true);
    setSlugError('');
    
    try {
      const available = await isSlugAvailable(slugToValidate);
      setIsSlugValid(available);
      if (!available) {
        setSlugError('This slug is already taken. Please choose another one.');
      }
    } catch (error) {
      console.error('Error checking slug availability:', error);
      setSlugError('Error checking slug availability');
    } finally {
      setIsCheckingSlug(false);
    }
  };
  
  // Handle slug change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(newSlug);
    validateSlug(newSlug);
  };
  
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
    
    if (!name || !description || !isSlugValid) {
      return;
    }
    
    try {
      const moderationSettings = {
        moderationType,
        ...(moderationType === 'hybrid' && { autoApproveAfter }),
        requireLightningDeposit,
        ...(requireLightningDeposit && { depositAmount })
      };
      
      // Generate a unique slug if needed
      let finalSlug = slug;
      if (!isSlugValid) {
        finalSlug = await generateUniqueSlug(name);
      }
      
      const resultAction = await dispatch(createTopic({
        name,
        slug: finalSlug,
        description,
        rules,
        image,
        banner,
        moderationSettings,
        privateKey: currentUser?.privateKey
      }));
      
      if (createTopic.fulfilled.match(resultAction)) {
        // Create slug mapping in the database with the topic name
        try {
          await fetch('/api/topic/slug', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              slug: finalSlug,
              topicId: resultAction.payload.id,
              name: name // Include the topic name
            }),
          });
        } catch (error) {
          console.error('Error creating slug mapping:', error);
          // Continue even if slug mapping fails
        }
        
        // Save image metadata to database if images were uploaded
        if (image || banner) {
          try {
            await fetch('/api/topic/save-images', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                topicId: resultAction.payload.id,
                iconUrl: image,
                bannerUrl: banner,
                createdBy: currentUser?.publicKey
              }),
            });
          } catch (error) {
            console.error('Error saving topic images:', error);
            // Continue even if image saving fails
          }
        }
        
        if (onSuccess) {
          onSuccess(resultAction.payload.id, resultAction.payload.slug);
        }
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
    }
  };
  
  const handleImageUploaded = (type: 'icon' | 'banner', url: string) => {
    if (type === 'icon') {
      setImage(url);
    } else {
      setBanner(url);
    }
    setUploadError(null);
  };
  
  const handleImageError = (error: string) => {
    setUploadError(error);
  };
  
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create a New Topic</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
          {error}
        </div>
      )}
      
      {uploadError && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
          {uploadError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Topic Name*
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
        
        {/* Topic Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Topic Slug* (will be used in URL: t/slug)
          </label>
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              t/
            </span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={handleSlugChange}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-r-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white ${
                slugError ? 'border-red-500 dark:border-red-700' : ''
              }`}
              placeholder="e.g., xeadline-news"
              required
            />
          </div>
          {isCheckingSlug && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Checking availability...
            </p>
          )}
          {slugError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {slugError}
            </p>
          )}
          {isSlugValid && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Slug is available!
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Only lowercase letters, numbers, and hyphens are allowed. No spaces.
          </p>
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
            placeholder="What is this topic about?"
            required
          />
        </div>
        
        {/* Topic Rules */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Topic Rules
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
          {/* Topic Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Topic Icon
            </label>
            <ImageUpload
              imageType="icon"
              onImageUploaded={(url: string) => handleImageUploaded('icon', url)}
              existingImageUrl={image}
            />
          </div>
          
          {/* Banner Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Banner Image
            </label>
            <ImageUpload
              imageType="banner"
              onImageUploaded={(url: string) => handleImageUploaded('banner', url)}
              existingImageUrl={banner}
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
            disabled={isLoading || !name || !description || !isSlugValid}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Topic'}
          </button>
        </div>
      </form>
    </div>
  );
}