/**
 * Caching Storage Provider Implementation
 * 
 * This provider wraps another provider and adds caching capabilities.
 */
import { StorageProvider, StorageOptions, StorageFilter, StorageResult } from '../types';

/**
 * In-memory cache entry
 */
interface CacheEntry {
  data: Blob;
  expires: number;
}

/**
 * Implementation of StorageProvider that adds caching to another provider
 */
export class CachingStorageProvider implements StorageProvider {
  name: string;
  private provider: StorageProvider;
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtl: number;
  
  /**
   * Create a new CachingStorageProvider
   * @param provider The provider to wrap
   * @param defaultTtl Default time-to-live in seconds (default: 3600 = 1 hour)
   */
  constructor(provider: StorageProvider, defaultTtl: number = 3600) {
    this.provider = provider;
    this.name = `${provider.name}-cached`;
    this.defaultTtl = defaultTtl;
  }
  
  /**
   * Store a file
   * @param data The file data to store
   * @param options Storage options
   * @returns Promise resolving to the storage result
   */
  async store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult> {
    // Pass through to the underlying provider
    const result = await this.provider.store(data, options);
    
    // Cache the result if it's a Blob
    if (data instanceof Blob) {
      const ttl = options?.ttl || this.defaultTtl;
      const expires = Date.now() + ttl * 1000;
      this.cache.set(result.id, { data, expires });
    } else if (data instanceof File) {
      // Files are also Blobs
      const ttl = options?.ttl || this.defaultTtl;
      const expires = Date.now() + ttl * 1000;
      this.cache.set(result.id, { data, expires });
    }
    
    return result;
  }
  
  /**
   * Retrieve a file
   * @param id The file identifier
   * @returns Promise resolving to the file data or null if not found
   */
  async retrieve(id: string): Promise<Blob | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached && cached.expires > Date.now()) {
      console.log(`Cache hit for ${id}`);
      return cached.data;
    }
    
    // If not in cache or expired, get from provider
    console.log(`Cache miss for ${id}, fetching from provider`);
    const data = await this.provider.retrieve(id);
    
    // Update cache if found
    if (data) {
      this.cache.set(id, { 
        data, 
        expires: Date.now() + this.defaultTtl * 1000
      });
    } else {
      // Remove from cache if not found
      this.cache.delete(id);
    }
    
    return data;
  }
  
  /**
   * Delete a file
   * @param id The file identifier
   * @returns Promise resolving to true if deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    // Remove from cache
    this.cache.delete(id);
    
    // Delete from provider
    return this.provider.delete(id);
  }
  
  /**
   * List files
   * @param filter Filter options
   * @returns Promise resolving to an array of file identifiers
   */
  async list(filter?: StorageFilter): Promise<string[]> {
    // Pass through to provider (no caching for lists)
    return this.provider.list(filter);
  }
  
  /**
   * Get the public URL for a file
   * @param id The file identifier
   * @returns The public URL
   */
  getUrl(id: string): string {
    return this.provider.getUrl(id);
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Invalidate a specific item in the cache
   * @param id The file identifier to invalidate
   */
  invalidate(id: string): void {
    this.cache.delete(id);
  }
  
  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // Would need to track these
      misses: 0, // Would need to track these
    };
  }
}