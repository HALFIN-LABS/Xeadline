/**
 * Utility functions for Vercel Blob storage
 */

/**
 * Uploads a file to Vercel Blob storage
 * @param file The file to upload
 * @param imageType The type of image (icon or banner)
 * @param topicId Optional topic ID
 * @returns The URL of the uploaded file
 */
export async function uploadToBlob(
  file: File,
  imageType: 'icon' | 'banner',
  topicId?: string
): Promise<string> {
  try {
    console.log(`Starting upload for ${imageType} image${topicId ? ` for topic ${topicId}` : ''}`);
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      throw new Error('File too large. Maximum size is 5MB.');
    }
    
    console.log('Using FormData approach with /api/simple-blob-upload');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageType', imageType);
    if (topicId) {
      formData.append('topicId', topicId);
    }
    
    // Send the file to our Vercel Blob API endpoint using FormData
    console.log('Sending request to /api/simple-blob-upload');
    const response = await fetch('/api/simple-blob-upload', {
      method: 'POST',
      body: formData,
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    console.log('Response status:', response.status, response.statusText);
    
    // Handle non-JSON responses (like 404 HTML pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Non-JSON response received:', responseText);
      throw new Error(`Server returned ${response.status} with non-JSON response: ${responseText.substring(0, 100)}...`);
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload error:', errorData);
      throw new Error(errorData.error || `Failed to upload image: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.url) {
      console.error('No URL in response data:', data);
      throw new Error('No URL returned from upload');
    }
    
    console.log('Upload successful, URL:', data.url);
    
    return data.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
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