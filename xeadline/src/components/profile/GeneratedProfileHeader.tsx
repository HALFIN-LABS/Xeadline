'use client';

import React from 'react';
import Image from 'next/image';
import { generateDisplayName, shortenPublicKey } from '../../utils/nameGenerator';
import { generateRobohashUrl } from '../../utils/avatarUtils';

interface GeneratedProfileHeaderProps {
  publicKey: string;
  isOwnProfile: boolean;
  onEditProfile: () => void;
}

export default function GeneratedProfileHeader({ 
  publicKey, 
  isOwnProfile, 
  onEditProfile 
}: GeneratedProfileHeaderProps) {
  // Generate a display name from the public key
  const displayName = generateDisplayName(publicKey);
  const shortPublicKey = shortenPublicKey(publicKey);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Banner - using a gradient instead of an image */}
      <div className="relative h-48 bg-gradient-to-r from-bottle-green/30 to-blue-500/30"></div>
      
      {/* Profile info */}
      <div className="px-6 py-4 relative">
        {/* Robohash avatar */}
        <div className="absolute -top-16 left-6 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-200 dark:bg-gray-700 w-32 h-32">
          <Image
            src={generateRobohashUrl(publicKey, 128)}
            alt={`${displayName}'s auto-generated avatar`}
            width={128}
            height={128}
            className="object-cover"
            priority
          />
        </div>
        
        {/* Edit button */}
        {isOwnProfile && (
          <div className="absolute top-4 right-4">
            <button
              onClick={onEditProfile}
              className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors"
            >
              Create Profile
            </button>
          </div>
        )}
        
        {/* Profile details */}
        <div className="mt-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              Generated
            </span>
          </div>
          
          <div className="mt-4 text-gray-700 dark:text-gray-300">
            {isOwnProfile ? (
              <p>This is your profile page. Create a profile to customize it and share more about yourself.</p>
            ) : (
              <p>This user hasn't set up their profile yet.</p>
            )}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {shortPublicKey}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}