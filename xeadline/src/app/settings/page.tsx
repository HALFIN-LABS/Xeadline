'use client';

import React, { useState } from 'react';
import AccountSettings from '../../components/settings/AccountSettings';
import NotificationSettings from '../../components/settings/NotificationSettings';
import SecuritySettings from '../../components/settings/SecuritySettings';
import PrivacySettings from '../../components/settings/PrivacySettings';
import { useAppSelector } from '../../redux/hooks';
import { selectIsAuthenticated } from '../../redux/slices/authSlice';
import { useRouter } from 'next/navigation';

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const router = useRouter();
  
  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'security':
        return <SecuritySettings />;
      default:
        return <AccountSettings />;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto">
            <button
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'account'
                  ? 'text-bottle-green border-b-2 border-bottle-green'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'notifications'
                  ? 'text-bottle-green border-b-2 border-bottle-green'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setActiveTab('notifications')}
            >
              Notifications
            </button>
            <button 
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'privacy'
                  ? 'text-bottle-green border-b-2 border-bottle-green'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy
            </button>
            <button 
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'security'
                  ? 'text-bottle-green border-b-2 border-bottle-green'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          <div className="max-w-2xl">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}