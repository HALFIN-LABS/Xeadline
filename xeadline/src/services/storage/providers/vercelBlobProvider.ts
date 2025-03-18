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
      
      // Upload to Vercel Blob
      const blob = await put(fileName, data, {
        access: 'public',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      });
      
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