'use client';

import React from 'react';
import Image from 'next/image';
import { ProfileData } from '../../services/profileService';
import { generateRobohashUrl } from '../../utils/avatarUtils';
import { getSafeImageUrl, createImageErrorHandler } from '../../utils/imageUtils';

interface ProfileHeaderProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  onEditProfile: () => void;
}

export default function ProfileHeader({ profile, isOwnProfile, onEditProfile }: ProfileHeaderProps) {
  const {
    name,
    displayName,
    picture,
    banner,
    about,
    nip05,
    isVerified,
    website,
    lud16
  } = profile;

  const displayedName = displayName || name || 'Anonymous';
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Banner */}
      <div className="relative h-48 bg-bottle-green/20">
        {banner && (
          <Image
            src={getSafeImageUrl(banner, profile.publicKey)}
            alt={`${displayedName}'s banner`}
            fill
            className="object-cover"
            priority
            onError={createImageErrorHandler(profile.publicKey)}
          />
        )}
      </div>
      
      {/* Profile info */}
      <div className="px-6 py-4 relative">
        {/* Profile picture */}
        <div className="absolute -top-16 left-6 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-200 dark:bg-gray-700 w-32 h-32">
          <Image
            src={getSafeImageUrl(picture, profile.publicKey)}
            alt={`${displayedName}'s profile picture`}
            width={128}
            height={128}
            className="object-cover"
            priority
            onError={createImageErrorHandler(profile.publicKey)}
          />
        </div>
        
        {/* Edit button */}
        {isOwnProfile && (
          <div className="absolute top-4 right-4">
            <button
              onClick={onEditProfile}
              className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        )}
        
        {/* Profile details */}
        <div className="mt-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayedName}</h1>
            {isVerified && (
              <span
                className="ml-2 text-blue-500 dark:text-blue-400"
                title="NIP-05 Verified"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          
          {nip05 && (
            <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 mr-1 text-blue-500 dark:text-blue-400"
              >
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{nip05}</span>
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Verified
              </span>
            </div>
          )}
          
          {about && (
            <div className="mt-4 text-gray-700 dark:text-gray-300">
              {about}
            </div>
          )}
          
          <div className="mt-4 flex flex-wrap gap-4">
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-bottle-green hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                Website
              </a>
            )}
            
            {lud16 && (
              <div className="flex items-center text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                {lud16}
              </div>
            )}
            
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profile.publicKey.substring(0, 8)}...{profile.publicKey.substring(profile.publicKey.length - 8)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}