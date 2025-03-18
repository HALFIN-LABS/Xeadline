# Storage Service Abstraction

This module provides a pluggable storage system that decouples the application from specific storage providers through a well-defined abstraction layer. It implements the provider pattern to allow seamless switching between different storage solutions without modifying application code.

## Features

- **Provider Abstraction**: Common interface for all storage providers
- **Pluggable Architecture**: Easily add or switch between storage providers
- **Caching Support**: Optional caching layer for improved performance
- **Consistent API**: Unified API for all file operations
- **Error Handling**: Comprehensive error handling and logging

## Usage

### Basic Usage

```typescript
import { storageService } from '@/services/storage';

// Store a file
const file = new File([...], 'example.jpg', { type: 'image/jpeg' });
const result = await storageService.store(file, {
  contentType: 'image/jpeg',
  metadata: {
    fileName: 'example.jpg',
    userId: '123'
  }
});

// Get the URL
const url = result.url;
// or
const url = storageService.getUrl(result.id);

// Retrieve a file
const blob = await storageService.retrieve(result.id);

// Delete a file
const deleted = await storageService.delete(result.id);

// List files
const files = await storageService.list({ prefix: 'images/' });
```

### Using with Image Upload Components

```typescript
import { storageService } from '@/services/storage';

// In your component
const handleImageUpload = async (file: File) => {
  try {
    const result = await storageService.store(file, {
      contentType: file.type,
      metadata: {
        fileName: file.name,
        imageType: 'profile'
      }
    });
    
    // Use the URL
    setImageUrl(result.url);
    onImageUploaded(result.url);
  } catch (error) {
    console.error('Error uploading image:', error);
    setError('Failed to upload image');
  }
};
```

### Adding a New Provider

To add a new storage provider, implement the `StorageProvider` interface and register it with the `StorageService`:

```typescript
import { StorageProvider, storageService } from '@/services/storage';

class MyCustomProvider implements StorageProvider {
  name = 'my-custom-provider';
  
  async store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult> {
    // Implementation
  }
  
  async retrieve(id: string): Promise<Blob | null> {
    // Implementation
  }
  
  async delete(id: string): Promise<boolean> {
    // Implementation
  }
  
  async list(filter?: StorageFilter): Promise<string[]> {
    // Implementation
  }
  
  getUrl(id: string): string {
    // Implementation
  }
}

// Register the provider
storageService.registerProvider(new MyCustomProvider());

// Set as default (optional)
storageService.setDefaultProvider('my-custom-provider');
```

### Using the Caching Provider

The `CachingStorageProvider` adds a caching layer to any storage provider:

```typescript
import { CachingStorageProvider, VercelBlobProvider, storageService } from '@/services/storage';

// Create a cached version of the Vercel Blob provider
const cachedProvider = new CachingStorageProvider(
  new VercelBlobProvider(),
  3600 // Cache TTL in seconds (1 hour)
);

// Register the cached provider
storageService.registerProvider(cachedProvider);

// Set as default (optional)
storageService.setDefaultProvider(cachedProvider.name);
```

## API Reference

### StorageService

- `registerProvider(provider: StorageProvider): void` - Register a storage provider
- `setDefaultProvider(providerName: string): void` - Set the default provider
- `getProvider(providerName?: string): StorageProvider` - Get a provider by name
- `store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult>` - Store a file
- `retrieve(id: string, providerName?: string): Promise<Blob | null>` - Retrieve a file
- `delete(id: string, providerName?: string): Promise<boolean>` - Delete a file
- `list(filter?: StorageFilter, providerName?: string): Promise<string[]>` - List files
- `getUrl(id: string, providerName?: string): string` - Get the URL for a file

### StorageOptions

- `contentType?: string` - Content type of the file
- `metadata?: Record<string, string>` - Additional metadata for the file
- `cacheControl?: string` - Cache control header
- `ttl?: number` - Time to live in seconds for cached content

### StorageFilter

- `prefix?: string` - Prefix to filter files by
- `limit?: number` - Maximum number of results to return
- `offset?: number` - Number of results to skip

### StorageResult

- `id: string` - Unique identifier for the file
- `url: string` - Public URL for accessing the file
- `contentType: string` - Content type of the file
- `size: number` - Size of the file in bytes
- `metadata?: Record<string, string>` - Additional metadata for the file
- `createdAt: Date` - When the file was created

## Testing

You can test the storage service using the provided test page:

```
/test/test-storage-service.html
```

This page allows you to:
- Upload files
- List files
- Retrieve files
- Get URLs for files
- View storage service information

## Implementation Details

The storage service is implemented using the provider pattern, which allows for easy extension and customization. The current implementation includes:

- `VercelBlobProvider`: Uses Vercel Blob for file storage
- `CachingStorageProvider`: Adds caching to any provider

The S3 implementation has been removed as per requirements, but the architecture allows for easy addition of other providers in the future.