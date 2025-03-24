'use client';

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type ContentType = 'text' | 'link' | 'media' | 'poll' | 'all';

interface ContentTypeFilterProps {
  currentType?: ContentType;
  onTypeChange?: (type: ContentType) => void;
  className?: string;
}

export default function ContentTypeFilter({
  currentType = 'all',
  onTypeChange,
  className = ''
}: ContentTypeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const handleTypeChange = (type: ContentType) => {
    if (onTypeChange) {
      // If callback is provided, use it
      onTypeChange(type);
    } else {
      // Otherwise, update the URL query parameter
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('type', type);
      router.push(`${pathname}?${params.toString()}`);
    }
  };
  
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Type</h3>
      <div className="space-y-1">
        <button
          onClick={() => handleTypeChange('all')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
            currentType === 'all'
              ? 'bg-bottle-green text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          All Types
        </button>
        <button
          onClick={() => handleTypeChange('text')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
            currentType === 'text'
              ? 'bg-bottle-green text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Text Posts
        </button>
        <button
          onClick={() => handleTypeChange('link')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
            currentType === 'link'
              ? 'bg-bottle-green text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Link Posts
        </button>
        <button
          onClick={() => handleTypeChange('media')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
            currentType === 'media'
              ? 'bg-bottle-green text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Media Posts
        </button>
        <button
          onClick={() => handleTypeChange('poll')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
            currentType === 'poll'
              ? 'bg-bottle-green text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Poll Posts
        </button>
      </div>
    </div>
  );
}