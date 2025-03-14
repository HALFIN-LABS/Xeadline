/**
 * Encryption utilities for securely storing private keys
 * 
 * This module provides functions for encrypting and decrypting sensitive data
 * like Nostr private keys before storing them in localStorage.
 */

// Use the Web Crypto API for secure encryption
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Derives a key from a password using PBKDF2
 * 
 * @param password - The user's password
 * @param salt - Salt for key derivation
 * @returns A CryptoKey that can be used for encryption/decryption
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBuffer = encoder.encode(password);
  
  // Import the password as a key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Derive a key using PBKDF2
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using AES-GCM
 * 
 * @param data - The data to encrypt (e.g., a private key)
 * @param password - The password to encrypt with
 * @returns The encrypted data as a base64 string, with salt and IV included
 */
export async function encrypt(data: string, password: string): Promise<string> {
  // Generate a random salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  
  // Generate a random IV (Initialization Vector)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Derive a key from the password
  const key = await deriveKey(password, salt);
  
  // Encrypt the data
  const dataBuffer = encoder.encode(data);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    dataBuffer
  );
  
  // Combine salt, IV, and encrypted data
  const result = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
  
  // Convert to base64 for storage
  return btoa(Array.from(result).map(byte => String.fromCharCode(byte)).join(''));
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 * 
 * @param encryptedData - The encrypted data as a base64 string
 * @param password - The password used for encryption
 * @returns The decrypted data
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  try {
    // Convert from base64
    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract salt, IV, and encrypted data
    const salt = encryptedBytes.slice(0, 16);
    const iv = encryptedBytes.slice(16, 28);
    const data = encryptedBytes.slice(28);
    
    // Derive the key from the password
    const key = await deriveKey(password, salt);
    
    // Decrypt the data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      data
    );
    
    // Convert the decrypted data to a string
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('Decryption failed. Incorrect password or corrupted data.');
  }
}

/**
 * Validates a password against encrypted data
 * 
 * @param encryptedData - The encrypted data
 * @param password - The password to validate
 * @returns True if the password can decrypt the data, false otherwise
 */
export async function validatePassword(encryptedData: string, password: string): Promise<boolean> {
  try {
    await decrypt(encryptedData, password);
    return true;
  } catch (error) {
    return false;
  }
}