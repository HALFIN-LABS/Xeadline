/**
 * Vercel Blob Storage Provider Implementation
 */
import { put, del, list } from '@vercel/blob';
import { StorageProvider, StorageOptions, StorageFilter, StorageResult } from '../types';

/**
 * Implementation of StorageProvider using Vercel Blob
 */
export class VercelBlobProvider implements StorageProvider {
  name = 'vercel-blob';

  /**
   * Store a file in Vercel Blob
   * @param data The file data to store
   * @param options Storage options
   * @returns Promise resolving to the storage result
   */
  async store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult> {
    try {
      // Generate a filename if not provided
      const fileName = options?.metadata?.fileName || `file-${Date.now()}`;
      const contentType = options?.contentType || 'application/octet-stream';
      
      // Log the upload attempt
      console.log(`Uploading file to Vercel Blob: ${fileName} (${contentType}), size: ${data instanceof File ? data.size : data instanceof Blob ? data.size : (data as Buffer).length} bytes`);
      
      // Upload to Vercel Blob with improved error handling and explicit content type
      let blob;
      try {
        // Ensure content type is explicitly set and preserved
        const isVideo = contentType.startsWith('video/');
        
        // Log content type for debugging
        console.log(`Uploading to Vercel Blob with content type: ${contentType}`);
        
        // Add specific headers for video content
        const headers: Record<string, string> = {};
        if (isVideo) {
          headers['Content-Disposition'] = `inline; filename="${fileName}"`;
          // Ensure proper MIME type is set
          console.log('Adding video-specific headers for content type preservation');
        }
        
        blob = await put(fileName, data, {
          access: 'public',
          contentType, // Explicitly set content type
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: true,
          headers, // Add custom headers
        });
        
        // Verify content type after upload
        console.log(`Vercel Blob upload successful: ${blob.url}`);
        console.log(`Uploaded content type: ${contentType}, Blob content type: ${blob.contentType || 'unknown'}`);
        
        // If content type doesn't match, log a warning
        if (blob.contentType && blob.contentType !== contentType) {
          console.warn(`Content type mismatch: Expected ${contentType}, got ${blob.contentType}`);
        }
      } catch (putError) {
        console.error('Vercel Blob put error:', putError);
        throw new Error(`Vercel Blob upload failed: ${putError instanceof Error ? putError.message : 'Unknown error'}`);
      }
      
      // Return the result
      return {
        id: blob.pathname,
        url: blob.url,
        contentType,
        size: data instanceof File ? data.size : data instanceof Blob ? data.size : (data as Buffer).length,
        metadata: options?.metadata,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error storing file in Vercel Blob:', error);
      throw new Error(`Failed to store file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a file from Vercel Blob
   * @param id The file identifier
   * @returns Promise resolving to the file data or null if not found
   */
  async retrieve(id: string): Promise<Blob | null> {
    try {
      // Vercel Blob doesn't have a direct get method in this version
      // We'll use fetch to get the file from the URL
      const url = this.getUrl(id);
      const response = await fetch(url);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error retrieving file from Vercel Blob:', error);
      return null;
    }
  }

  /**
   * Delete a file from Vercel Blob
   * @param id The file identifier
   * @returns Promise resolving to true if deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    try {
      await del(id);
      return true;
    } catch (error) {
      console.error('Error deleting file from Vercel Blob:', error);
      return false;
    }
  }

  /**
   * List files in Vercel Blob
   * @param filter Filter options
   * @returns Promise resolving to an array of file identifiers
   */
  async list(filter?: StorageFilter): Promise<string[]> {
    try {
      const blobs = await list({
        prefix: filter?.prefix,
        limit: filter?.limit,
        // Vercel Blob doesn't support offset in this version
      });
      
      return blobs.blobs.map(blob => blob.pathname);
    } catch (error) {
      console.error('Error listing files from Vercel Blob:', error);
      return [];
    }
  }

  /**
   * Get the public URL for a file in Vercel Blob
   * @param id The file identifier
   * @returns The public URL
   */
  getUrl(id: string): string {
    // Vercel Blob URLs are in the format: https://{account}.blob.vercel-storage.com/{pathname}
    const prefix = process.env.NEXT_PUBLIC_VERCEL_BLOB_URL_PREFIX || 'https://vercel-blob-storage.public.blob.vercel-storage.com';
    return `${prefix}/${id}`;
  }
}