/**
 * Utility functions for file storage using the Storage Service via API
 */

/**
 * Uploads a file to storage via the server-side API
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
    
    // Convert file to base64
    const base64Data = await readFileAsDataURL(file);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${imageType}${topicId ? `-${topicId}` : ''}-${timestamp}.${fileExtension}`;
    
    console.log('Using Storage Service API to upload file');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Use the API to upload the file
    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data,
        fileName,
        contentType: file.type,
        metadata: {
          fileName,
          imageType,
          topicId: topicId || '',
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }
    
    const result = await response.json();
    console.log('Upload successful, URL:', result.url);
    
    return result.url;
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