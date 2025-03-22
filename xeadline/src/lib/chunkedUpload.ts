/**
 * Chunked upload utility for large files
 * This helps with uploading large video files by breaking them into smaller chunks
 */

/**
 * Default chunk size (5MB)
 * Increased from 2MB to reduce the number of requests while maintaining reliability
 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Maximum number of concurrent uploads
 * This limits the number of parallel requests to avoid overwhelming the server
 * Increased from 3 to 4 for better performance on modern connections
 */
const MAX_CONCURRENT_UPLOADS = 4;

/**
 * Network speed detection thresholds (bytes per second)
 */
const NETWORK_SPEED = {
  SLOW: 500 * 1024, // 500 KB/s
  MEDIUM: 2 * 1024 * 1024, // 2 MB/s
  FAST: 10 * 1024 * 1024, // 10 MB/s
};

/**
 * Get a conservative estimate of network speed without actual testing
 * This avoids the potential browser crash from the network test
 * @returns Promise resolving to the estimated network speed in bytes per second
 */
async function detectNetworkSpeed(): Promise<number> {
  // Instead of actual testing which might cause browser issues,
  // we'll use a conservative estimate based on MEDIUM speed
  console.log('Using conservative network speed estimate');
  return NETWORK_SPEED.MEDIUM;
}

/**
 * Get optimal chunk size and concurrency based on network speed
 * @param fileSize The size of the file to upload
 * @param networkSpeed The detected network speed in bytes per second
 * @returns Object containing optimal chunk size and concurrency
 */
function getOptimalChunkConfig(fileSize: number, networkSpeed: number): { chunkSize: number, concurrency: number } {
  // For very small files, use a single chunk
  if (fileSize < 5 * 1024 * 1024) {
    return { chunkSize: fileSize, concurrency: 1 };
  }
  
  if (networkSpeed < NETWORK_SPEED.SLOW) {
    // Slow connection: 1MB chunks, 1-2 concurrent uploads
    return { chunkSize: 1 * 1024 * 1024, concurrency: 2 };
  } else if (networkSpeed < NETWORK_SPEED.MEDIUM) {
    // Medium connection: 2MB chunks, 2-3 concurrent uploads
    return { chunkSize: 2 * 1024 * 1024, concurrency: 3 };
  } else if (networkSpeed < NETWORK_SPEED.FAST) {
    // Fast connection: 5MB chunks, 3-4 concurrent uploads
    return { chunkSize: 5 * 1024 * 1024, concurrency: 4 };
  } else {
    // Very fast connection: 8MB chunks, 4 concurrent uploads
    return { chunkSize: 8 * 1024 * 1024, concurrency: 4 };
  }
}

/**
 * Upload a file in chunks
 * @param file The file to upload
 * @param pathType The type of path (e.g., 'post')
 * @param mediaType The type of media (e.g., 'video')
 * @param topicId The topic ID
 * @param postId The post ID
 * @param onProgress Optional callback for progress updates
 * @param chunkSize Optional chunk size in bytes (default: 1MB)
 * @returns The URL of the uploaded file
 */
