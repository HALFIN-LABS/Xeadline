/**
 * Types for the Storage Service Abstraction
 */

/**
 * Options for storage operations
 */
export interface StorageOptions {
  /** Content type of the file */
  contentType?: string;
  /** Additional metadata for the file */
  metadata?: Record<string, string>;
  /** Cache control header */
  cacheControl?: string;
  /** Time to live in seconds for cached content */
  ttl?: number;
}

/**
 * Filter options for listing files
 */
export interface StorageFilter {
  /** Prefix to filter files by */
  prefix?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
}

/**
 * Result of a storage operation
 */
export interface StorageResult {
  /** Unique identifier for the file */
  id: string;
  /** Public URL for accessing the file */
  url: string;
  /** Content type of the file */
  contentType: string;
  /** Size of the file in bytes */
  size: number;
  /** Additional metadata for the file */
  metadata?: Record<string, string>;
  /** When the file was created */
  createdAt: Date;
}

/**
 * Interface for storage providers
 */
export interface StorageProvider {
  /** Name of the provider */
  name: string;
  
  /**
   * Store a file
   * @param data The file data to store
   * @param options Storage options
   * @returns Promise resolving to the storage result
   */
  store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult>;
  
  /**
   * Retrieve a file
   * @param id The file identifier
   * @returns Promise resolving to the file data or null if not found
   */
  retrieve(id: string): Promise<Blob | null>;
  
  /**
   * Delete a file
   * @param id The file identifier
   * @returns Promise resolving to true if deleted, false otherwise
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * List files
   * @param filter Filter options
   * @returns Promise resolving to an array of file identifiers
   */
  list(filter?: StorageFilter): Promise<string[]>;
  
  /**
   * Get the public URL for a file
   * @param id The file identifier
   * @returns The public URL
   */
  getUrl(id: string): string;
}