'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { decrypt } from '../../utils/encryption';

interface KeyBackupProps {
  password?: string;
  showInstructions?: boolean;
}

export default function KeyBackup({ password, showInstructions = true }: KeyBackupProps) {
  const [showKey, setShowKey] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [decryptedKey, setDecryptedKey] = useState('');
  
  const currentUser = useAppSelector(selectCurrentUser);
  
  // If no encrypted key is available, show a message
  if (!currentUser?.encryptedPrivateKey) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400">
        No private key available for backup.
      </div>
    );
  }
  
  const handleRevealKey = async () => {
    try {
      // If password is provided as prop (during signup), use it
      // Otherwise use the password from the input field
      const passwordToUse = password || backupPassword;
      
      if (!passwordToUse) {
        setError('Please enter your password');
        return;
      }
      
      // Decrypt the private key
      const privateKey = await decrypt(
        currentUser.encryptedPrivateKey || '',
        passwordToUse
      );
      
      if (!privateKey) {
        setError('Invalid password');
        return;
      }
      
      // Show the key and store the decrypted key
      setDecryptedKey(privateKey);
      setShowKey(true);
      setError('');
    } catch (err) {
      setError('Failed to decrypt private key. Please check your password.');
    }
  };
  
  const handleCopyKey = async () => {
    try {
      // If password is provided as prop (during signup), use it
      // Otherwise use the password from the input field
      const passwordToUse = password || backupPassword;
      
      // Decrypt the private key
      const privateKey = await decrypt(
        currentUser.encryptedPrivateKey || '',
        passwordToUse
      );
      
      // Copy to clipboard
      await navigator.clipboard.writeText(privateKey);
      
      // Show success message
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setError('Failed to copy private key');
    }
  };
  
  const handleDownloadKey = async () => {
    try {
      // If password is provided as prop (during signup), use it
      // Otherwise use the password from the input field
      const passwordToUse = password || backupPassword;
      
      // Decrypt the private key
      const privateKey = await decrypt(
        currentUser.encryptedPrivateKey || '',
        passwordToUse
      );
      
      // Create a blob with the private key
      const blob = new Blob([privateKey], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'xeadline-private-key.txt';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download private key');
    }
  };
  
  return (
    <div className="space-y-4">
      {showInstructions && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Important: Backup Your Private Key</h3>
          <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
            <p>
              Your private key is stored encrypted in your browser. If you clear your browser data or use a different device, you'll need this key to access your account.
            </p>
            <p className="mt-1 font-medium">
              Store it somewhere safe and secure, like a password manager.
            </p>
          </div>
        </div>
      )}
      
      {!password && (
        <div>
          <label htmlFor="backup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter your password to reveal your private key
          </label>
          <input
            id="backup-password"
            type="password"
            value={backupPassword}
            onChange={(e) => setBackupPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3"
          />
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      
      <div className="flex flex-col space-y-2">
        {!showKey ? (
          <button
            type="button"
            onClick={handleRevealKey}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
          >
            Reveal Private Key
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto">
              <code className="text-base break-all">{decryptedKey}</code>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleCopyKey}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              
              <button
                type="button"
                onClick={handleDownloadKey}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
              >
                Download as File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}