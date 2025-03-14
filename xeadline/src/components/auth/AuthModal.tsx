'use client';

import React, { useState, useEffect } from 'react';
import KeyBackup from './KeyBackup';
import Modal from '../ui/Modal';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  selectAuthLoading,
  selectAuthError,
  selectKeyJustGenerated,
  clearError,
  setKeyJustGenerated
} from '../../redux/slices/authSlice';
import { 
  loginWithPrivateKey, 
  loginWithStoredKey, 
  loginWithExtension,
  generateKeyAndLogin
} from '../../services/authService';

export enum AuthMode {
  LOGIN = 'login',
  SIGNUP = 'signup'
}

enum LoginMethod {
  PRIVATE_KEY = 'privateKey',
  STORED_KEY = 'storedKey',
  EXTENSION = 'extension',
  NSEC = 'nsec'
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, initialMode = AuthMode.LOGIN }: AuthModalProps) {
  const dispatch = useAppDispatch();
  
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const keyJustGenerated = useAppSelector(selectKeyJustGenerated);
  
  // Initialize mode state with initialMode prop
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  // Update mode when initialMode prop changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(LoginMethod.PRIVATE_KEY);
  
  // Form state
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showNsecKey, setShowNsecKey] = useState(false);
  const [showStoredPassword, setShowStoredPassword] = useState(false);
  
  // Reset form when modal closes
  const handleClose = () => {
    setPrivateKey('');
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
    dispatch(clearError());
    
    // Reset the keyJustGenerated flag when the modal is closed
    if (keyJustGenerated) {
      dispatch(setKeyJustGenerated(false));
    }
    
    onClose();
  };
  
  // Switch between login and signup modes
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setPasswordError('');
    dispatch(clearError());
  };
  
  // Handle login form submission
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
    
    // Close modal on successful login (will be handled by the Header component)
  };
  
  // Handle signup form submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous error
    setPasswordError('');
    
    // Validate passwords
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      // Generate key and login - this will set keyJustGenerated to true
      await generateKeyAndLogin(password, dispatch);
    } catch (err) {
      console.error('Signup failed:', err);
    }
  };
  
  // Login form footer
  const loginFooter = (
    <div className="flex flex-col space-y-3">
      <button
        type="submit"
        form="login-form"
        disabled={isLoading}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green disabled:opacity-70"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
      
      <div className="text-sm text-center">
        <span className="text-gray-500 dark:text-gray-400">Don't have an account? </span>
        <button
          type="button"
          onClick={() => switchMode(AuthMode.SIGNUP)}
          className="font-medium text-bottle-green hover:text-bottle-green-700"
        >
          Create one
        </button>
      </div>
    </div>
  );

  // Signup form footer
  const signupFooter = (
    <div className="flex flex-col space-y-3">
      <button
        type="submit"
        form="signup-form"
        disabled={isLoading}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green disabled:opacity-70"
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>
      
      <div className="text-sm text-center">
        <span className="text-gray-500 dark:text-gray-400">Already have an account? </span>
        <button
          type="button"
          onClick={() => switchMode(AuthMode.LOGIN)}
          className="font-medium text-bottle-green hover:text-bottle-green-700"
        >
          Sign in
        </button>
      </div>
    </div>
  );

  // Key backup footer
  const keyBackupFooter = (
    <button
      type="button"
      onClick={handleClose}
      className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bottle-green hover:bg-bottle-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottle-green"
    >
      Continue to Xeadline
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === AuthMode.LOGIN ? 'Sign in to Xeadline' : 'Create your Xeadline account'}
      footer={mode === AuthMode.LOGIN ? loginFooter : (keyJustGenerated ? keyBackupFooter : signupFooter)}
    >
      {/* Error messages */}
      {(error || passwordError) && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-600 dark:text-red-400">
          {error || passwordError}
        </div>
      )}
      
      {mode === AuthMode.LOGIN ? (
        <>
          {/* Login form */}
          <form id="login-form" onSubmit={handleLogin} className="space-y-4">
            {/* Login method tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                type="button"
                className={`py-2 px-3 text-sm font-medium ${
                  loginMethod === LoginMethod.PRIVATE_KEY
                    ? 'border-b-2 border-bottle-green text-bottle-green'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setLoginMethod(LoginMethod.PRIVATE_KEY)}
              >
                Private Key
              </button>
              <button
                type="button"
                className={`py-2 px-3 text-sm font-medium ${
                  loginMethod === LoginMethod.NSEC
                    ? 'border-b-2 border-bottle-green text-bottle-green'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setLoginMethod(LoginMethod.NSEC)}
              >
                nsec Key
              </button>
              <button
                type="button"
                className={`py-2 px-3 text-sm font-medium ${
                  loginMethod === LoginMethod.STORED_KEY
                    ? 'border-b-2 border-bottle-green text-bottle-green'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setLoginMethod(LoginMethod.STORED_KEY)}
              >
                Saved Key
              </button>
              <button
                type="button"
                className={`py-2 px-3 text-sm font-medium ${
                  loginMethod === LoginMethod.EXTENSION
                    ? 'border-b-2 border-bottle-green text-bottle-green'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setLoginMethod(LoginMethod.EXTENSION)}
              >
                Extension
              </button>
            </div>
            
            {/* Private key login */}
            {loginMethod === LoginMethod.PRIVATE_KEY && (
              <>
                <div>
                  <label htmlFor="private-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Private Key (hex format)
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="private-key"
                      name="privateKey"
                      type={showPrivateKey ? "text" : "password"}
                      autoComplete="off"
                      required
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your private key is never sent to our servers.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password (for local encryption)
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
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
              </>
            )}
            
            {/* NSEC key login */}
            {loginMethod === LoginMethod.NSEC && (
              <>
                <div>
                  <label htmlFor="nsec-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    nsec Key
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="nsec-key"
                      name="nsecKey"
                      type={showNsecKey ? "text" : "password"}
                      autoComplete="off"
                      required
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3 pr-10"
                      placeholder="nsec1..."
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={() => setShowNsecKey(!showNsecKey)}
                    >
                      {showNsecKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your nsec key is never sent to our servers.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="nsec-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password (for local encryption)
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="nsec-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
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
              </>
            )}
            
            {/* Stored key login */}
            {loginMethod === LoginMethod.STORED_KEY && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Login with your previously saved key.
                </p>
                
                <div>
                  <label htmlFor="stored-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="stored-password"
                      name="password"
                      type={showStoredPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={() => setShowStoredPassword(!showStoredPassword)}
                    >
                      {showStoredPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* Extension login */}
            {loginMethod === LoginMethod.EXTENSION && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Login using your Nostr extension (nos2x, Alby, etc.). This is the most secure way to use Xeadline.
                </p>
              </div>
            )}
            
            {/* Buttons moved to footer */}
          </form>
        </>
      ) : (
        <>
          {keyJustGenerated ? (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mb-4">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Account Created Successfully!</h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  Your account has been created and you're now logged in. Please backup your private key to ensure you don't lose access to your account.
                </p>
              </div>
              
              <KeyBackup password={password} />
              
              {/* Button moved to footer */}
            </div>
          ) : (
            /* Signup form */
            <form id="signup-form" onSubmit={handleSignup} className="space-y-4">
              {/* Information box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">About Nostr Keys</h3>
                <div className="mt-1 text-sm text-blue-700 dark:text-blue-400">
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
              
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      const newPassword = e.target.value;
                      setPassword(newPassword);
                      
                      // Clear password error if passwords now match
                      if (newPassword === confirmPassword) {
                        setPasswordError('');
                      }
                    }}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 8 characters long.
                </p>
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      const newConfirmPassword = e.target.value;
                      setConfirmPassword(newConfirmPassword);
                      
                      // Clear password error if passwords now match
                      if (password === newConfirmPassword) {
                        setPasswordError('');
                      }
                    }}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-bottle-green focus:ring-bottle-green text-base py-2 px-3 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Buttons moved to footer */}
            </form>
          )}
        </>
      )}
    </Modal>
  );
}