'use client';

import React, { useState } from 'react';
import { MemberRole } from './MemberListPage';

interface MemberRoleSelectorProps {
  currentRole: MemberRole;
  pubkey: string;
  onRoleChange: (pubkey: string, newRole: MemberRole) => void;
}

export default function MemberRoleSelector({
  currentRole,
  pubkey,
  onRoleChange
}: MemberRoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleRoleChange = async (newRole: MemberRole) => {
    if (newRole === currentRole) {
      setIsOpen(false);
      return;
    }
    
    setIsLoading(true);
    try {
      await onRoleChange(pubkey, newRole);
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Updating...
          </>
        ) : (
          <>
            Change Role
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
          <div className="py-1">
            <button
              onClick={() => handleRoleChange('member')}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentRole === 'member'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Member
            </button>
            <button
              onClick={() => handleRoleChange('contributor')}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentRole === 'contributor'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Contributor
            </button>
            <button
              onClick={() => handleRoleChange('moderator')}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentRole === 'moderator'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Moderator
            </button>
            <button
              onClick={() => handleRoleChange('admin')}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentRole === 'admin'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}