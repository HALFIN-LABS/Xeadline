'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { generateKeyAndLogin } from '../../services/authService';
import { 
  selectIsAuthenticated, 
  selectAuthLoading, 
  selectAuthError,
  clearError
} from '../../redux/slices/authSlice';

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);
  
  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
    
    // Clear password error when inputs change
    if (passwordError) {
      setPasswordError('');
    }
  }, [password, confirmPassword, dispatch, error, passwordError]);
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    // Generate key and login
    await generateKeyAndLogin(password, dispatch);
  };
  
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create your Xeadline account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link href="/login" className="font-medium text-bottle-green hover:text-bottle-green-700">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        {/* Error messages */}
        {(error || passwordError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 text-sm text-red-600 dark:text-red-400">
            {error || passwordError}
          </div>
        )}
        
        {/* Information box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">About Nostr Keys</h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
            <p>
              Xeadline uses Nostr keys for authentication. We'll generate a secure key pair for you.
            </p>
            <p className="mt-1">
              Your private key will be encrypted with your password and stored locally. We never have access to your private key.
            </p>
            <p className="mt-1 font-medium">
              Make sure to remember your password! If you forget it, you'll lose access to your account.
            </p>
          </div>
        </div>
        
        {/* Signup form */}
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 8 characters long.
              </p>
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-md bg-bottle-green py-2 px-3 text-sm font-semibold text-white hover:bg-bottle-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle-green disabled:opacity-70"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </div>
        </form>
        
        {/* Advanced options */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">
                Advanced options
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm font-medium text-bottle-green hover:text-bottle-green-700">
              Already have a Nostr key? Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}