'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  selectIsAuthenticated,
  selectCurrentUser,
  selectKeyJustGenerated
} from '../../redux/slices/authSlice';
import { selectCurrentProfile } from '../../redux/slices/profileSlice';
import { logoutUser } from '../../services/authService';
import AuthModal, { AuthMode } from '../auth/AuthModal';
import { generateRobohashUrl } from '../../utils/avatarUtils';
import { getSafeImageUrl, createImageErrorHandler } from '../../utils/imageUtils';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>(AuthMode.LOGIN);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);
  const currentProfile = useAppSelector(selectCurrentProfile);
  const keyJustGenerated = useAppSelector(selectKeyJustGenerated);

  useEffect(() => {
    if (isAuthenticated && !keyJustGenerated) {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, keyJustGenerated]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);
  
  const handleLogout = () => {
    logoutUser(dispatch, true);
    setShowUserMenu(false);
    router.push('/');
  };
  
  const openAuthModal = (mode: AuthMode) => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-50 dark:bg-[rgb(10,10,10)] border-b border-gray-200 dark:border-gray-800">
      <div className="h-14 flex items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center px-4">
          <div className="h-8 w-8 relative mr-2 flex-shrink-0 bg-bottle-green rounded-full flex items-center justify-center">
            <Image
              src="/xeadline-icon.svg"
              alt="Xeadline"
              width={20}
              height={20}
              className="h-5 w-5"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <span className="text-xl font-bold text-white hidden sm:block" style={{ fontFamily: 'var(--font-roboto)' }}>Xeadline</span>
        </Link>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Spacer to push search bar to the right */}
        <div className="flex-1 md:flex-none md:w-32"></div>
        
        {/* Search bar - right aligned to match content */}
        <div className="flex-1 flex justify-end max-w-3xl mx-auto px-4">
          <div className={`w-full max-w-xl relative rounded-full ${isSearchFocused ? 'ring-2 ring-bottle-green' : ''}`}>
            <input
              type="text"
              placeholder="Search Xeadline"
              className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* User actions */}
        <div className="flex items-center space-x-2 px-4">
          {isAuthenticated ? (
            <div className="relative">
              <button
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                onClick={toggleUserMenu}
                aria-label="User menu"
              >
                {currentUser?.publicKey ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={currentProfile?.picture
                        ? getSafeImageUrl(currentProfile.picture, currentUser.publicKey)
                        : generateRobohashUrl(currentUser.publicKey, 32)}
                      alt="User avatar"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      priority
                      onError={createImageErrorHandler(currentUser.publicKey)}
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 bg-bottle-green rounded-full flex items-center justify-center text-white text-xs font-bold">
                    U
                  </div>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                  <Link
                    href={`/profile/${currentUser?.publicKey}`}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Settings
                  </Link>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => openAuthModal(AuthMode.SIGNUP)}
                className="tab tab-selected hidden sm:block"
              >
                Sign Up
              </button>
              <button
                onClick={() => openAuthModal(AuthMode.LOGIN)}
                className="tab tab-unselected hidden sm:block"
              >
                Log In
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu - visible when menu is open */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-50 dark:bg-[rgb(10,10,10)] border-b border-gray-200 dark:border-gray-800">
          <div className="px-4 py-2">
            <nav className="flex flex-col space-y-2">
              {/* Feeds */}
              <div className="mb-2">
                <MobileNavLink href="/" active={pathname === '/'}>Home</MobileNavLink>
                <MobileNavLink href="/popular" active={pathname === '/popular'}>Popular</MobileNavLink>
                <MobileNavLink href="/all" active={pathname === '/all'}>All</MobileNavLink>
              </div>

              {/* Topics */}
              <div className="mb-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <MobileNavLink href="/topic/news" active={pathname === '/topic/news'}>News</MobileNavLink>
                <MobileNavLink href="/topic/technology" active={pathname === '/topic/technology'}>Technology</MobileNavLink>
                <MobileNavLink href="/topic/bitcoin" active={pathname === '/topic/bitcoin'}>Bitcoin</MobileNavLink>
                <MobileNavLink href="/topic/lightning" active={pathname === '/topic/lightning'}>Lightning</MobileNavLink>
                <MobileNavLink href="/topic/nostr" active={pathname === '/topic/nostr'}>Nostr</MobileNavLink>
              </div>

              {/* Auth buttons */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex space-x-2">
                {isAuthenticated ? (
                  <button
                    className="tab tab-unselected flex-1"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => openAuthModal(AuthMode.SIGNUP)}
                      className="tab tab-selected flex-1"
                    >
                      Sign Up
                    </button>
                    <button
                      onClick={() => openAuthModal(AuthMode.LOGIN)}
                      className="tab tab-unselected flex-1"
                    >
                      Log In
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
      
      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
    </header>
  );
}

// Navigation link component for mobile
function MobileNavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`px-3 py-2 rounded-md text-base font-medium ${
        active 
          ? 'bg-bottle-green-50 text-bottle-green dark:bg-bottle-green-900 dark:text-bottle-green-300' 
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}