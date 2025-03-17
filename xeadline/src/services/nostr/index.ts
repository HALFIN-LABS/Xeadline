// Export all nostr-related services and utilities
import nostrService from './nostrService';
import { signEvent, UnsignedEvent, SigningResult, SigningOptions } from './eventSigningService';

export {
  nostrService,
  signEvent
};

// Export types
export type { UnsignedEvent, SigningResult, SigningOptions };

export default nostrService;