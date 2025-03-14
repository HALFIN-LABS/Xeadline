/**
 * Utility functions for handling user avatars
 */

/**
 * Generates a Robohash URL for a given public key
 * @param publicKey The user's public key
 * @param size The size of the avatar in pixels
 * @param set The Robohash set to use (1: robots, 2: monsters, 3: heads, 4: cats, 5: humans)
 * @returns A URL to a Robohash avatar
 */
export function generateRobohashUrl(
  publicKey: string,
  size: number = 200,
  set: 1 | 2 | 3 | 4 | 5 = 1
): string {
  // Ensure we have a valid public key
  if (!publicKey) {
    // Use a placeholder if no public key is provided
    return `https://robohash.org/xeadline.png?size=${size}x${size}&set=set${set}`;
  }
  
  // Use the public key to generate a consistent avatar
  // We can use the full key or a portion of it
  return `https://robohash.org/${publicKey}.png?size=${size}x${size}&set=set${set}`;
}

/**
 * Determines if a user has a custom profile picture
 * @param profilePicture The user's profile picture URL
 * @returns True if the user has a custom profile picture, false otherwise
 */
export function hasCustomProfilePicture(profilePicture?: string): boolean {
  // Check if the profile picture exists and is not a Robohash URL
  return !!profilePicture && !profilePicture.includes('robohash.org');
}

/**
 * Gets the appropriate avatar URL for a user
 * @param publicKey The user's public key
 * @param profilePicture The user's custom profile picture URL (if any)
 * @param size The size of the avatar in pixels
 * @returns The URL to use for the user's avatar
 */
export function getAvatarUrl(
  publicKey: string,
  profilePicture?: string,
  size: number = 200
): string {
  // If the user has a custom profile picture, use it
  if (hasCustomProfilePicture(profilePicture)) {
    return profilePicture as string;
  }
  
  // Otherwise, generate a Robohash URL
  return generateRobohashUrl(publicKey, size);
}