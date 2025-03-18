# Storage Service Abstraction Implementation Plan

## Overview

This document outlines the implementation plan for Phase 1.2 (Storage Service Abstraction) from the MVP Implementation Plan. The goal is to create a pluggable storage system that decouples the application from specific storage providers through a well-defined abstraction layer.

As per the current requirements, we will focus exclusively on Vercel Blob storage for now, removing any S3-related functionality, but designing the abstraction to allow for easy addition of other providers in the future.

## Current State Analysis

The application currently uses multiple storage mechanisms, but we will focus exclusively on Vercel Blob for file storage going forward:

1. **Vercel Blob Storage**: Used for file uploads, particularly for profile images, as seen in `xeadline/src/lib/blob.ts`.
2. **API Routes**: `simple-blob-upload.js` handles Vercel Blob uploads.
3. **Components**: `ImageUpload.tsx` uses Vercel Blob.

As part of this implementation, we will remove all S3-related code and dependencies, including:
- `xeadline/src/lib/s3.ts` file
- `S3ImageUpload.tsx` component
- Any S3-specific API routes

**Important Note**: While we're removing S3 as a storage provider, we will maintain the Supabase database functionality that logs image URLs from Vercel Blob and maps them to the relevant topics. This metadata storage in Supabase is separate from the file storage functionality and should be preserved.

## Implementation Plan

### Phase 1: Create Storage Provider Interface and Base Implementation (3 days)

1. **Create Storage Provider Interface**
   - Define a common interface for all storage providers
   - Include methods for store, retrieve, delete, and list operations
   - Define common types for options and results

2. **Implement Vercel Blob Provider**
   - Create a concrete implementation of the storage provider interface using Vercel Blob
   - Wrap the existing Vercel Blob functionality
   - Ensure all operations are properly typed and error-handled

3. **Create Storage Service**
   - Implement a service that manages provider instances
   - Add configuration options for default provider
   - Include provider registration mechanism for future extensibility

### Phase 2: Implement Caching and Fallback Mechanisms (2 days)

1. **Create Caching Provider**
   - Implement a decorator provider that adds caching
   - Use browser storage (localStorage/IndexedDB) for client-side caching
   - Add TTL and cache invalidation strategies

2. **Add Performance Monitoring**
   - Implement metrics collection for storage operations
   - Track success rates, latency, and error rates
   - Create a dashboard for monitoring storage performance

### Phase 3: Migrate Existing Code (3 days)

1. **Update Components**
   - Refactor `ImageUpload.tsx` to use the new storage service
   - Remove `S3ImageUpload.tsx` or update it to use the abstraction
   - Update any other components that directly use storage

2. **Update API Routes**
   - Refactor `simple-blob-upload.js` to use the storage service
   - Remove any S3-specific API routes
   - Ensure all routes use the abstraction layer

3. **Remove S3 Code**
   - Remove `xeadline/src/lib/s3.ts`
   - Remove any S3-specific dependencies
   - Update documentation to reflect the change

### Phase 4: Testing and Documentation (2 days)

1. **Create Unit Tests**
   - Test the storage provider interface
   - Test the Vercel Blob implementation
   - Test caching and fallback mechanisms

2. **Create Integration Tests**
   - Test the storage service with real components
   - Test file uploads and retrievals
   - Test error handling and edge cases

3. **Update Documentation**
   - Create usage documentation for the storage service
   - Document how to add new providers in the future
   - Update existing documentation to reflect the changes

## Detailed Technical Design

### 1. Storage Provider Interface

```typescript
// src/services/storage/types.ts
export interface StorageOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  ttl?: number;
}

export interface StorageFilter {
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface StorageResult {
  id: string;
  url: string;
  contentType: string;
  size: number;
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface StorageProvider {
  name: string;
  store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult>;
  retrieve(id: string): Promise<Blob | null>;
  delete(id: string): Promise<boolean>;
  list(filter?: StorageFilter): Promise<string[]>;
  getUrl(id: string): string;
}
```

### 2. Vercel Blob Provider Implementation

```typescript
// src/services/storage/providers/vercelBlobProvider.ts
import { put, del, list, get } from '@vercel/blob';
import { StorageProvider, StorageOptions, StorageFilter, StorageResult } from '../types';

export class VercelBlobProvider implements StorageProvider {
  name = 'vercel-blob';

  async store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult> {
    const fileName = options?.metadata?.fileName || `file-${Date.now()}`;
    const contentType = options?.contentType || 'application/octet-stream';
    
    const blob = await put(fileName, data, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControl: options?.cacheControl,
      addRandomSuffix: true,
    });
    
    return {
      id: blob.pathname,
      url: blob.url,
      contentType,
      size: blob.size,
      metadata: options?.metadata,
      createdAt: new Date(),
    };
  }

  async retrieve(id: string): Promise<Blob | null> {
    try {
      const blob = await get(id);
      if (!blob) return null;
      
      return blob.blob();
    } catch (error) {
      console.error('Error retrieving blob:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await del(id);
      return true;
    } catch (error) {
      console.error('Error deleting blob:', error);
      return false;
    }
  }

  async list(filter?: StorageFilter): Promise<string[]> {
    try {
      const blobs = await list({
        prefix: filter?.prefix,
        limit: filter?.limit,
        offset: filter?.offset,
      });
      
      return blobs.blobs.map(blob => blob.pathname);
    } catch (error) {
      console.error('Error listing blobs:', error);
      return [];
    }
  }

  getUrl(id: string): string {
    return `${process.env.NEXT_PUBLIC_VERCEL_BLOB_URL_PREFIX}/${id}`;
  }
}
```

