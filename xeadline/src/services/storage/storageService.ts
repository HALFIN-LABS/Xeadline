/**
 * Storage Service Implementation
 * 
 * This service manages storage providers and provides a unified API for storage operations.
 */
import { StorageProvider, StorageOptions, StorageFilter, StorageResult } from './types';
import { VercelBlobProvider } from './providers/vercelBlobProvider';

/**
 * Storage Service class that manages storage providers and provides a unified API
 */
export class StorageService {
  private providers: Map<string, StorageProvider> = new Map();
  private defaultProvider: string;

  /**
   * Create a new StorageService
   * @param defaultProvider The name of the default provider to use
   */
  constructor(defaultProvider: string = 'vercel-blob') {
    this.defaultProvider = defaultProvider;
    
    // Register the Vercel Blob provider by default
    this.registerProvider(new VercelBlobProvider());
  }

  /**
   * Register a storage provider
   * @param provider The provider to register
   */
  registerProvider(provider: StorageProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Set the default provider
   * @param providerName The name of the provider to set as default
   */
  setDefaultProvider(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} is not registered`);
    }
    this.defaultProvider = providerName;
  }

  /**
   * Get a provider by name
   * @param providerName The name of the provider to get
   * @returns The provider
   */
  getProvider(providerName?: string): StorageProvider {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);
    
    if (!provider) {
      throw new Error(`Provider ${name} is not registered`);
    }
    
    return provider;
  }

  /**
   * Store a file
   * @param data The file data to store
   * @param options Storage options
   * @returns Promise resolving to the storage result
   */
  async store(
    data: Blob | File | Buffer, 
    options?: StorageOptions & { provider?: string }
  ): Promise<StorageResult> {
    const provider = this.getProvider(options?.provider);
    return provider.store(data, options);
  }

  /**
   * Retrieve a file
   * @param id The file identifier
   * @param providerName The name of the provider to use
   * @returns Promise resolving to the file data or null if not found
   */
  async retrieve(id: string, providerName?: string): Promise<Blob | null> {
    const provider = this.getProvider(providerName);
    return provider.retrieve(id);
  }

  /**
   * Delete a file
   * @param id The file identifier
   * @param providerName The name of the provider to use
   * @returns Promise resolving to true if deleted, false otherwise
   */
  async delete(id: string, providerName?: string): Promise<boolean> {
    const provider = this.getProvider(providerName);
    return provider.delete(id);
  }

  /**
   * List files
   * @param filter Filter options
   * @param providerName The name of the provider to use
   * @returns Promise resolving to an array of file identifiers
   */
  async list(filter?: StorageFilter, providerName?: string): Promise<string[]> {
    const provider = this.getProvider(providerName);
    return provider.list(filter);
  }

  /**
   * Get the public URL for a file
   * @param id The file identifier
   * @param providerName The name of the provider to use
   * @returns The public URL
   */
  getUrl(id: string, providerName?: string): string {
    const provider = this.getProvider(providerName);
    return provider.getUrl(id);
  }
}

// Create a singleton instance
export const storageService = new StorageService();