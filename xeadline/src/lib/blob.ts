/**
 * Utility functions for file storage using the Storage Service via API
 */
import { uploadFileDirect } from './clientUpload';
import { uploadFileInChunks } from './chunkedUpload';
import { uploadDirectToBlob } from './directUpload';

/**
 * Media types supported by the application
 */
export type MediaType = 'image' | 'video' | 'gif' | 'embed';

/**
 * Media file types for upload
 */
export type FileType = 'icon' | 'banner' | 'post' | 'comment';

/**
 * Uploads a file to storage via the server-side API
 * @param file The file to upload
 * @param fileType The type of file (icon, banner, post, comment)
 * @param mediaType The type of media (image, video, gif)
 * @param topicId Optional topic ID
 * @param postId Optional post ID
 * @returns The URL of the uploaded file
 */
/**
 * Event emitter for upload progress
 */
type ProgressCallback = (progress: number) => void;
const progressCallbacks = new Map<string, ProgressCallback>();

/**
 * Register a callback for upload progress
 * @param id Unique identifier for the upload
 * @param callback Function to call with progress updates
 */
export function registerProgressCallback(id: string, callback: ProgressCallback): void {
  progressCallbacks.set(id, callback);
}

/**
 * Unregister a progress callback
 * @param id Unique identifier for the upload
 */
export function unregisterProgressCallback(id: string): void {
  progressCallbacks.delete(id);
}

/**
 * Update progress for an upload
 * @param id Unique identifier for the upload
 * @param progress Progress value (0-100)
 */
function updateProgress(id: string, progress: number): void {
  const callback = progressCallbacks.get(id);
  if (callback) {
    callback(progress);
  }
}

export async function uploadToBlob(
  file: File,
  fileType: FileType,
  mediaType: 'image' | 'video' | 'gif',
  topicId?: string,
  postId?: string,
  uploadId?: string
): Promise<string> {
  try {
    console.log(`Starting upload for ${mediaType} ${fileType}${topicId ? ` for topic ${topicId}` : ''}${postId ? ` for post ${postId}` : ''}`);
    
    // Generate a unique upload ID if not provided
    const uniqueUploadId = uploadId || `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Validate file type based on media type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    
    let validTypes: string[] = [];
    let maxSize = 0;
    
    switch (mediaType) {
      case 'image':
        validTypes = validImageTypes;
        maxSize = 10 * 1024 * 1024; // 10MB
        break;
      case 'video':
        validTypes = validVideoTypes;
        maxSize = 150 * 1024 * 1024; // 150MB
        break;
      case 'gif':
        validTypes = ['image/gif'];
        maxSize = 10 * 1024 * 1024; // 10MB
        break;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
    
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      throw new Error(`Invalid file type for ${mediaType}. Allowed types: ${validTypes.join(', ')}`);
    }
    
    // Validate file size
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      throw new Error(`File too large. Maximum size for ${mediaType} is ${maxSize / (1024 * 1024)}MB.`);
    }
    
    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() ||
      (mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'gif');
    const fileName = `${fileType}-${mediaType}${topicId ? `-${topicId}` : ''}${postId ? `-${postId}` : ''}-${timestamp}.${fileExtension}`;
    
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // For images, use the new direct upload method to avoid timeouts
    if (mediaType === 'image') {
      try {
        console.log('Using direct client-side upload for image');
        
        // Set up progress tracking
        const onProgress = (progress: number) => {
          updateProgress(uniqueUploadId, progress);
        };
        
        // Use the direct upload method
        const url = await uploadFileDirect(
          file,
          fileType,
          mediaType,
          topicId || 'default',
          postId || 'new-post',
          onProgress
        );
        
        console.log('Direct upload successful, URL:', url);
        return url;
      } catch (directUploadError) {
        console.error('Error during direct upload:', directUploadError);
        throw new Error(`Upload error: ${directUploadError instanceof Error ? directUploadError.message : 'Unknown error'}`);
      }
    }
    
    // For videos, try direct upload first, then fall back to chunked uploads
    if (mediaType === 'video') {
      console.log('Using direct upload for video file');
      
      try {
        // Set up progress tracking
        const onProgress = (progress: number) => {
          updateProgress(uniqueUploadId, progress);
        };
        
        // First try the new direct upload method for best performance
        try {
          console.log('Attempting direct upload to Vercel Blob');
          const url = await uploadDirectToBlob(
            file,
            fileType,
            mediaType,
            topicId || 'default',
            postId || 'new-post',
            onProgress
          );
          
          console.log('Direct upload successful, URL:', url);
          return url;
        } catch (directUploadError) {
          console.error('Error during direct upload:', directUploadError);
          console.log('Falling back to chunked upload method');
          
          // Determine chunk size based on file size
          // Larger files get larger chunks to reduce the number of requests
          let chunkSize = 2 * 1024 * 1024; // 2MB default (increased from 1MB)
          
          if (file.size > 100 * 1024 * 1024) {
            chunkSize = 8 * 1024 * 1024; // 8MB for files > 100MB
          } else if (file.size > 50 * 1024 * 1024) {
            chunkSize = 5 * 1024 * 1024; // 5MB for files > 50MB
          } else if (file.size > 20 * 1024 * 1024) {
            chunkSize = 3 * 1024 * 1024; // 3MB for files > 20MB
          }
          
          console.log(`Using chunk size of ${chunkSize / (1024 * 1024)}MB for ${file.size / (1024 * 1024)}MB file`);
          
          // Use the chunked upload method
          const url = await uploadFileInChunks(
            file,
            fileType,
            mediaType,
            topicId || 'default',
            postId || 'new-post',
            onProgress
          );
          
          console.log('Chunked upload successful, URL:', url);
          return url;
        }
      } catch (allUploadsError) {
        console.error('All upload methods failed:', allUploadsError);
        
        // Last resort: try the legacy direct upload method
        console.log('Trying legacy direct upload as last resort');
        
        try {
          // Set up progress tracking
          const onProgress = (progress: number) => {
            updateProgress(uniqueUploadId, progress);
          };
          
          // Use the legacy direct upload method as fallback
          const url = await uploadFileDirect(
            file,
            fileType,
            mediaType,
            topicId || 'default',
            postId || 'new-post',
            onProgress
          );
          
          console.log('Legacy fallback upload successful, URL:', url);
          return url;
        } catch (fallbackError) {
          console.error('Error during legacy fallback upload:', fallbackError);
          throw new Error(`Video upload error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      }
    }
    
    // This should never happen, but TypeScript requires a return statement
    throw new Error(`Unsupported media type: ${mediaType}`);
  } catch (error) {
    console.error(`Error uploading ${mediaType}:`, error);
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Provide user-friendly error messages
    if (error instanceof TypeError && error.message.includes('NetworkError')) {
      throw new Error(`Network error while uploading ${mediaType}. Please check your internet connection.`);
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`Connection error while uploading ${mediaType}. The server may be unavailable.`);
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Upload timed out. Please try again with a smaller file or check your connection.`);
    } else {
      throw new Error(`Failed to upload ${mediaType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Reads a file as a data URL
 * @param file The file to read
 * @returns A promise that resolves to the data URL
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file to reduce size while maintaining quality
 * @param file The image file to compress
 * @param maxWidth Maximum width of the compressed image
 * @param quality JPEG quality (0-1)
 * @returns A promise that resolves to the compressed file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with reduced quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            resolve(newFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file for compression'));
    };
  });
}