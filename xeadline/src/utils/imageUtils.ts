/**
 * Utility functions for handling images from external sources
 */

import { generateRobohashUrl } from './avatarUtils';

/**
 * Validates an image URL to ensure it's properly formatted
 * @param url The image URL to validate
 * @returns A boolean indicating if the URL is valid
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    // Check if it's a valid URL
    new URL(url);
    
    // Check if it has an image extension or is a data URL
    const isDataUrl = url.startsWith('data:image/');
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/.test(url.toLowerCase());
    
    return isDataUrl || hasImageExtension;
  } catch (e) {
    return false;
  }
}

/**
 * Processes an image URL to ensure it can be used safely
 * @param url The original image URL
 * @param publicKey The user's public key (for fallback)
 * @returns A safe image URL or fallback
 */
export function getSafeImageUrl(url: string | undefined, publicKey: string): string {
  // If no URL is provided, use Robohash
  if (!url) {
    return generateRobohashUrl(publicKey);
  }
  
  // If it's a valid image URL, return it
  if (isValidImageUrl(url)) {
    return url;
  }
  
  // If it's not a valid image URL, use Robohash as fallback
  return generateRobohashUrl(publicKey);
}

/**
 * Handles image loading errors by providing a fallback
 * @param event The error event
 * @param publicKey The user's public key
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  publicKey: string
): void {
  const imgElement = event.currentTarget;
  
  // Set the src to a Robohash fallback
  imgElement.src = generateRobohashUrl(publicKey);
  
  // Add a class to indicate it's a fallback
  imgElement.classList.add('fallback-image');
}

/**
 * Creates an onError handler for image elements
 * @param publicKey The user's public key
 * @returns An onError handler function
 */
export function createImageErrorHandler(publicKey: string) {
  return (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(event, publicKey);
  };
}

/**
 * Future implementation: Proxy an image through our server
 * This would allow us to:
 * 1. Cache images for better performance
 * 2. Resize images for better optimization
 * 3. Validate and sanitize images for security
 * 4. Handle CORS issues
 * 
 * @param url The original image URL
 * @returns A proxied image URL
 */
export function getProxiedImageUrl(url: string): string {
  // This is a placeholder for future implementation
  // For now, just return the original URL
  return url;
  
  // Future implementation example:
  // return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}