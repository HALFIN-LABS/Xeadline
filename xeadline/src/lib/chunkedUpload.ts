/**
 * Chunked upload utility for large files
 * This helps with uploading large video files by breaking them into smaller chunks
 */

/**
 * Default chunk size (2MB)
 * Increased from 1MB to reduce the number of requests
 */
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * Maximum number of concurrent uploads
 * This limits the number of parallel requests to avoid overwhelming the server
 */
const MAX_CONCURRENT_UPLOADS = 3;

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
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<string> {
  try {
    // Show initial progress
    if (onProgress) onProgress(2);

    // Step 1: Initialize the chunked upload
    const fileName = `${pathType}-${mediaType}-${topicId}-${postId}-${Date.now()}.${file.name.split('.').pop()}`;
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    console.log(`Starting chunked upload for ${fileName} (${file.size} bytes) in ${totalChunks} chunks of ${chunkSize} bytes each`);
    
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
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
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
        // Fill up to MAX_CONCURRENT_UPLOADS
        while (queue.length > 0 && inProgress.size < MAX_CONCURRENT_UPLOADS) {
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
        if (inProgress.size >= MAX_CONCURRENT_UPLOADS || (queue.length === 0 && inProgress.size > 0)) {
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