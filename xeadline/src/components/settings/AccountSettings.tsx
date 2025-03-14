'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { selectCurrentProfile } from '../../redux/slices/profileSlice';
import { nip19 } from 'nostr-tools';
import { checkExtensionAvailability } from '../../utils/nostrKeys';

export default function AccountSettings() {
  const currentUser = useAppSelector(selectCurrentUser);
  const currentProfile = useAppSelector(selectCurrentProfile);
  const [showHexKey, setShowHexKey] = useState(false);
  const [isNostrExtensionAvailable, setIsNostrExtensionAvailable] = useState(false);
  
  // Check if Nostr extension is available and connected
  useEffect(() => {
    const checkExtension = async () => {
      try {
        // First check if the extension is available
        const isAvailable = await checkExtensionAvailability();
        
        // If we're signed in with a private key, we're not using the extension
        // even if it's available in the browser
        if (currentUser?.privateKey) {
          console.log('User is signed in with a private key, not using Nostr extension');
          setIsNostrExtensionAvailable(false);
        } else {
          setIsNostrExtensionAvailable(isAvailable);
        }
      } catch (error) {
        console.error('Error checking Nostr extension:', error);
        setIsNostrExtensionAvailable(false);
      }
    };
    
    checkExtension();
  }, [currentUser]);
  
  // Convert hex public key to npub format
  const getNpubFromHex = (hexKey: string): string => {
    try {
      return nip19.npubEncode(hexKey);
    } catch (error) {
      console.error('Error encoding npub:', error);
      return 'Invalid public key';
    }
  };
  
  // Handle connecting to Nostr extension
  const handleConnectNostrExtension = async () => {
    if (currentUser?.privateKey) {
      const confirmed = window.confirm(
        'You are currently signed in with a private key. Connecting to a Nostr extension may switch to a different account. Do you want to continue?'
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    try {
      // This will prompt the user to approve the connection
      if (window.nostr) {
        const publicKey = await window.nostr.getPublicKey();
        if (publicKey) {
          alert('Successfully connected to Nostr extension!');
          // In a real implementation, you would update the user's authentication state here
        }
      } else {
        alert('No Nostr extension detected. Please install one and try again.');
      }
    } catch (error) {
      console.error('Error connecting to Nostr extension:', error);
      alert('Failed to connect to Nostr extension. Please try again.');
    }
  };
  
  return (
    <div>
      <h2 className="text-lg font-medium mb-6">Account Settings</h2>
      
      {/* Account Information */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Account Information</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="pubkey" className="block text-sm font-medium mb-1">
              Public Key
            </label>
            <div className="flex mb-2">
              <input
                type="text"
                id="pubkey"
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm"
                value={showHexKey 
                  ? currentUser?.publicKey || 'No public key available'
                  : currentUser?.publicKey 
                    ? getNpubFromHex(currentUser.publicKey)
                    : 'No public key available'
                }
                readOnly
              />
              <button 
                className="ml-2 px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm"
                onClick={() => {
                  const keyToCopy = showHexKey 
                    ? currentUser?.publicKey 
                    : currentUser?.publicKey ? getNpubFromHex(currentUser.publicKey) : '';
                  navigator.clipboard.writeText(keyToCopy || '');
                  alert('Public key copied to clipboard!');
                }}
              >
                Copy
              </button>
            </div>
            <div className="flex justify-start mb-2">
              <button
                className={`px-3 py-1 text-xs rounded-l-md ${showHexKey ? 'bg-bottle-green text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                onClick={() => setShowHexKey(true)}
              >
                Hex
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-r-md ${!showHexKey ? 'bg-bottle-green text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                onClick={() => setShowHexKey(false)}
              >
                npub
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your Nostr public key (cannot be changed)
            </p>
          </div>
        </div>
      </div>
      
      {/* Connected Accounts */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Connected Accounts</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium">Lightning Wallet</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Connected</p>
              </div>
            </div>
            <button className="text-sm text-red-500 hover:text-red-600">
              Disconnect
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium">Nostr Extension</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentUser?.privateKey
                    ? 'Not in use (signed in with private key)'
                    : isNostrExtensionAvailable
                      ? 'Connected'
                      : 'Not Connected'}
                </p>
              </div>
            </div>
            {isNostrExtensionAvailable ? (
              <button className="text-sm text-red-500 hover:text-red-600">
                Disconnect
              </button>
            ) : (
              <button 
                className="text-sm text-bottle-green hover:text-bottle-green-700"
                onClick={handleConnectNostrExtension}
              >
                {currentUser?.privateKey ? 'Switch to Extension' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}