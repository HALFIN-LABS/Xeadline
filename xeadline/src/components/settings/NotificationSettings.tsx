'use client';

import React, { useState } from 'react';

export default function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    replies: true,
    mentions: true,
    votes: true,
    directMessages: true,
    communityUpdates: false,
    tips: true
  });
  
  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const handleSaveSettings = () => {
    // In a real implementation, this would save to the user's settings in the backend
    // For now, we'll just show a success message
    alert('Notification settings saved successfully!');
    
    // Save to localStorage for persistence
    localStorage.setItem('notificationSettings', JSON.stringify({
      emailNotifications,
      pushNotifications,
      notificationSettings
    }));
  };
  
  return (
    <div>
      <h2 className="text-lg font-medium mb-6">Notification Settings</h2>
      
      {/* Notification Channels */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Notification Channels</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Email Notifications</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive notifications via email
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={emailNotifications}
                onChange={() => setEmailNotifications(!emailNotifications)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Push Notifications</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive notifications in your browser
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={pushNotifications}
                onChange={() => setPushNotifications(!pushNotifications)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Notification Types */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Notification Types</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Replies</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                When someone replies to your posts or comments
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.replies}
                onChange={() => handleNotificationToggle('replies')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Mentions</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                When someone mentions you in a post or comment
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.mentions}
                onChange={() => handleNotificationToggle('mentions')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Votes</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                When someone upvotes your posts or comments
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.votes}
                onChange={() => handleNotificationToggle('votes')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Direct Messages</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                When you receive a direct message
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.directMessages}
                onChange={() => handleNotificationToggle('directMessages')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Community Updates</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Updates from communities you've joined
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.communityUpdates}
                onChange={() => handleNotificationToggle('communityUpdates')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Tips</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                When you receive a Lightning tip
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.tips}
                onChange={() => handleNotificationToggle('tips')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button 
          className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors"
          onClick={handleSaveSettings}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}