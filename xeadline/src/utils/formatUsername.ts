/**
 * Utility function to format a username for display
 * 
 * If a NIP-05 identifier is available and verified, it will be used
 * Otherwise, the public key will be truncated and displayed
 */

export function formatUsername(pubkey: string, nip05?: string, isVerified?: boolean): string {
  // If NIP-05 is available and verified, use it
  if (nip05 && isVerified) {
    return nip05;
  }
  
  // Otherwise, truncate the public key
  return `${pubkey.substring(0, 8)}...`;
}