export async function uploadFileInChunks(
  file: File,
  pathType: string,
  mediaType: 'video',
  topicId: string,
  postId: string,
  onProgress?: (progress: number) => void,
  chunkSize?: number
): Promise<string> {
  try {
    // Show initial progress
    if (onProgress) onProgress(1);

    // Step 1: Detect network speed and determine optimal chunk size and concurrency
    if (onProgress) onProgress(2);
    console.log('Detecting network speed for optimal chunking...');
    const networkSpeed = await detectNetworkSpeed();
    
    // Get optimal chunk configuration based on network speed and file size
    const { chunkSize: optimalChunkSize, concurrency: optimalConcurrency } =
      getOptimalChunkConfig(file.size, networkSpeed);
    
    // Use provided chunk size or optimal chunk size
    const finalChunkSize = chunkSize || optimalChunkSize;
    
    // Override MAX_CONCURRENT_UPLOADS with the optimal concurrency
    const MAX_CONCURRENT_UPLOADS_OVERRIDE = optimalConcurrency;
    
    // Calculate total chunks
    const totalChunks = Math.ceil(file.size / finalChunkSize);
    
    // Generate a unique filename with metadata
    const fileExt = file.name.split('.').pop() || 'mp4';
    const timestamp = Date.now();
    const fileName = `${pathType}-${mediaType}-${topicId}-${postId}-${timestamp}.${fileExt}`;
    
    console.log(`Starting chunked upload for ${fileName} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
    console.log(`Network speed: ${(networkSpeed / (1024 * 1024)).toFixed(2)}MB/s`);
    console.log(`Using ${totalChunks} chunks of ${(finalChunkSize / (1024 * 1024)).toFixed(2)}MB each`);
    console.log(`Concurrent uploads: ${MAX_CONCURRENT_UPLOADS_OVERRIDE}`);
    
    const initResponse = await fetch('/api/storage/init-chunked-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        contentType: file.type,
        fileSize: file.size,
        totalChunks,
        metadata: {
          pathType,
          mediaType,
          topicId,
          postId,
          uploadedAt: new Date().toISOString()
        }
      }),
    });
    
    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      throw new Error(errorData.error || `Failed to initialize chunked upload: ${initResponse.status}`);
    }
    
    let uploadId;
    try {
      const initData = await initResponse.json();
      uploadId = initData.uploadId;
      
      if (!uploadId) {
        throw new Error('No upload ID returned from server');
      }
      
      console.log('Initialized chunked upload with ID:', uploadId);
    } catch (parseError) {
      console.error('Error parsing init response:', parseError);
      throw new Error(`Failed to parse init response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    if (onProgress) onProgress(5);
    
    // Step 2: Upload each chunk with controlled concurrency
    let completedChunks = 0;
    
    // Create an array of chunk indices
    const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);
    
    // Function to upload a single chunk
    const uploadChunk = async (chunkIndex: number): Promise<void> => {
      const start = chunkIndex * finalChunkSize;
      const end = Math.min(start + finalChunkSize, file.size);
      const chunk = file.slice(start, end);
      
      // Create a FormData object for this chunk
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      
      // Add retry logic
      let retries = 0;
      const maxRetries = 3;
      
      while (retries <= maxRetries) {
        try {
          // Upload the chunk
          const response = await fetch('/api/storage/upload-chunk', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to upload chunk ${chunkIndex}: ${response.status}`);
          }
          
          // Update progress (5% to 85%)
          completedChunks++;
          if (onProgress) {
            const uploadProgress = 5 + Math.round((completedChunks / totalChunks) * 80);
            onProgress(uploadProgress);
          }
          
          console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
          return;
        } catch (error) {
          retries++;
          console.error(`Error uploading chunk ${chunkIndex}, retry ${retries}/${maxRetries}:`, error);
          
          if (retries > maxRetries) {
            throw error;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
        }
      }
    };
    
    // Process chunks with limited concurrency
    const processChunksWithConcurrency = async () => {
      // Create a queue of chunks to process
      const queue = [...chunkIndices];
      const inProgress = new Set();
      const results = [];
      
      // Process the queue
      while (queue.length > 0 || inProgress.size > 0) {
        // Fill up to our dynamically determined concurrency limit
        while (queue.length > 0 && inProgress.size < MAX_CONCURRENT_UPLOADS_OVERRIDE) {
          const chunkIndex = queue.shift()!;
          inProgress.add(chunkIndex);
          
          // Start the upload and add to results
          const promise = uploadChunk(chunkIndex)
            .then(() => {
              inProgress.delete(chunkIndex);
            })
            .catch((error) => {
              inProgress.delete(chunkIndex);
              throw error;
            });
          
          results.push(promise);
        }
        
        // Wait for at least one to complete before continuing
        if (inProgress.size >= MAX_CONCURRENT_UPLOADS_OVERRIDE || (queue.length === 0 && inProgress.size > 0)) {
          await Promise.race(
            Array.from(inProgress).map(
              chunkIndex => new Promise(resolve => {
                const checkInterval = setInterval(() => {
                  if (!inProgress.has(chunkIndex)) {
                    clearInterval(checkInterval);
                    resolve(null);
                  }
                }, 100);
              })
            )
          );
        }
      }
      
      // Wait for all uploads to complete
      await Promise.all(results);
    };
    
    // Start the upload process
    await processChunksWithConcurrency();
    
    // Step 3: Complete the chunked upload
    if (onProgress) onProgress(90);
    
    let url;
    try {
      console.log('Completing chunked upload for ID:', uploadId);
      
      const completeResponse = await fetch('/api/storage/complete-chunked-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          fileName,
          contentType: file.type,
          totalChunks,
          metadata: {
            pathType,
            mediaType,
            topicId,
            postId,
            uploadedAt: new Date().toISOString()
          }
        }),
      });
      
      if (!completeResponse.ok) {
        let errorMessage = `Failed to complete chunked upload: ${completeResponse.status}`;
        try {
          const errorData = await completeResponse.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      try {
        const completeData = await completeResponse.json();
        url = completeData.url;
        
        if (!url) {
          throw new Error('No URL returned from server');
        }
        
        console.log('Completed chunked upload, URL:', url);
      } catch (parseError) {
        console.error('Error parsing complete response:', parseError);
        throw new Error(`Failed to parse complete response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } catch (completeError) {
      console.error('Error completing chunked upload:', completeError);
      
      // Try a fallback approach - direct upload
      console.log('Trying fallback direct upload...');
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('contentType', file.type);
      formData.append('metadata', JSON.stringify({
        pathType,
        mediaType,
        topicId,
        postId,
        uploadedAt: new Date().toISOString()
      }));
      
      // Upload directly
      const fallbackResponse = await fetch('/api/storage/upload-file', {
        method: 'POST',
        body: formData,
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback upload failed: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      url = fallbackData.url;
      
      if (!url) {
        throw new Error('No URL returned from fallback upload');
      }
      
      console.log('Fallback upload successful, URL:', url);
    }
    
    // Add a small delay before setting to 100% to allow for server processing
    if (onProgress) onProgress(95);
    
    // Wait a bit before setting to 100%
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onProgress) onProgress(100);
    
    return url;
  } catch (error) {
    console.error('Error during chunked upload:', error);
    throw error;
  }
}