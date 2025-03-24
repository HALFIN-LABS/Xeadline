'use client';

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type SortOption = 'new' | 'hot' | 'top' | 'rising';

interface CommunityFeedSorterProps {
  currentSort: SortOption;
  onSortChange?: (sort: SortOption) => void;
  className?: string;
}

export default function CommunityFeedSorter({
  currentSort = 'new',
  onSortChange,
  className = ''
}: CommunityFeedSorterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const handleSortChange = (sort: SortOption) => {
    if (onSortChange) {
      // If callback is provided, use it
      onSortChange(sort);
    } else {
      // Otherwise, update the URL query parameter
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('sort', sort);
      router.push(`${pathname}?${params.toString()}`);
    }
  };
  
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        onClick={() => handleSortChange('new')}
        className={`tab ${currentSort === 'new' ? 'tab-selected' : 'tab-unselected'}`}
        aria-label="Sort by newest"
      >
        New
      </button>
      <button
        onClick={() => handleSortChange('hot')}
        className={`tab ${currentSort === 'hot' ? 'tab-selected' : 'tab-unselected'}`}
        aria-label="Sort by hot"
      >
        Hot
      </button>
      <button
        onClick={() => handleSortChange('top')}
        className={`tab ${currentSort === 'top' ? 'tab-selected' : 'tab-unselected'}`}
        aria-label="Sort by top"
      >
        Top
      </button>
      <button
        onClick={() => handleSortChange('rising')}
        className={`tab ${currentSort === 'rising' ? 'tab-selected' : 'tab-unselected'}`}
        aria-label="Sort by rising"
      >
        Rising
      </button>
    </div>
  );
}