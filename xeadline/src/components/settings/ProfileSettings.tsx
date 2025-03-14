'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { selectCurrentProfile, setCurrentProfile } from '../../redux/slices/profileSlice';
import { generateRobohashUrl } from '../../utils/avatarUtils';
import { updateUserProfile, uploadProfileImage } from '../../services/profileService';

export default function ProfileSettings() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentProfile = useAppSelector(selectCurrentProfile);
  
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [nip05, setNip05] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [useDefaultAvatar, setUseDefaultAvatar] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize with profile data from Redux store
  useEffect(() => {
    if (currentProfile) {
      setDisplayName(currentProfile.displayName || '');
      setAbout(currentProfile.about || '');
      setWebsite(currentProfile.website || '');
      setNip05(currentProfile.nip05 || '');
      
      // Set profile picture if available
      if (currentProfile.picture) {
        setProfilePicturePreview(currentProfile.picture);
        setUseDefaultAvatar(false);
      } else if (currentUser?.publicKey) {
        // Otherwise use Robohash
        setProfilePicturePreview(generateRobohashUrl(currentUser.publicKey));
        setUseDefaultAvatar(true);
      }
      
      // Set banner image if available
      if (currentProfile.banner) {
        setBannerImagePreview(currentProfile.banner);
      }
    } else if (currentUser?.publicKey && !profilePicturePreview) {
      // Fallback to Robohash if no profile or picture
      setProfilePicturePreview(generateRobohashUrl(currentUser.publicKey));
    }
  }, [currentProfile, currentUser?.publicKey]);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
  
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicture(file);
      setUseDefaultAvatar(false);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleResetProfilePicture = () => {
    setProfilePicture(null);
    setUseDefaultAvatar(true);
    if (currentUser?.publicKey) {
      setProfilePicturePreview(generateRobohashUrl(currentUser.publicKey));
    }
  };
  
  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setBannerImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Prepare the profile data
      const profileData: {
        displayName: string;
        about: string;
        website: string;
        nip05: string;
        picture?: string;
        banner?: string;
      } = {
        displayName,
        about,
        website,
        nip05,
        // If using default avatar, store the Robohash URL
        // Otherwise, the custom profile picture would be uploaded and its URL stored
        picture: useDefaultAvatar && currentUser?.publicKey
          ? generateRobohashUrl(currentUser.publicKey)
          : profilePicturePreview || undefined,
        // Banner image would be uploaded and its URL stored
        banner: bannerImagePreview || undefined
      };
      
      console.log('Saving profile:', profileData);
      
      // Upload profile picture if needed
      if (profilePicture && !useDefaultAvatar) {
        try {
          const pictureUrl = await uploadProfileImage(profilePicture);
          profileData.picture = pictureUrl;
        } catch (error) {
          console.error('Failed to upload profile picture:', error);
          // Continue with the existing preview URL
        }
      }
      
      // Upload banner image if needed
      if (bannerImage) {
        try {
          const bannerUrl = await uploadProfileImage(bannerImage);
          profileData.banner = bannerUrl;
        } catch (error) {
          console.error('Failed to upload banner image:', error);
          // Continue with the existing preview URL
        }
      }
      
      // Update the profile using the profileService
      const success = await updateUserProfile(profileData);
      
      if (!success) {
        throw new Error('Failed to update profile');
      }
      
      // Update the Redux store
      if (currentProfile) {
        dispatch(setCurrentProfile({
          ...currentProfile,
          ...profileData
        }));
      }
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-lg font-medium mb-6">Profile Settings</h2>
      
      {/* Profile Images */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Profile Images</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Profile Picture
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                {profilePicturePreview ? (
                  <img 
                    src={profilePicturePreview} 
                    alt="Profile Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="block flex-1">
                    <span className="sr-only">Choose profile photo</span>
                    <input
                      type="file"
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-medium
                        file:bg-gray-100 file:text-gray-700
                        dark:file:bg-gray-700 dark:file:text-gray-300
                        hover:file:bg-gray-200 dark:hover:file:bg-gray-600"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                    />
                  </label>
                  
                  <button
                    type="button"
                    onClick={handleResetProfilePicture}
                    className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Use Robohash
                  </button>
                </div>
                
                <div className="flex items-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JPG, PNG or GIF. Max 2MB.
                    {useDefaultAvatar && (
                      <span className="ml-1">Currently using auto-generated Robohash avatar.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Banner Image */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Banner Image
            </label>
            <div className="space-y-2">
              <div className="w-full h-32 rounded-md bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {bannerImagePreview ? (
                  <img 
                    src={bannerImagePreview} 
                    alt="Banner Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <label className="block">
                <span className="sr-only">Choose banner image</span>
                <input 
                  type="file" 
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-gray-100 file:text-gray-700
                    dark:file:bg-gray-700 dark:file:text-gray-300
                    hover:file:bg-gray-200 dark:hover:file:bg-gray-600"
                  accept="image/*"
                  onChange={handleBannerImageChange}
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recommended size: 1500x500px. JPG, PNG or GIF. Max 5MB.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile Information */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Profile Information</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
          
          <div>
            <label htmlFor="about" className="block text-sm font-medium mb-1">
              About
            </label>
            <textarea
              id="about"
              rows={4}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell us about yourself"
            ></textarea>
          </div>
          
          <div>
            <label htmlFor="website" className="block text-sm font-medium mb-1">
              Website
            </label>
            <input
              type="url"
              id="website"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          
          <div>
            <label htmlFor="nip05" className="block text-sm font-medium mb-1">
              NIP-05 Identifier
            </label>
            <input
              type="text"
              id="nip05"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              value={nip05}
              onChange={(e) => setNip05(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A verified NIP-05 identifier will display a blue checkmark next to your name
            </p>
          </div>
        </div>
      </div>
      
      {/* Social Links */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Social Links</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="twitter" className="block text-sm font-medium mb-1">
              Twitter
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                @
              </span>
              <input
                type="text"
                id="twitter"
                className="flex-1 rounded-none rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                placeholder="username"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="github" className="block text-sm font-medium mb-1">
              GitHub
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                github.com/
              </span>
              <input
                type="text"
                id="github"
                className="flex-1 rounded-none rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                placeholder="username"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="mastodon" className="block text-sm font-medium mb-1">
              Mastodon
            </label>
            <input
              type="text"
              id="mastodon"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              placeholder="@username@instance.com"
            />
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors"
          onClick={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}