'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  
  // Only show right sidebar on topic pages
  const showRightSidebar = pathname?.startsWith('/topic/') || false
  
  // Close sidebar when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">
              <Sidebar />
            </div>
          </>
        )}
        
        {/* Main Content */}
        <main className={`flex-1 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-3.5rem)] ${showRightSidebar ? '' : 'container mx-auto'}`}>
          <div className="px-4 py-6">
            {children}
          </div>
        </main>
        
        {/* Right Sidebar - only shown on topic pages */}
        {showRightSidebar && <RightSidebar />}
      </div>
    </div>
  )
}