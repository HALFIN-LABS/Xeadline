/**
 * Storage Service Exports
 *
 * This file exports all the components of the storage service.
 */

// Export types
export * from './types';

// Export providers
export { VercelBlobProvider } from './providers/vercelBlobProvider';
export { CachingStorageProvider } from './providers/cachingStorageProvider';

// Export service
export { StorageService, storageService } from './storageService';

// Default export for convenience
import { storageService as service } from './storageService';
export default { storageService: service };