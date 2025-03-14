'use client';

import React, { useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  updateProfile,
  fetchProfile,
  fetchActivity,
  selectProfileUpdating,
  selectProfileUpdateError,
  selectCurrentProfile
} from '../../redux/slices/profileSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { ProfileData, uploadProfileImage } from '../../services/profileService';
import Modal from '../ui/Modal';
import { generateRobohashUrl } from '../../utils/avatarUtils';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData | null;
}

export default function ProfileEditModal({ isOpen, onClose, profile }: ProfileEditModalProps) {
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector(selectProfileUpdating);
  const updateError = useAppSelector(selectProfileUpdateError);
  const currentUser = useAppSelector(selectCurrentUser);
  const currentProfile = useAppSelector(selectCurrentProfile);
  
  const [name, setName] = useState(profile?.name || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [nip05, setNip05] = useState(profile?.nip05 || '');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [lud16, setLud16] = useState(profile?.lud16 || '');
  const [picture, setPicture] = useState(profile?.picture || '');
  const [banner, setBanner] = useState(profile?.banner || '');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const handlePictureClick = () => {
    pictureInputRef.current?.click();
  };
  
  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };
  
  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadingPicture(true);
      const imageUrl = await uploadProfileImage(file);
      setPicture(imageUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    } finally {
      setUploadingPicture(false);
    }
  };
  
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadingBanner(true);
      const imageUrl = await uploadProfileImage(file);
      setBanner(imageUrl);
    } catch (error) {
      console.error('Error uploading banner image:', error);
    } finally {
      setUploadingBanner(false);
    }
  };
  
  const handleResetProfilePicture = () => {
    if (currentUser?.publicKey) {
      // Generate a Robohash URL based on the user's public key
      const robohashUrl = generateRobohashUrl(currentUser.publicKey);
      setPicture(robohashUrl);
    }
  };

  // Extract username from NIP-05 identifier on component mount
  React.useEffect(() => {
    if (nip05) {
      const parts = nip05.split('@');
      if (parts.length === 2 && parts[1] === 'xeadline.com') {
        setUsername(parts[0]);
      }
    }
  }, [nip05]);

  const checkUsernameAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameAvailable(false);
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    
    if (!/^[a-z0-9_]{3,30}$/.test(value)) {
      setUsernameAvailable(false);
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    setUsernameChecking(true);
    try {
      const response = await fetch(`/api/nip05/check/${value}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
      if (!data.available) {
        setUsernameError('Username already taken');
      } else {
        setUsernameError('');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username availability');
    } finally {
      setUsernameChecking(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('You must be logged in to update your profile');
      return;
    }
    
    // Handle Xeadline NIP-05 username claim if available
    let finalNip05 = nip05;
    if (username && usernameAvailable) {
      try {
        const response = await fetch('/api/nip05/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            pubkey: currentUser.publicKey,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to claim username');
        }
        
        // Update NIP-05 with the claimed username
        finalNip05 = `${username}@xeadline.com`;
      } catch (error) {
        console.error('Error claiming username:', error);
        // Continue with profile update even if username claim fails
      }
    }
    
    // Create the metadata object
    const metadata = {
      name,
      displayName,
      about,
      website,
      nip05: finalNip05,
      lud16,
      picture,
      banner
    };
    
    try {
      // Update profile
      const result = await dispatch(updateProfile({
        metadata
      })).unwrap(); // Use unwrap to get the result or throw an error
      
      console.log('Profile update successful:', result);
      
      // Refresh profile data after successful update
      if (currentUser.publicKey) {
        dispatch(fetchProfile(currentUser.publicKey));
        dispatch(fetchActivity(currentUser.publicKey));
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Even if there's an error, the profile might have been updated on some relays
      // Let's check if we can fetch the latest profile data
      if (currentUser.publicKey) {
        console.log('Attempting to fetch latest profile data despite error...');
        
        // Fetch the latest profile data
        dispatch(fetchProfile(currentUser.publicKey));
        dispatch(fetchActivity(currentUser.publicKey));
        
        // Close the modal anyway - the update might have succeeded on some relays
        // The user will see the updated profile if it was successful
        console.log('Closing modal despite error - update might have succeeded on some relays');
        onClose();
      }
      
      // Error is handled by the updateError state from Redux
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
        form="profile-edit-form"
        disabled={isUpdating}
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
      title="Edit Profile"
      footer={modalFooter}
    >
      {updateError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-600 dark:text-red-400">
          {updateError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4" id="profile-edit-form">
        {/* Profile Images */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Profile Picture
            </label>
            <div 
              className="relative w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer mx-auto"
              onClick={handlePictureClick}
            >
              {picture ? (
                <img src={picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
              {uploadingPicture && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={handleResetProfilePicture}
                className="text-sm text-bottle-green hover:text-bottle-green-700 focus:outline-none"
              >
                Reset to Robot Avatar
              </button>
            </div>
            <input
              type="file"
              ref={pictureInputRef}
              onChange={handlePictureChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Banner Image
            </label>
            <div 
              className="relative w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden cursor-pointer"
              onClick={handleBannerClick}
            >
              {banner ? (
                <img src={banner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              )}
              {uploadingBanner && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={bannerInputRef}
              onChange={handleBannerChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
        
        {/* Profile Information */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3"
          />
        </div>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3"
          />
        </div>
        
        <div>
          <label htmlFor="about" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            About
          </label>
          <textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3"
          />
        </div>
        
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Website
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3"
          />
        </div>
        
        <div>
          <label htmlFor="nip05" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            NIP-05 Identifier
          </label>
          
          {/* Xeadline NIP-05 Username */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Xeadline Username
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase();
                  setUsername(value);
                  checkUsernameAvailability(value);
                }}
                className="mr-2 p-2 border rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green"
                placeholder="username"
              />
              <span>@xeadline.com</span>
            </div>
            {usernameChecking && (
              <p className="text-sm mt-1 text-gray-500">Checking availability...</p>
            )}
            {username && !usernameChecking && (
              <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-500' : 'text-red-500'}`}>
                {usernameAvailable
                  ? 'Username available!'
                  : usernameError || 'Username unavailable'}
              </p>
            )}
            <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
              Claim a username on xeadline.com for NIP-05 verification. This will be automatically verified.
            </p>
          </div>
          
          {/* External NIP-05 */}
          <div className="mt-4">
            <label htmlFor="nip05" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              External NIP-05 Identifier (Optional)
            </label>
            <input
              id="nip05"
              type="text"
              value={nip05}
              onChange={(e) => setNip05(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <p>
                Used for verification. A verified NIP-05 identifier will display a blue checkmark next to your name.
              </p>
              <p className="mt-1">
                To set up external NIP-05 verification:
              </p>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Enter your identifier in the format <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">name@yourdomain.com</code></li>
                <li>Create a <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/.well-known/nostr.json</code> file on your domain</li>
                <li>Add your public key to the file (see <a href="https://github.com/nostr-protocol/nips/blob/master/05.md" target="_blank" rel="noopener noreferrer" className="text-bottle-green hover:underline">NIP-05 spec</a>)</li>
              </ol>
              <p className="mt-1">
                Don't have a domain? You can use services like <a href="https://nostr.directory" target="_blank" rel="noopener noreferrer" className="text-bottle-green hover:underline">nostr.directory</a> to get a free NIP-05 identifier.
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <label htmlFor="lud16" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Lightning Address
          </label>
          <input
            id="lud16"
            type="text"
            value={lud16}
            onChange={(e) => setLud16(e.target.value)}
            placeholder="you@lightning.wallet"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3"
          />
        </div>
        
      </form>
    </Modal>
  );
}