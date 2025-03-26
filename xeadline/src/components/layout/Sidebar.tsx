'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <aside className="w-64 hidden md:block flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto py-4 bg-gray-50 dark:bg-[rgb(10,10,10)] border-r border-gray-200 dark:border-gray-800">
      <div className="px-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Feeds</h2>
          <nav className="space-y-1">
            <SidebarLink href="/" icon={<HomeIcon />} active={pathname === '/'}>
              Home
            </SidebarLink>
            <SidebarLink href="/popular" icon={<TrendingIcon />} active={pathname === '/popular'}>
              Popular
            </SidebarLink>
            <SidebarLink href="/all" icon={<GlobeIcon />} active={pathname === '/all'}>
              All
            </SidebarLink>
            <SidebarLink href="/t/discover" icon={<TopicsIcon />} active={pathname === '/t/discover'}>
              Topics
            </SidebarLink>
          </nav>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Featured</h2>
          <nav className="space-y-1">
            <SidebarLink href="/t/news" icon={<NewsIcon />} active={pathname === '/t/news'}>
              News
            </SidebarLink>
            <SidebarLink href="/t/xeadspace" icon={<XeadspaceIcon />} active={pathname === '/t/xeadspace'}>
              Xeadspace
            </SidebarLink>
            <SidebarLink href="/t/technology" icon={<DeviceIcon />} active={pathname === '/t/technology'}>
              Technology
            </SidebarLink>
            <SidebarLink href="/t/bitcoin" icon={<BitcoinIcon />} active={pathname === '/t/bitcoin'}>
              Bitcoin
            </SidebarLink>
            <SidebarLink href="/t/lightning" icon={<LightningIcon />} active={pathname === '/t/lightning'}>
              Lightning
            </SidebarLink>
            <SidebarLink href="/t/nostr" icon={<NostrIcon />} active={pathname === '/t/nostr'}>
              Nostr
            </SidebarLink>
          </nav>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Other</h2>
          <nav className="space-y-1">
            <SidebarLink href="/settings" icon={<SettingsIcon />} active={pathname === '/settings'}>
              Settings
            </SidebarLink>
            <SidebarLink href="/help" icon={<HelpIcon />} active={pathname === '/help'}>
              Help
            </SidebarLink>
          </nav>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p className="mb-2">© 2025 Xeadspace</p>
            <div className="flex flex-wrap gap-x-2 gap-y-1 mb-2">
              <Link href="/help" className="hover:underline">Help</Link>
              <Link href="/about" className="hover:underline">About</Link>
              <Link href="/terms" className="hover:underline">Terms</Link>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <Link href="/press" className="hover:underline">Press</Link>
              <Link href="/content-policy" className="hover:underline">Content Policy</Link>
              <Link href="/cookies" className="hover:underline">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ 
  href, 
  icon, 
  active, 
  children 
}: { 
  href: string; 
  icon: React.ReactNode; 
  active: boolean; 
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
        active
          ? 'bg-bottle-green-50 text-bottle-green dark:bg-bottle-green-900 dark:text-bottle-green-300'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      }`}
    >
      <span className="mr-3">{icon}</span>
      {children}
    </Link>
  );
}

// Icon components
function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function TopicsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function BitcoinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function NostrIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XeadspaceIcon() {
  return (
    <img
      src="/xeadspace-icon.svg"
      alt="Xeadspace"
      className="h-5 w-5"
      style={{ filter: 'brightness(0) invert(var(--sidebar-icon-invert, 0))' }}
    />
  );
}