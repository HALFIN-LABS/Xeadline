'use client';

import React, { useState, useEffect } from 'react';

export default function AppearanceSettings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'x-large'>('medium');
  const [compactMode, setCompactMode] = useState<boolean>(false);
  
  // Initialize settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load theme
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
      
      // Load font size
      const savedFontSize = localStorage.getItem('fontSize') as 'small' | 'medium' | 'large' | 'x-large' | null;
      if (savedFontSize) {
        setFontSize(savedFontSize);
        applyFontSize(savedFontSize);
      }
      
      // Load compact mode
      const savedCompactMode = localStorage.getItem('compactMode');
      if (savedCompactMode) {
        const isCompact = savedCompactMode === 'true';
        setCompactMode(isCompact);
        applyCompactMode(isCompact);
      }
      
      // Determine the actual applied theme
      updateCurrentTheme(savedTheme || 'system');
    }
    
    // Log for debugging
    console.log('Theme initialized');
  }, []);
  
  // Function to update the actual theme based on selection
  const updateCurrentTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    let newTheme: 'light' | 'dark';
    
    if (selectedTheme === 'system') {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      newTheme = systemPrefersDark ? 'dark' : 'light';
      console.log('System preference detected:', systemPrefersDark ? 'dark' : 'light');
    } else {
      newTheme = selectedTheme;
    }
    
    console.log('Applying theme:', newTheme);
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to HTML element');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from HTML element');
    }
    
    // Check if the class was actually applied
    const isDarkClassApplied = document.documentElement.classList.contains('dark');
    console.log('Dark class is applied:', isDarkClassApplied);
    
    setCurrentTheme(newTheme);
  };
  
  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    console.log('Theme changed to:', newTheme);
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    updateCurrentTheme(newTheme);
  };
  
  // Apply font size to the document
  const applyFontSize = (size: 'small' | 'medium' | 'large' | 'x-large') => {
    const html = document.documentElement;
    
    // Remove any existing font size classes
    html.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl');
    
    // Add the appropriate class based on the selected size
    switch (size) {
      case 'small':
        html.classList.add('text-sm');
        break;
      case 'medium':
        html.classList.add('text-base');
        break;
      case 'large':
        html.classList.add('text-lg');
        break;
      case 'x-large':
        html.classList.add('text-xl');
        break;
    }
  };
  
  // Handle font size change
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value as 'small' | 'medium' | 'large' | 'x-large';
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
    applyFontSize(newSize);
  };
  
  // Apply compact mode to the document
  const applyCompactMode = (isCompact: boolean) => {
    const html = document.documentElement;
    
    if (isCompact) {
      html.classList.add('compact-mode');
    } else {
      html.classList.remove('compact-mode');
    }
  };
  
  // Handle compact mode toggle
  const handleCompactModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isCompact = e.target.checked;
    setCompactMode(isCompact);
    localStorage.setItem('compactMode', isCompact.toString());
    applyCompactMode(isCompact);
  };
  
  return (
    <div>
      <h2 className="text-lg font-medium mb-6">Appearance Settings</h2>
      
      {/* Theme Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Theme</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Light Theme Option */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer ${
                theme === 'light' 
                  ? 'border-bottle-green ring-2 ring-bottle-green/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleThemeChange('light')}
            >
              <div className="bg-white border border-gray-200 rounded-md p-3 mb-3">
                <div className="w-full h-2 bg-gray-800 rounded mb-2"></div>
                <div className="w-3/4 h-2 bg-gray-400 rounded"></div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Light</div>
              </div>
            </div>
            
            {/* Dark Theme Option */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer ${
                theme === 'dark' 
                  ? 'border-bottle-green ring-2 ring-bottle-green/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="bg-gray-900 border border-gray-700 rounded-md p-3 mb-3">
                <div className="w-full h-2 bg-gray-100 rounded mb-2"></div>
                <div className="w-3/4 h-2 bg-gray-500 rounded"></div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Dark</div>
              </div>
            </div>
            
            {/* System Theme Option */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer ${
                theme === 'system' 
                  ? 'border-bottle-green ring-2 ring-bottle-green/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleThemeChange('system')}
            >
              <div className="bg-gradient-to-r from-white to-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-3">
                <div className="w-full h-2 bg-gradient-to-r from-gray-800 to-gray-100 rounded mb-2"></div>
                <div className="w-3/4 h-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded"></div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">System</div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Current theme: <span className="font-medium">{currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
            {theme === 'system' && ' (based on system preference)'}
          </p>
        </div>
      </div>
      
      {/* Font Size */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Font Size</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="fontSize" className="block text-sm font-medium mb-1">
              Text Size
            </label>
            <select
              id="fontSize"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              value={fontSize}
              onChange={handleFontSizeChange}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="x-large">Extra Large</option>
            </select>
            <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
              Adjust the size of text throughout the application
            </p>
          </div>
        </div>
      </div>
      
      {/* Compact Mode */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Density</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Compact Mode</h4>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Reduce spacing to show more content on screen
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={compactMode}
              onChange={handleCompactModeChange}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bottle-green/20 dark:peer-focus:ring-bottle-green/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-bottle-green"></div>
          </label>
        </div>
      </div>
    </div>
  );
}