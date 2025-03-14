'use client';

import React, { useState } from 'react';

export default function PrivacySettings() {
  const [contentFiltering, setContentFiltering] = useState({
    nsfw: true,
    violence: true,
    politics: false,
    controversial: false
  });
  
  const [dataSettings, setDataSettings] = useState({
    allowAnalytics: true,
    shareActivity: true,
    publicProfile: true
  });
  
  const handleContentFilterToggle = (key: keyof typeof contentFiltering) => {
    setContentFiltering(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const handleDataSettingToggle = (key: keyof typeof dataSettings) => {
    setDataSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const handleSaveSettings = () => {
    // In a real implementation, this would save to the user's settings in the backend
    // For now, we'll just show a success message
    alert('Privacy settings saved successfully!');
    
    // Save to localStorage for persistence
    localStorage.setItem('privacySettings', JSON.stringify({
      contentFiltering,
      dataSettings
    }));
  };
  
  return (
    <div>
      <h2 className="text-lg font-medium mb-6">Privacy Settings</h2>
      
      {/* Content Filtering */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Content Filtering</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">NSFW Content</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Filter out adult or explicit content
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={contentFiltering.nsfw}
                onChange={() => handleContentFilterToggle('nsfw')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Violence</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Filter out violent or graphic content
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={contentFiltering.violence}
                onChange={() => handleContentFilterToggle('violence')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Political Content</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Filter out political discussions and content
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={contentFiltering.politics}
                onChange={() => handleContentFilterToggle('politics')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Controversial Topics</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Filter out potentially controversial or divisive content
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={contentFiltering.controversial}
                onChange={() => handleContentFilterToggle('controversial')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Data Privacy */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Data Privacy</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Usage Analytics</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow anonymous usage data collection to improve the platform
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={dataSettings.allowAnalytics}
                onChange={() => handleDataSettingToggle('allowAnalytics')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Activity Visibility</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow others to see your activity (posts, comments, votes)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={dataSettings.shareActivity}
                onChange={() => handleDataSettingToggle('shareActivity')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Public Profile</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Make your profile visible to non-logged-in users
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={dataSettings.publicProfile}
                onChange={() => handleDataSettingToggle('publicProfile')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Blocked Users */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Blocked Users</h3>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You haven't blocked any users yet
            </p>
          </div>
          
          <div className="p-4">
            <button className="text-sm text-bottle-green hover:underline">
              Manage Blocked Users
            </button>
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