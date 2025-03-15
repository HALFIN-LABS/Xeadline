'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateSlug, createSlug, getTopicIdFromSlug, isSlugAvailable } from '../../services/topicSlugService';

export default function TestSlugPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [topicId, setTopicId] = useState('');
  const [lookupSlug, setLookupSlug] = useState('');
  const [lookupResult, setLookupResult] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate slug from name
  const handleGenerateSlug = () => {
    if (!name) return;
    const generatedSlug = generateSlug(name);
    setSlug(generatedSlug);
  };

  // Create slug mapping
  const handleCreateMapping = async () => {
    if (!slug || !topicId) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const result = await createSlug(slug, topicId);
      if (result) {
        setMessage(`Successfully created mapping: ${result.slug} -> ${result.topicId}`);
      } else {
        setMessage('Failed to create mapping');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      setMessage('Error creating mapping');
    } finally {
      setLoading(false);
    }
  };

  // Look up topic ID from slug
  const handleLookupSlug = async () => {
    if (!lookupSlug) return;
    
    setLoading(true);
    setLookupResult(null);
    
    try {
      const result = await getTopicIdFromSlug(lookupSlug);
      setLookupResult(result);
    } catch (error) {
      console.error('Error looking up slug:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if slug is available
  const handleCheckAvailability = async () => {
    if (!slug) return;
    
    setLoading(true);
    setIsAvailable(null);
    
    try {
      const available = await isSlugAvailable(slug);
      setIsAvailable(available);
    } catch (error) {
      console.error('Error checking slug availability:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Test Slug Mapping</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Mapping */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Create Slug Mapping</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Bitcoin Discussion"
              />
              <button
                onClick={handleGenerateSlug}
                className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Generate Slug
              </button>
            </div>
            
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug
              </label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  t/
                </span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-r-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., bitcoin-discussion"
                />
              </div>
              <button
                onClick={handleCheckAvailability}
                className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Check Availability
              </button>
              {isAvailable !== null && (
                <p className={`mt-1 text-sm ${isAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isAvailable ? 'Slug is available!' : 'Slug is already taken.'}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="topicId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic ID
              </label>
              <input
                id="topicId"
                type="text"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
                placeholder="e.g., pubkey:d-identifier"
              />
            </div>
            
            <button
              onClick={handleCreateMapping}
              disabled={loading || !slug || !topicId}
              className="w-full px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Mapping'}
            </button>
            
            {message && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {message}
              </p>
            )}
          </div>
        </div>
        
        {/* Lookup Mapping */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Lookup Topic ID</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="lookupSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug to Lookup
              </label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  t/
                </span>
                <input
                  id="lookupSlug"
                  type="text"
                  value={lookupSlug}
                  onChange={(e) => setLookupSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-r-md shadow-sm focus:outline-none focus:ring-bottle-green focus:border-bottle-green dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., bitcoin-discussion"
                />
              </div>
            </div>
            
            <button
              onClick={handleLookupSlug}
              disabled={loading || !lookupSlug}
              className="w-full px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 disabled:opacity-50"
            >
              {loading ? 'Looking up...' : 'Lookup Topic ID'}
            </button>
            
            {lookupResult !== null && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h3 className="text-lg font-medium mb-2">Result:</h3>
                {lookupResult ? (
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">Topic ID:</span> {lookupResult}
                    </p>
                    <button
                      onClick={() => router.push(`/t/${lookupSlug}`)}
                      className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      Go to Topic
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    No topic found with this slug.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}