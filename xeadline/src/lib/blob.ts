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
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageType', imageType);
    if (topicId) {
      formData.append('topicId', topicId);
    }
    
    // Send the file to our Vercel Blob API endpoint
    const response = await fetch('/api/blob-upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload error:', errorData);
      throw new Error(errorData.error || 'Failed to upload image');
    }
    
    const data = await response.json();
    
    if (!data.url) {
      throw new Error('No URL returned from upload');
    }
    
    console.log('Upload successful, URL:', data.url);
    
    return data.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}