### 3. Storage Service Implementation

```typescript
// src/services/storage/storageService.ts
import { StorageProvider, StorageOptions, StorageFilter, StorageResult } from './types';
import { VercelBlobProvider } from './providers/vercelBlobProvider';

export class StorageService {
  private providers: Map<string, StorageProvider> = new Map();
  private defaultProvider: string;

  constructor(defaultProvider: string = 'vercel-blob') {
    this.defaultProvider = defaultProvider;
    
    // Register the Vercel Blob provider by default
    this.registerProvider(new VercelBlobProvider());
  }

  registerProvider(provider: StorageProvider): void {
    this.providers.set(provider.name, provider);
  }

  setDefaultProvider(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} is not registered`);
    }
    this.defaultProvider = providerName;
  }

  getProvider(providerName?: string): StorageProvider {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);
    
    if (!provider) {
      throw new Error(`Provider ${name} is not registered`);
    }
    
    return provider;
  }

  async store(
    data: Blob | File | Buffer, 
    options?: StorageOptions & { provider?: string }
  ): Promise<StorageResult> {
    const provider = this.getProvider(options?.provider);
    return provider.store(data, options);
  }

  async retrieve(id: string, providerName?: string): Promise<Blob | null> {
    const provider = this.getProvider(providerName);
    return provider.retrieve(id);
  }

  async delete(id: string, providerName?: string): Promise<boolean> {
    const provider = this.getProvider(providerName);
    return provider.delete(id);
  }

  async list(filter?: StorageFilter, providerName?: string): Promise<string[]> {
    const provider = this.getProvider(providerName);
    return provider.list(filter);
  }

  getUrl(id: string, providerName?: string): string {
    const provider = this.getProvider(providerName);
    return provider.getUrl(id);
  }
}

// Create a singleton instance
export const storageService = new StorageService();
```

### 4. Caching Provider Implementation

```typescript
// src/services/storage/providers/cachingProvider.ts
import { StorageProvider, StorageOptions, StorageFilter, StorageResult } from '../types';

export class CachingStorageProvider implements StorageProvider {
  name: string;
  private provider: StorageProvider;
  private cache: Map<string, { data: Blob; expires: number }> = new Map();
  
  constructor(provider: StorageProvider) {
    this.provider = provider;
    this.name = `${provider.name}-cached`;
  }
  
  async store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult> {
    // Pass through to the underlying provider
    const result = await this.provider.store(data, options);
    
    // Cache the result if it's a Blob
    if (data instanceof Blob) {
      const ttl = options?.ttl || 3600; // Default 1 hour
      const expires = Date.now() + ttl * 1000;
      this.cache.set(result.id, { data, expires });
    }
    
    return result;
  }
  
  async retrieve(id: string): Promise<Blob | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    // If not in cache or expired, get from provider
    const data = await this.provider.retrieve(id);
    
    // Update cache if found
    if (data) {
      this.cache.set(id, { 
        data, 
        expires: Date.now() + 3600 * 1000 // Default 1 hour
      });
    } else {
      // Remove from cache if not found
      this.cache.delete(id);
    }
    
    return data;
  }
  
  async delete(id: string): Promise<boolean> {
    // Remove from cache
    this.cache.delete(id);
    
    // Delete from provider
    return this.provider.delete(id);
  }
  
  async list(filter?: StorageFilter): Promise<string[]> {
    // Pass through to provider (no caching for lists)
    return this.provider.list(filter);
  }
  
  getUrl(id: string): string {
    return this.provider.getUrl(id);
  }
  
  // Additional methods for cache management
  clearCache(): void {
    this.cache.clear();
  }
  
  invalidate(id: string): void {
    this.cache.delete(id);
  }
}
```

## Migration Strategy

1. **Parallel Implementation**:
   - Build the new storage system alongside the existing one
   - Create adapters for existing components to use the new system
   - Gradually migrate components one by one

2. **Feature Flags**:
   - Use feature flags to control the rollout
   - Allow switching between old and new implementations

3. **Testing Strategy**:
   - Test each component with the new storage system before migration
   - Implement comprehensive error handling and logging
   - Monitor performance and reliability during migration

## Dependencies

- `@vercel/blob`: For Vercel Blob storage
- No S3 dependencies required

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes to existing code | Implement adapters and thorough testing |
| Performance degradation | Monitor performance metrics and optimize as needed |
| Data migration issues | Implement data validation and verification |
| API compatibility | Ensure the new API is backward compatible |

## Success Criteria

- All components successfully migrated to the new storage abstraction
- No S3 dependencies in the codebase
- Performance equal to or better than the previous implementation
- Comprehensive test coverage
- Clear documentation for future providers