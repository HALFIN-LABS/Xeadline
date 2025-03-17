import React, { createContext, useContext, useState, useCallback } from 'react';

interface PasswordModalContextType {
  showPasswordModal: (purpose: string) => Promise<string>;
  isModalVisible: boolean;
  purpose: string;
  dismissModal: () => void;
}

const PasswordModalContext = createContext<PasswordModalContextType | undefined>(undefined);

export function PasswordModalProvider({ children }: { children: React.ReactNode }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [resolvePassword, setResolvePassword] = useState<((password: string) => void) | null>(null);
  const [rejectPassword, setRejectPassword] = useState<((reason: any) => void) | null>(null);
  
  const showPasswordModal = useCallback((purpose: string) => {
    setPurpose(purpose);
    setIsModalVisible(true);
    
    return new Promise<string>((resolve, reject) => {
      setResolvePassword(() => resolve);
      setRejectPassword(() => reject);
    });
  }, []);
  
  const dismissModal = useCallback(() => {
    setIsModalVisible(false);
    if (rejectPassword) {
      rejectPassword('User cancelled password entry');
    }
    setResolvePassword(null);
    setRejectPassword(null);
  }, [rejectPassword]);
  
  const submitPassword = useCallback((password: string) => {
    setIsModalVisible(false);
    if (resolvePassword) {
      resolvePassword(password);
    }
    setResolvePassword(null);
    setRejectPassword(null);
  }, [resolvePassword]);
  
  const contextValue = {
    showPasswordModal,
    isModalVisible,
    purpose,
    dismissModal
  };
  
  return (
    <PasswordModalContext.Provider value={contextValue}>
      {children}
      {isModalVisible && <PasswordModal onSubmit={submitPassword} onCancel={dismissModal} purpose={purpose} />}
    </PasswordModalContext.Provider>
  );
}

export function usePasswordModal() {
  const context = useContext(PasswordModalContext);
  if (context === undefined) {
    throw new Error('usePasswordModal must be used within a PasswordModalProvider');
  }
  return context;
}

// Password Modal Component
function PasswordModal({ 
  onSubmit, 
  onCancel, 
  purpose 
}: { 
  onSubmit: (password: string) => void; 
  onCancel: () => void; 
  purpose: string;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    onSubmit(password);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Enter Password</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Your private key is encrypted. Please enter your password to {purpose}.
        </p>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}