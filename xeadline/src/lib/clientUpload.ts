/**
 * Client-side upload utility for direct uploads to Vercel Blob
 * This bypasses the API route timeout limitations and provides better progress tracking
 */

/**
 * Upload a file directly to Vercel Blob
 * @param file The file to upload
 * @param pathType The type of path (e.g., 'post')
 * @param mediaType The type of media (e.g., 'image', 'video')
 * @param topicId The topic ID
 * @param postId The post ID
 * @param onProgress Optional callback for progress updates
 * @returns The URL of the uploaded file
 */
export async function uploadFileDirect(
  file: File,
  pathType: string,
  mediaType: 'image' | 'video' | 'gif',
  topicId: string,
  postId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Show initial progress
    if (onProgress) onProgress(5);

    // Skip the URL generation step and directly upload to the API
    console.log('Uploading file directly to API');
    if (onProgress) onProgress(10);
    
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', `${pathType}-${mediaType}-${topicId}-${postId}-${Date.now()}.${file.name.split('.').pop()}`);
    formData.append('contentType', file.type);
    formData.append('metadata', JSON.stringify({
      pathType,
      mediaType,
      topicId,
      postId,
      uploadedAt: new Date().toISOString()
    }));
    
    // Use XMLHttpRequest for progress tracking
    const uploadResult = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          // Scale progress from 10% to 90% - this represents the upload phase
          const progress = 10 + Math.round((event.loaded / event.total) * 80);
          onProgress(progress);
        }
      };
      
      // Handle completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response && response.url) {
              // Only set to 100% when we have a valid URL
              if (onProgress) onProgress(95);
              
              // Add a small delay before resolving to allow the server to process the file
              setTimeout(() => {
                if (onProgress) onProgress(100);
                resolve(response.url);
              }, 1000);
            } else {
              reject(new Error('Invalid response format: missing URL'));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
          }
        } else {
          reject(new Error(`HTTP error! Status: ${xhr.status}`));
        }
      };
      
      // Handle errors
      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('Upload timed out'));
      };
      
      // Set timeout (5 minutes)
      xhr.timeout = 5 * 60 * 1000;
      
      // Open and send the request
      xhr.open('POST', '/api/storage/upload-file', true);
      xhr.send(formData);
    });
    
    return uploadResult;
  } catch (error) {
    console.error('Error during direct upload:', error);
    throw error;
  }
}