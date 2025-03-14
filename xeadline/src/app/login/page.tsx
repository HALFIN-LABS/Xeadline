'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { 
  loginWithPrivateKey, 
  loginWithStoredKey, 
  loginWithExtension 
} from '../../services/authService';
import { 
  selectIsAuthenticated, 
  selectAuthLoading, 
  selectAuthError,
  selectIsExtensionAvailable,
  clearError
} from '../../redux/slices/authSlice';

enum LoginMethod {
  PRIVATE_KEY = 'privateKey',
  STORED_KEY = 'storedKey',
  EXTENSION = 'extension',
  NSEC = 'nsec'
}

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isExtensionAvailable = useAppSelector(selectIsExtensionAvailable);
  
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    isExtensionAvailable ? LoginMethod.EXTENSION : LoginMethod.PRIVATE_KEY
  );
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);
  
  // Clear error when changing login method
  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [loginMethod, dispatch, error]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    switch (loginMethod) {
      case LoginMethod.PRIVATE_KEY:
        await loginWithPrivateKey(privateKey, password, rememberMe, dispatch);
        break;
      case LoginMethod.STORED_KEY:
        await loginWithStoredKey(password, dispatch);
        break;
      case LoginMethod.EXTENSION:
        await loginWithExtension(dispatch);
        break;
      case LoginMethod.NSEC:
        // NSEC is just a different format of private key
        await loginWithPrivateKey(privateKey, password, rememberMe, dispatch);
        break;
    }
  };
  
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sign in to Xeadline
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link href="/signup" className="font-medium text-bottle-green hover:text-bottle-green-700">
              create a new account
            </Link>
          </p>
        </div>
        
        {/* Login method tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {isExtensionAvailable && (
            <button
              className={`py-2 px-4 text-sm font-medium ${
                loginMethod === LoginMethod.EXTENSION
                  ? 'border-b-2 border-bottle-green text-bottle-green'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setLoginMethod(LoginMethod.EXTENSION)}
            >
              Nostr Extension
            </button>
          )}
          <button
            className={`py-2 px-4 text-sm font-medium ${
              loginMethod === LoginMethod.PRIVATE_KEY
                ? 'border-b-2 border-bottle-green text-bottle-green'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setLoginMethod(LoginMethod.PRIVATE_KEY)}
          >
            Private Key
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              loginMethod === LoginMethod.NSEC
                ? 'border-b-2 border-bottle-green text-bottle-green'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setLoginMethod(LoginMethod.NSEC)}
          >
            nsec Key
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              loginMethod === LoginMethod.STORED_KEY
                ? 'border-b-2 border-bottle-green text-bottle-green'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setLoginMethod(LoginMethod.STORED_KEY)}
          >
            Saved Key
          </button>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        {/* Login form */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {/* Extension login */}
          {loginMethod === LoginMethod.EXTENSION && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Login using your Nostr extension (nos2x, Alby, etc.). This is the most secure way to use Xeadline.
              </p>
              <div className="flex items-center justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full justify-center rounded-md bg-bottle-green py-2 px-3 text-sm font-semibold text-white hover:bg-bottle-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle-green disabled:opacity-70"
                >
                  {isLoading ? 'Connecting...' : 'Connect with Extension'}
                </button>
              </div>
            </div>
          )}
          
          {/* Private key login */}
          {loginMethod === LoginMethod.PRIVATE_KEY && (
            <div className="space-y-4">
              <div>
                <label htmlFor="private-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Private Key (hex format)
                </label>
                <div className="mt-1">
                  <input
                    id="private-key"
                    name="privateKey"
                    type="password"
                    autoComplete="off"
                    required
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green sm:text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your private key is never sent to our servers and is only stored locally if you choose &quot;Remember me&quot;.
                </p>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password (for local encryption)
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-bottle-green focus:ring-bottle-green"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Remember me
                  </label>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full justify-center rounded-md bg-bottle-green py-2 px-3 text-sm font-semibold text-white hover:bg-bottle-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle-green disabled:opacity-70"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </div>
          )}
          
          {/* NSEC key login */}
          {loginMethod === LoginMethod.NSEC && (
            <div className="space-y-4">
              <div>
                <label htmlFor="nsec-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  nsec Key
                </label>
                <div className="mt-1">
                  <input
                    id="nsec-key"
                    name="nsecKey"
                    type="password"
                    autoComplete="off"
                    required
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green sm:text-sm"
                    placeholder="nsec1..."
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your nsec key is never sent to our servers and is only stored locally if you choose &quot;Remember me&quot;.
                </p>
              </div>
              
              <div>
                <label htmlFor="nsec-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password (for local encryption)
                </label>
                <div className="mt-1">
                  <input
                    id="nsec-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="nsec-remember-me"
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-bottle-green focus:ring-bottle-green"
                  />
                  <label htmlFor="nsec-remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Remember me
                  </label>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full justify-center rounded-md bg-bottle-green py-2 px-3 text-sm font-semibold text-white hover:bg-bottle-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle-green disabled:opacity-70"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </div>
          )}
          
          {/* Stored key login */}
          {loginMethod === LoginMethod.STORED_KEY && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Login with your previously saved key.
              </p>
              
              <div>
                <label htmlFor="stored-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="stored-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}