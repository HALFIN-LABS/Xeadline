/**
 * Direct upload utility for Vercel Blob
 * This bypasses the server API for uploads, significantly improving performance
 */

/**
 * Simplified direct upload function to avoid browser crashes
 * This version uses a more traditional approach without direct uploads
 * @param file The file to upload
 * @param pathType The type of path (e.g., 'post')
 * @param mediaType The type of media (e.g., 'video')
 * @param topicId The topic ID
 * @param postId The post ID
 * @param onProgress Optional callback for progress updates
 * @returns The URL of the uploaded file
 */
export async function uploadDirectToBlob(
  file: File,
  pathType: string,
  mediaType: 'video' | 'image' | 'gif',
  topicId: string,
  postId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Show initial progress
    if (onProgress) onProgress(5);

    // Create a FormData object for the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('contentType', file.type);
    formData.append('pathType', pathType);
    formData.append('mediaType', mediaType);
    formData.append('topicId', topicId);
    formData.append('postId', postId || 'new-post');

    // Show progress before upload
    if (onProgress) onProgress(10);

    // Upload the file through our API
    const response = await fetch('/api/storage/upload-file', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to upload file: ${response.status}`);
    }

    // Show progress after successful upload
    if (onProgress) onProgress(90);

    const data = await response.json();
    const url = data.url;
    
    if (!url) {
      throw new Error('No URL returned from upload endpoint');
    }
    
    // Complete progress
    if (onProgress) onProgress(100);
    
    return url;
  } catch (error) {
    console.error('Error during upload:', error);
    throw error;
  }
}

/**
 * Creates an XMLHttpRequest with progress tracking for direct uploads
 * @param url The URL to upload to
 * @param file The file to upload
 * @param onProgress Progress callback function
 * @returns Promise resolving to the response text
 */
export function uploadWithProgress(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 90) + 10;
        onProgress(percentComplete);
      }
    });
    
    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    
    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });
    
    // Open and send the request
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}