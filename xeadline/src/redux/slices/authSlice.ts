import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

export interface NostrKey {
  publicKey: string;
  privateKey?: string; // Optional because it might not be available (e.g., when using extension)
  encryptedPrivateKey?: string; // Encrypted version for storage
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: NostrKey | null;
  isExtensionAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  keyJustGenerated: boolean; // Track if a key was just generated
}

const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  isExtensionAvailable: false,
  isLoading: false,
  error: null,
  keyJustGenerated: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<NostrKey>) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.error = null;
      state.keyJustGenerated = false;
    },
    setExtensionAvailable: (state, action: PayloadAction<boolean>) => {
      state.isExtensionAvailable = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setKeyJustGenerated: (state, action: PayloadAction<boolean>) => {
      state.keyJustGenerated = action.payload;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  setExtensionAvailable,
  clearError,
  setKeyJustGenerated,
} = authSlice.actions;

// Selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectCurrentUser = (state: RootState) => state.auth.currentUser;
export const selectIsExtensionAvailable = (state: RootState) => state.auth.isExtensionAvailable;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectKeyJustGenerated = (state: RootState) => state.auth.keyJustGenerated;

export default authSlice.reducer;