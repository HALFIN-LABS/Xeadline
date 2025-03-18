# Event Management System Implementation Plan

This document provides a detailed implementation plan for the Event Management System refactor described in [ADR_002_EVENT_MANAGEMENT_REFACTOR.md](./ADR_002_EVENT_MANAGEMENT_REFACTOR.md).

## Project Structure

The new Event Management System will be organized in the following directory structure:

```
src/
└── services/
    └── eventManagement/
        ├── index.ts                  # Public API exports
        ├── types.ts                  # Shared type definitions
        ├── EventManager.ts           # Main coordinator class
        ├── ValidationService.ts      # Event validation
        ├── QueueManager.ts           # Event queue management
        ├── SigningService.ts         # Event signing
        ├── PublishingService.ts      # Event publishing
        ├── EventMonitor.ts           # Monitoring and metrics
        ├── errors.ts                 # Error definitions
        ├── constants.ts              # Constants and configuration
        └── adapters/                 # Adapters for existing code
            ├── useEventSigningAdapter.ts  # Adapter for the hook
            └── legacyAdapter.ts      # General adapter for legacy code
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Type Definitions

Create the foundational type definitions in `types.ts`:

```typescript
// Event types
export interface UnsignedEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey: string;
}

export interface Event extends UnsignedEvent {
  id: string;
  sig: string;
}

// Result types
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface SigningResult {
  success: boolean;
  event?: Event;
  error?: string;
  needsPassword?: boolean;
}

export interface PublishResult {
  success: boolean;
  publishedTo: string[];
  error?: string;
}

export interface SignAndPublishResult extends SigningResult {
  publishedTo?: string[];
}

// Options types
export interface SigningOptions {
  privateKey?: string;
  password?: string;
  timeout?: number;
}

export interface PublishOptions {
  relays?: string[];
  timeout?: number;
  retries?: number;
}

export interface SignAndPublishOptions extends SigningOptions, PublishOptions {
  skipPublish?: boolean;
}

// Queue types
export enum Priority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

export interface QueuedEvent {
  id: string;
  event: UnsignedEvent;
  priority: Priority;
  createdAt: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

// Error types
export enum ErrorType {
  VALIDATION = 'validation',
  SIGNING = 'signing',
  PUBLISHING = 'publishing',
  QUEUE = 'queue',
  GENERAL = 'general'
}

export interface ValidationError {
  field: string;
  message: string;
}

// Monitoring types
export interface EventStatus {
  id: string;
  status: 'created' | 'validated' | 'queued' | 'signed' | 'published' | 'failed';
  createdAt: number;
  updatedAt: number;
  error?: string;
  publishedTo?: string[];
}

export interface EventMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  publishSuccessRate: number;
}
```

#### 1.2 Error Definitions

Create standardized error classes in `errors.ts`:

```typescript
import { ErrorType, ValidationError } from './types';

export class EventManagementError extends Error {
  type: ErrorType;
  
  constructor(message: string, type: ErrorType = ErrorType.GENERAL) {
    super(message);
    this.name = 'EventManagementError';
    this.type = type;
  }
}

export class ValidationFailedError extends EventManagementError {
  errors: ValidationError[];
  
  constructor(message: string, errors: ValidationError[]) {
    super(message, ErrorType.VALIDATION);
    this.name = 'ValidationFailedError';
    this.errors = errors;
  }
}

export class SigningFailedError extends EventManagementError {
  constructor(message: string) {
    super(message, ErrorType.SIGNING);
    this.name = 'SigningFailedError';
  }
}

export class PublishingFailedError extends EventManagementError {
  constructor(message: string) {
    super(message, ErrorType.PUBLISHING);
    this.name = 'PublishingFailedError';
  }
}

export class QueueError extends EventManagementError {
  constructor(message: string) {
    super(message, ErrorType.QUEUE);
    this.name = 'QueueError';
  }
}
```

#### 1.3 Constants and Configuration

Define constants and configuration in `constants.ts`:

```typescript
// Default timeout values (in milliseconds)
export const DEFAULT_SIGNING_TIMEOUT = 15000;
export const DEFAULT_PUBLISHING_TIMEOUT = 10000;
export const DEFAULT_QUEUE_PROCESSING_INTERVAL = 100;

// Retry configuration
export const MAX_SIGNING_RETRIES = 3;
export const MAX_PUBLISHING_RETRIES = 5;
export const RETRY_BACKOFF_FACTOR = 2;

// Queue configuration
export const MAX_QUEUE_SIZE = 100;
export const MAX_CONCURRENT_PROCESSING = 5;

// Event types
export const EVENT_TYPES = {
  // Standard Nostr event kinds (NIP-01)
  TEXT_NOTE: 1,
  RECOMMEND_RELAY: 2,
  CONTACT_LIST: 3,
  DIRECT_MESSAGE: 4,
  DELETE: 5,
  REPOST: 6,
  REACTION: 7,
  BADGE_AWARD: 8,
  
  // Xeadline-specific event kinds
  TOPIC_DEFINITION: 34550,  // NIP-72 topic definition
  TOPIC_APPROVAL: 4550,     // NIP-72 approval event
  TOPIC_POST: 1,            // Regular post in a topic (uses standard kind 1 with topic tag)
  TOPIC_VOTE: 7,            // Vote on a topic post (uses standard kind 7 with +/-)
  
  // Other potentially useful event kinds
  POLL: 1068,               // NIP-88 poll
  POLL_RESPONSE: 1018,      // NIP-88 poll response
  LONG_FORM: 30023,         // NIP-23 long-form content
  HIGHLIGHT: 9802,          // NIP-84 highlight
  COMMUNITY_LIST: 10004,    // NIP-51 list of communities
  
  // Replaceable events
  PROFILE_METADATA: 0,      // NIP-01 profile metadata
  RELAY_LIST: 10002,        // NIP-65 relay list
  
  // Zap-related events (if Lightning integration is planned)
  ZAP_REQUEST: 9734,        // NIP-57 zap request
  ZAP_RECEIPT: 9735,        // NIP-57 zap receipt
};
```

#### 1.4 ValidationService Implementation

Implement the validation service in `ValidationService.ts`:

```typescript
import { UnsignedEvent, ValidationResult, ValidationError } from './types';
import { ValidationFailedError } from './errors';

export interface EventValidator {
  validate(event: UnsignedEvent): Promise<ValidationResult>;
}

export class ValidationService {
  private validators: EventValidator[] = [];
  
  constructor() {
    // Register default validators
    this.registerValidator(new StructureValidator());
    this.registerValidator(new ContentValidator());
  }
  
  registerValidator(validator: EventValidator): void {
    this.validators.push(validator);
  }
  
  async validate(event: UnsignedEvent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Run all validators
    for (const validator of this.validators) {
      const result = await validator.validate(event);
      if (!result.valid && result.errors) {
        errors.push(...result.errors);
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationFailedError('Event validation failed', errors);
    }
    
    return { valid: true };
  }
}

// Default validators
class StructureValidator implements EventValidator {
  async validate(event: UnsignedEvent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required fields
    if (typeof event.kind !== 'number') {
      errors.push({ field: 'kind', message: 'Event kind must be a number' });
    }
    
    if (typeof event.created_at !== 'number') {
      errors.push({ field: 'created_at', message: 'Event created_at must be a number' });
    }
    
    if (!Array.isArray(event.tags)) {
      errors.push({ field: 'tags', message: 'Event tags must be an array' });
    } else {
      // Validate tag structure
      for (let i = 0; i < event.tags.length; i++) {
        const tag = event.tags[i];
        if (!Array.isArray(tag)) {
          errors.push({ field: `tags[${i}]`, message: 'Tag must be an array' });
        }
      }
    }
    
    if (typeof event.content !== 'string') {
      errors.push({ field: 'content', message: 'Event content must be a string' });
    }
    
    if (typeof event.pubkey !== 'string' || event.pubkey.length !== 64) {
      errors.push({ field: 'pubkey', message: 'Event pubkey must be a valid 32-byte hex string' });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

class ContentValidator implements EventValidator {
  async validate(event: UnsignedEvent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Content validation based on event kind
    switch (event.kind) {
      case 1: // Text note
        if (event.content.length > 10000) {
          errors.push({ field: 'content', message: 'Text note content exceeds maximum length (10000 characters)' });
        }
        break;
      
      case 4: // Direct message
        if (event.content.length === 0) {
          errors.push({ field: 'content', message: 'Direct message content cannot be empty' });
        }
        
        // Check for 'p' tag (recipient)
        const hasRecipient = event.tags.some(tag => tag[0] === 'p' && tag[1]?.length === 64);
        if (!hasRecipient) {
          errors.push({ field: 'tags', message: 'Direct message must include a recipient (p tag)' });
        }
        break;
      
      case 34550: // Topic definition (NIP-72)
        // Validate topic definition structure
        try {
          // Topic definition should have valid JSON content
          const topicData = JSON.parse(event.content);
          
          // Check required fields
          if (!topicData.name) {
            errors.push({ field: 'content.name', message: 'Topic name is required' });
          } else if (topicData.name.length > 100) {
            errors.push({ field: 'content.name', message: 'Topic name exceeds maximum length (100 characters)' });
          }
          
          if (!topicData.description) {
            errors.push({ field: 'content.description', message: 'Topic description is required' });
          } else if (topicData.description.length > 500) {
            errors.push({ field: 'content.description', message: 'Topic description exceeds maximum length (500 characters)' });
          }
          
          // Check for moderator tags
          const hasModerators = event.tags.some(tag => tag[0] === 'p');
          if (!hasModerators) {
            errors.push({ field: 'tags', message: 'Topic definition must include at least one moderator (p tag)' });
          }
        } catch (error) {
          errors.push({ field: 'content', message: 'Topic definition must contain valid JSON' });
        }
        break;
      
      case 4550: // Topic approval (NIP-72)
        // Check for event reference
        const hasEventRef = event.tags.some(tag => tag[0] === 'e');
        if (!hasEventRef) {
          errors.push({ field: 'tags', message: 'Topic approval must reference an event (e tag)' });
        }
        
        // Check for topic reference
        const hasTopicRef = event.tags.some(tag => tag[0] === 'a');
        if (!hasTopicRef) {
          errors.push({ field: 'tags', message: 'Topic approval must reference a topic (a tag)' });
        }
        break;
      
      case 7: // Reaction (used for topic votes)
        // Check for event reference
        const hasReactionEventRef = event.tags.some(tag => tag[0] === 'e');
        if (!hasReactionEventRef) {
          errors.push({ field: 'tags', message: 'Reaction must reference an event (e tag)' });
        }
        
        // Check content is a valid reaction
        if (!['+', '-', ''].includes(event.content)) {
          errors.push({ field: 'content', message: 'Reaction content must be "+", "-", or empty' });
        }
        break;
      
      case 1068: // Poll (NIP-88)
        try {
          // Poll should have valid JSON content
          const pollData = JSON.parse(event.content);
          
          // Check required fields
          if (!pollData.question) {
            errors.push({ field: 'content.question', message: 'Poll question is required' });
          }
          
          if (!Array.isArray(pollData.options) || pollData.options.length < 2) {
            errors.push({ field: 'content.options', message: 'Poll must have at least 2 options' });
          }
        } catch (error) {
          errors.push({ field: 'content', message: 'Poll must contain valid JSON' });
        }
        break;
      
      case 1018: // Poll response (NIP-88)
        // Check for poll reference
        const hasPollRef = event.tags.some(tag => tag[0] === 'e');
        if (!hasPollRef) {
          errors.push({ field: 'tags', message: 'Poll response must reference a poll (e tag)' });
        }
        
        // Check for response tag
        const hasResponse = event.tags.some(tag => tag[0] === 'response');
        if (!hasResponse) {
          errors.push({ field: 'tags', message: 'Poll response must include a response tag' });
        }
        break;
      
      case 9734: // Zap request (NIP-57)
        // Check for recipient
        const hasZapRecipient = event.tags.some(tag => tag[0] === 'p');
        if (!hasZapRecipient) {
          errors.push({ field: 'tags', message: 'Zap request must include a recipient (p tag)' });
        }
        
        // Check for relay tag
        const hasRelayTag = event.tags.some(tag => tag[0] === 'relays');
        if (!hasRelayTag) {
          errors.push({ field: 'tags', message: 'Zap request must include relays tag' });
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
```

#### 1.5 SigningService Implementation

Implement the signing service in `SigningService.ts`:

```typescript
import { UnsignedEvent, Event, SigningResult, SigningOptions } from './types';
import { SigningFailedError } from './errors';
import { MAX_SIGNING_RETRIES, DEFAULT_SIGNING_TIMEOUT } from './constants';
import { getEventHash, schnorr } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { retrievePrivateKey } from '../../utils/nostrKeys';

export interface SigningMethod {
  canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean>;
  sign(event: UnsignedEvent, options?: SigningOptions): Promise<SigningResult>;
}

export class SigningService {
  private methods: SigningMethod[] = [];
  
  constructor() {
    // Register default signing methods
    this.registerSigningMethod(new ExtensionSigningMethod());
    this.registerSigningMethod(new PrivateKeySigningMethod());
    this.registerSigningMethod(new EncryptedKeySigningMethod());
  }
  
  registerSigningMethod(method: SigningMethod): void {
    this.methods.push(method);
  }
  
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    const { retryCount = 0 } = options;
    
    try {
      // Try each signing method in order
      for (const method of this.methods) {
        if (await method.canSign(event, options)) {
          return await method.sign(event, options);
        }
      }
      
      // If we get here, no method could sign
      if (options.password) {
        return {
          success: false,
          error: 'Invalid password or no encrypted key found'
        };
      } else {
        return {
          success: false,
          needsPassword: true,
          error: 'Password required to decrypt private key'
        };
      }
    } catch (error) {
      console.error('Error in SigningService:', error);
      
      // Retry if we haven't exceeded the maximum retries
      if (retryCount < MAX_SIGNING_RETRIES) {
        console.log(`Retrying event signing (${retryCount + 1}/${MAX_SIGNING_RETRIES})...`);
        return this.sign(event, {
          ...options,
          retryCount: retryCount + 1
        });
      }
      
      return {
        success: false,
        error: `Failed to sign event after ${MAX_SIGNING_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  async getPublicKey(): Promise<string> {
    // Try to get from extension first
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        const publicKey = await Promise.race([
          window.nostr.getPublicKey(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Extension getPublicKey timed out')), 5000)
          )
        ]);
        
        if (publicKey) {
          return publicKey;
        }
      } catch (error) {
        console.warn('Failed to get public key from extension:', error);
      }
    }
    
    // Fallback to other methods
    // This would need to be implemented based on your authentication system
    throw new SigningFailedError('No method available to get public key');
  }
}

// Signing methods
class ExtensionSigningMethod implements SigningMethod {
  async canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean> {
    if (typeof window === 'undefined' || !window.nostr) {
      return false;
    }
    
    try {
      // Check if the extension has the required methods
      if (!window.nostr.getPublicKey || !window.nostr.signEvent) {
        return false;
      }
      
      // Try to get the public key to verify the extension is working
      const publicKey = await Promise.race([
        window.nostr.getPublicKey(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Extension getPublicKey timed out')), 5000)
        )
      ]);
      
      return !!publicKey;
    } catch (error) {
      console.warn('Extension signing method not available:', error);
      return false;
    }
  }
  
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    const timeout = options.timeout || DEFAULT_SIGNING_TIMEOUT;
    
    try {
      // Get the public key from the extension
      const extensionPubkey = await Promise.race([
        window.nostr.getPublicKey(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Getting public key from extension timed out')), 5000)
        )
      ]);
      
      if (!extensionPubkey) {
        throw new SigningFailedError('Failed to get public key from extension');
      }
      
      // Create a properly formatted event for the extension
      const eventToSign = {
        kind: event.kind,
        created_at: event.created_at,
        tags: event.tags,
        content: event.content,
        pubkey: extensionPubkey
      };
      
      // Sign the event with timeout
      const signedEvent = await Promise.race([
        window.nostr.signEvent(eventToSign),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Extension signing timed out')), timeout)
        )
      ]);
      
      // Verify that the signed event has all required fields
      if (!signedEvent || !signedEvent.id || !signedEvent.sig) {
        throw new SigningFailedError('Invalid signed event from extension');
      }
      
      return {
        success: true,
        event: signedEvent
      };
    } catch (error) {
      throw new SigningFailedError(`Extension signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class PrivateKeySigningMethod implements SigningMethod {
  async canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean> {
    return !!options?.privateKey;
  }
  
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    if (!options.privateKey) {
      return {
        success: false,
        error: 'No private key provided'
      };
    }
    
    try {
      // Create a copy of the event
      const signedEvent: Event = {
        ...event,
        id: '',
        sig: ''
      };
      
      // Generate the event ID
      signedEvent.id = getEventHash(signedEvent);
      
      // Sign the event
      const privateKeyBytes = hexToBytes(options.privateKey);
      const sig = schnorr.sign(signedEvent.id, privateKeyBytes);
      signedEvent.sig = Buffer.from(sig).toString('hex');
      
      return {
        success: true,
        event: signedEvent
      };
    } catch (error) {
      throw new SigningFailedError(`Private key signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class EncryptedKeySigningMethod implements SigningMethod {
  async canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean> {
    return !!options?.password;
  }
  
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    if (!options.password) {
      return {
        success: false,
        needsPassword: true,
        error: 'Password required to decrypt private key'
      };
    }
    
    try {
      // Decrypt the private key
      const decryptedKey = await retrievePrivateKey(options.password);
      
      if (!decryptedKey) {
        return {
          success: false,
          error: 'Invalid password or no encrypted key found'
        };
      }
      
      // Use the PrivateKeySigningMethod to sign with the decrypted key
      const privateKeyMethod = new PrivateKeySigningMethod();
      return privateKeyMethod.sign(event, {
        ...options,
        privateKey: decryptedKey
      });
    } catch (error) {
      throw new SigningFailedError(`Encrypted key signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
```

### Phase 2: Queue Management (Week 2)

#### 2.1 QueueManager Implementation

Implement the queue manager in `QueueManager.ts`:

```typescript
import { UnsignedEvent, QueuedEvent, Priority } from './types';
import { QueueError } from './errors';
import { MAX_QUEUE_SIZE, MAX_CONCURRENT_PROCESSING, DEFAULT_QUEUE_PROCESSING_INTERVAL } from './constants';
import { v4 as uuidv4 } from 'uuid';

export class QueueManager {
  private queue: QueuedEvent[] = [];
  private processing: Set<string> = new Set();
  private processingInterval: NodeJS.Timeout | null = null;
  private eventProcessors: Map<string, (event: QueuedEvent) => Promise<void>> = new Map();
  
  constructor() {
    // Start processing queue
    this.startProcessing();
  }
  
  async enqueue(event: UnsignedEvent, priority: Priority = Priority.NORMAL): Promise<QueuedEvent> {
    // Check if queue is full
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new QueueError(`Queue is full (max size: ${MAX_QUEUE_SIZE})`);
    }
    
    // Create queued event
    const queuedEvent: QueuedEvent = {
      id: uuidv4(),
      event,
      priority,
      createdAt: Date.now(),
      status: 'queued'
    };
    
    // Add to queue based on priority
    if (priority === Priority.HIGH) {
      this.queue.unshift(queuedEvent);
    } else {
      this.queue.push(queuedEvent);
    }
    
    return queuedEvent;
  }
  
  async dequeue(): Promise<QueuedEvent | null> {
    // Sort queue by priority and creation time
    this.queue.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.createdAt - b.createdAt;
      }
      
      if (a.priority === Priority.HIGH) return -1;
      if (b.priority === Priority.HIGH) return 1;
      if (a.priority === Priority.NORMAL) return -1;
      return 1;
    });
    
    // Get next event
    const event = this.queue.shift();
    if (!event) {
      return null;
    }
    
    // Mark as processing
    event.status = 'processing';
    this.processing.add(event.id);
    
    return event;
  }
  
  registerProcessor(processor: (event: QueuedEvent) => Promise<void>): string {
    const id = uuidv4();
    this.eventProcessors.set(id, processor);
    return id;
  }
  
  unregisterProcessor(id: string): void {
    this.eventProcessors.delete(id);
  }
  
  async getQueueStatus(): Promise<{
    queueLength: number;
    processing: number;
    maxSize: number;
  }> {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxSize: MAX_QUEUE_SIZE
    };
  }
  
  async clearQueue(): Promise<void> {
    this.queue = [];
  }
  
  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      // Skip if we're already processing the maximum number of events
      if (this.processing.size >= MAX_CONCURRENT_PROCESSING) {
        return;
      }
      
      // Skip if there are no processors
      if (this.eventProcessors.size === 0) {
        return;
      }
      
      // Get next event
      const event = await this.dequeue();
      if (!event) {
        return;
      }
      
      // Process event with all processors
      for (const processor of this.eventProcessors.values()) {
        try {
          await processor(event);
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
        }
      }
      
      // Mark as completed
      this.processing.delete(event.id);
    }, DEFAULT_QUEUE_PROCESSING_INTERVAL);
  }
  
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}
```

#### 2.2 PublishingService Implementation

Implement the publishing service in `PublishingService.ts`:

```typescript
import { Event, PublishResult, PublishOptions } from './types';
import { PublishingFailedError } from './errors';
import { MAX_PUBLISHING_RETRIES, DEFAULT_PUBLISHING_TIMEOUT, RETRY_BACKOFF_FACTOR } from './constants';
import nostrService from '../nostr/nostrService';

export class PublishingService {
  private publishHistory: Map<string, { 
    event: Event, 
    result: PublishResult, 
    timestamp: number 
  }> = new Map();
  
  async publish(event: Event, options: PublishOptions = {}): Promise<PublishResult> {
    const { 
      relays = nostrService.getRelays(), 
      timeout = DEFAULT_PUBLISHING_TIMEOUT,
      retries = MAX_PUBLISHING_RETRIES 
    } = options;
    
    let publishedTo: string[] = [];
    let retryCount = 0;
    let lastError: Error | null = null;
    
    // Try to publish with retries
    while (retryCount <= retries) {
      try {
        // Set timeout for publishing
        const publishPromise = nostrService.publishEvent(event);
        const timeoutPromise = new Promise<string[]>((_, reject) => {
          setTimeout(() => reject(new Error('Publishing timed out')), timeout * Math.pow(RETRY_BACKOFF_FACTOR, retryCount));
        });
        
        // Publish with timeout
        publishedTo = await Promise.race([publishPromise, timeoutPromise]);
        
        // If published to at least one relay, consider it a success
        if (publishedTo.length > 0) {
          break;
        }
        
        // If not published to any relays, retry
        lastError = new PublishingFailedError('Failed to publish to any relays');
        retryCount++;
        
        // Wait before retrying (exponential backoff)
        if (retryCount <= retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(RETRY_BACKOFF_FACTOR, retryCount - 1)));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;
        
        // Wait before retrying (exponential backoff)
        if (retryCount <= retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(RETRY_BACKOFF_FACTOR, retryCount - 1)));
        }
      }
    }
    
    // Create result
    const result: PublishResult = {
      success: publishedTo.length > 0,
      publishedTo,
      error: publishedTo.length === 0 && lastError ? lastError.message : undefined
    };
    
    // Store in history
    this.publishHistory.set(event.id, {
      event,
      result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  async getPublishStatus(eventId: string): Promise<PublishResult | null> {
    const history = this.publishHistory.get(eventId);
    if (!history) {
      return null;
    }
    
    return history.result;
  }
  
  async retryPublish(eventId: string, options: PublishOptions = {}): Promise<PublishResult> {
    const history = this.publishHistory.get(eventId);
    if (!history) {
      throw new PublishingFailedError(`No publish history found for event ${eventId}`);
    }
    
    return this.publish(history.event, options);
  }
}
```

### Phase 3: Event Manager Implementation (Week 3)

#### 3.1 EventMonitor Implementation

Implement the event monitor in `EventMonitor.ts`:

```typescript
import { Event, EventStatus, EventMetrics } from './types';

export class EventMonitor {
  private eventHistory: Map<string, EventStatus> = new Map();
  private metrics: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    processingTimes: number[];
  } = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    processingTimes: []
  };
  
  trackEvent(event: Event, status: EventStatus): void {
    // Update event history
    this.eventHistory.set(event.id, status);
    
    // Update metrics
    if (status.status === 'created') {
      this.metrics.totalEvents++;
    } else if (status.status === 'published') {
      this.metrics.successfulEvents++;
      
      // Calculate processing time
      const created = this.eventHistory.get(event.id);
      if (created) {
        const processingTime = status.updatedAt - created.createdAt;
        this.metrics.processingTimes.push(processingTime);
      }
    } else if (status.status === 'failed') {
      this.metrics.failedEvents++;
    }
  }
  
  getEventHistory(eventId?: string): EventStatus[] {
    if (eventId) {
      const status = this.eventHistory.get(eventId);
      return status ? [status] : [];
    }
    
    return Array.from(this.eventHistory.values());
  }
  
  getMetrics(): EventMetrics {
    const totalEvents = this.metrics.totalEvents;
    const successfulEvents = this.metrics.successfulEvents;
    const failedEvents = this.metrics.failedEvents;
    
    // Calculate average processing time
    const totalProcessingTime = this.metrics.processingTimes.reduce((sum, time) => sum + time, 0);
    const averageProcessingTime = this.metrics.processingTimes.length > 0
      ? totalProcessingTime / this.metrics.processingTimes.length
      : 0;
    
    // Calculate publish success rate
    const publishSuccessRate = totalEvents > 0
      ? successfulEvents / totalEvents
      : 0;
    
    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      averageProcessingTime,
      publishSuccessRate
    };
  }
  
  clearHistory(): void {
    this.eventHistory.clear();
  }
}
```

#### 3.2 EventManager Implementation

Implement the main event manager in `EventManager.ts`:

```typescript
import { 
  UnsignedEvent, 
  Event, 
  SigningOptions, 
  SigningResult, 
  PublishOptions, 
  PublishResult, 
  SignAndPublishOptions, 
  SignAndPublishResult, 
  EventStatus,
  Priority
} from './types';
import { ValidationService } from './ValidationService';
import { SigningService } from './SigningService';
import { PublishingService } from './PublishingService';
import { QueueManager } from './QueueManager';
import { EventMonitor } from './EventMonitor';
import { EventManagementError } from './errors';

export class EventManager {
  private validationService: ValidationService;
  private signingService: SigningService;
  private publishingService: PublishingService;
  private queueManager: QueueManager;
  private eventMonitor: EventMonitor;
  
  constructor() {
    this.validationService = new ValidationService();
    this.signingService = new SigningService();
    this.publishingService = new PublishingService();
    this.queueManager = new QueueManager();
    this.eventMonitor = new EventMonitor();
    
    // Register event processor
    this.queueManager.registerProcessor(async (queuedEvent) => {
      try {
        // Process the event
        const result = await this.processQueuedEvent(queuedEvent);
        
        // Update event status
        if (result.success) {
          this.eventMonitor.trackEvent(result.event!, {
            id: result.event!.id,
            status: 'published',
            createdAt: queuedEvent.createdAt,
            updatedAt: Date.now(),
            publishedTo: result.publishedTo
          });
        } else {
          this.eventMonitor.trackEvent({
            ...queuedEvent.event,
            id: '',
            sig: ''
          } as Event, {
            id: queuedEvent.id,
            status: 'failed',
            createdAt: queuedEvent.createdAt,
            updatedAt: Date.now(),
            error: result.error
          });
        }
      } catch (error) {
        console.error(`Error processing queued event ${queuedEvent.id}:`, error);
      }
    });
  }
  
  async createEvent(kind: number, content: string, tags: string[][] = []): Promise<UnsignedEvent> {
    // Get the current timestamp
    const created_at = Math.floor(Date.now() / 1000);
    
    // Get the public key
    const pubkey = await this.signingService.getPublicKey();
    
    // Create the unsigned event
    const unsignedEvent: UnsignedEvent = {
      kind,
      created_at,
      tags,
      content,
      pubkey
    };
    
    // Track event creation
    this.eventMonitor.trackEvent({
      ...unsignedEvent,
      id: '',
      sig: ''
    } as Event, {
      id: `${pubkey}-${created_at}`,
      status: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return unsignedEvent;
  }
  
  async signEvent(event: UnsignedEvent, options?: SigningOptions): Promise<SigningResult> {
    try {
      // Validate the event
      await this.validationService.validate(event);
      
      // Track event validation
      this.eventMonitor.trackEvent({
        ...event,
        id: '',
        sig: ''
      } as Event, {
        id: `${event.pubkey}-${event.created_at}`,
        status: 'validated',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // Sign the event
      const result = await this.signingService.sign(event, options);
      
      // Track event signing
      if (result.success && result.event) {
        this.eventMonitor.trackEvent(result.event, {
          id: result.event.id,
          status: 'signed',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in signEvent:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  async publishEvent(event: Event, options?: PublishOptions): Promise<PublishResult> {
    try {
      // Publish the event
      const result = await this.publishingService.publish(event, options);
      
      // Track event publishing
      if (result.success) {
        this.eventMonitor.trackEvent(event, {
          id: event.id,
          status: 'published',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          publishedTo: result.publishedTo
        });
      } else {
        this.eventMonitor.trackEvent(event, {
          id: event.id,
          status: 'failed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          error: result.error
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in publishEvent:', error);
      
      return {
        success: false,
        publishedTo: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  async signAndPublishEvent(
    event: UnsignedEvent, 
    options?: SignAndPublishOptions
  ): Promise<SignAndPublishResult> {
    try {
      // Validate the event
      await this.validationService.validate(event);
      
      // Add to queue
      const queuedEvent = await this.queueManager.enqueue(
        event, 
        options?.skipPublish ? Priority.LOW : Priority.NORMAL
      );
      
      // Track event queuing
      this.eventMonitor.trackEvent({
        ...event,
        id: '',
        sig: ''
      } as Event, {
        id: queuedEvent.id,
        status: 'queued',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // If we want immediate processing, process now
      if (options?.skipPublish) {
        // Just sign the event
        const signingResult = await this.signingService.sign(event, options);
        
        return {
          ...signingResult,
          publishedTo: []
        };
      }
      
      // Otherwise, let the queue handle it
      // Return a placeholder result
      return {
        success: true,
        event: undefined,
        publishedTo: [],
        pendingId: queuedEvent.id
      };
    } catch (error) {
      console.error('Error in signAndPublishEvent:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        publishedTo: []
      };
    }
  }
  
  async getEventStatus(id: string): Promise<EventStatus | null> {
    const history = this.eventMonitor.getEventHistory(id);
    return history.length > 0 ? history[0] : null;
  }
  
  async retryEvent(id: string): Promise<SignAndPublishResult> {
    const status = await this.getEventStatus(id);
    if (!status) {
      throw new EventManagementError(`No event found with ID ${id}`);
    }
    
    if (status.status === 'published') {
      throw new EventManagementError(`Event ${id} is already published`);
    }
    
    // Get the event from publish history
    const publishStatus = await this.publishingService.getPublishStatus(id);
    if (!publishStatus) {
      throw new EventManagementError(`No publish history found for event ${id}`);
    }
    
    // Retry publishing
    const result = await this.publishingService.retryPublish(id);
    
    return {
      success: result.success,
      publishedTo: result.publishedTo,
      error: result.error
    };
  }
  
  async cancelEvent(id: string): Promise<boolean> {
    // Not implemented yet
    throw new EventManagementError('Event cancellation not implemented');
  }
  
  private async processQueuedEvent(queuedEvent: any): Promise<SignAndPublishResult> {
    try {
      // Sign the event
      const signingResult = await this.signingService.sign(queuedEvent.event);
      
      if (!signingResult.success || !signingResult.event) {
        return {
          ...signingResult,
          publishedTo: []
        };
      }
      
      // Publish the event
      const publishResult = await this.publishingService.publish(signingResult.event);
      
      return {
        ...signingResult,
        publishedTo: publishResult.publishedTo,
        error: publishResult.error
      };
    } catch (error) {
      console.error('Error processing queued event:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        publishedTo: []
      };
    }
  }
}
```

### Phase 4: Adapters and Integration (Week 4)

#### 4.1 Legacy Adapter Implementation

Implement the legacy adapter in `adapters/legacyAdapter.ts`:

```typescript
import { EventManager } from '../EventManager';
import { UnsignedEvent, Event, SigningOptions, PublishOptions } from '../types';
import { signEvent as oldSignEvent } from '../../nostr/eventSigningService';
import nostrService from '../../nostr/nostrService';

/**
 * Adapter to provide backward compatibility with existing code
 */
export class LegacyAdapter {
  private eventManager: EventManager;
  
  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
  }
  
  /**
   * Adapter for the old signEvent function
   */
  async signEvent(
    unsignedEvent: UnsignedEvent,
    options?: SigningOptions
  ): Promise<any> {
    // Map to new format
    const result = await this.eventManager.signEvent(unsignedEvent, options);
    
    // Map back to old format
    return {
      success: result.success,
      event: result.event,
      error: result.error,
      needsPassword: result.needsPassword
    };
  }
  
  /**
   * Adapter for the old publishEvent function
   */
  async publishEvent(event: Event): Promise<string[]> {
    // Map to new format
    const result = await this.eventManager.publishEvent(event);
    
    // Map back to old format
    return result.publishedTo;
  }
}

/**
 * Create drop-in replacements for existing functions
 */
export function createLegacyFunctions(eventManager: EventManager): {
  signEvent: typeof oldSignEvent;
  publishEvent: typeof nostrService.publishEvent;
} {
  const adapter = new LegacyAdapter(eventManager);
  
  return {
    signEvent: adapter.signEvent.bind(adapter),
    publishEvent: adapter.publishEvent.bind(adapter)
  };
}
```

#### 4.2 Hook Adapter Implementation

Implement the hook adapter in `adapters/useEventSigningAdapter.ts`:

```typescript
import { useCallback, useState } from 'react';
import { EventManager } from '../EventManager';
import { UnsignedEvent, SigningOptions, PublishOptions, SignAndPublishOptions } from '../types';
import { usePasswordModal } from '../../../contexts/PasswordModalContext';

/**
 * Adapter hook to provide backward compatibility with useEventSigning
 */
export function useEventSigningAdapter(eventManager: EventManager) {
  const passwordModal = usePasswordModal();
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  
  /**
   * Sign an event with password prompt if needed
   */
  const signEventWithPassword = useCallback(async (
    unsignedEvent: UnsignedEvent,
    purpose: string = 'sign this event',
    options: SigningOptions = {}
  ) => {
    try {
      setIsSigningInProgress(true);
      
      // Try to sign directly first
      const result = await eventManager.signEvent(unsignedEvent, options);
      
      // If successful or error is not related to password, return the result
      if (result.success || !result.needsPassword) {
        return result;
      }
      
      // If a password is needed, show the password modal
      try {
        const password = await passwordModal.showPasswordModal(purpose);
        
        // Try to sign with the password
        return await eventManager.signEvent(unsignedEvent, {
          ...options,
          password
        });
      } catch (passwordError) {
        console.error('Password entry cancelled or failed:', passwordError);
        
        // User cancelled or other error
        return {
          success: false,
          error: 'Password entry cancelled'
        };
      }
    } finally {
      setIsSigningInProgress(false);
    }
  }, [eventManager, passwordModal]);
  
  /**
   * Sign and publish an event in one operation
   */
  const signAndPublishEvent = useCallback(async (
    unsignedEvent: UnsignedEvent,
    purpose: string = 'sign and publish this event',
    options: SignAndPublishOptions = {}
  ) => {
    // First sign the event
    const signingResult = await signEventWithPassword(unsignedEvent, purpose, options);
    
    // If signing failed, return the result
    if (!signingResult.success || !signingResult.event) {
      return {
        ...signingResult,
        publishedTo: []
      };
    }
    
    // If skipPublish is true, return the signed event without publishing
    if (options.skipPublish) {
      return {
        ...signingResult,
        publishedTo: []
      };
    }
    
    // Publish the event
    const publishResult = await eventManager.publishEvent(signingResult.event, options);
    
    // Return combined result
    return {
      ...signingResult,
      publishedTo: publishResult.publishedTo,
      error: publishResult.error
    };
  }, [eventManager, signEventWithPassword]);
  
  return {
    signEventWithPassword,
    signAndPublishEvent,
    isSigningInProgress
  };
}
```

#### 4.3 Public API Implementation

Implement the public API in `index.ts`:

```typescript
import { EventManager } from './EventManager';
import { ValidationService } from './ValidationService';
import { SigningService } from './SigningService';
import { PublishingService } from './PublishingService';
import { QueueManager } from './QueueManager';
import { EventMonitor } from './EventMonitor';
import { createLegacyFunctions } from './adapters/legacyAdapter';
import { useEventSigningAdapter } from './adapters/useEventSigningAdapter';

// Export types
export * from './types';
export * from './errors';

// Create singleton instance
const eventManager = new EventManager();

// Create legacy functions
const { signEvent, publishEvent } = createLegacyFunctions(eventManager);

// Export public API
export {
  eventManager,
  signEvent,
  publishEvent,
  useEventSigningAdapter,
  ValidationService,
  SigningService,
  PublishingService,
  QueueManager,
  EventMonitor
};
```

## Migration Strategy

### Step 1: Initial Setup (Week 5)

1. Create the new directory structure
2. Implement the core services
3. Add unit tests for all components
4. Create the legacy adapters

### Step 2: Pilot Migration (Week 6)

1. Identify a non-critical component for initial migration
2. Update the component to use the new EventManager
3. Test thoroughly in development
4. Monitor performance and fix issues

### Step 3: Gradual Rollout (Weeks 7-8)

1. Update the useEventSigning hook to use the adapter
2. Migrate Redux slices to use the new EventManager
3. Update remaining components one by one
4. Add feature flags to control the rollout

### Step 4: Full Migration (Week 9)

1. Remove legacy code
2. Update documentation
3. Finalize the migration

## Testing Strategy

1. **Unit Tests**: Test each service in isolation
2. **Integration Tests**: Test the EventManager with mocked services
3. **End-to-End Tests**: Test the complete system with real events
4. **Performance Tests**: Measure throughput and latency
5. **Stress Tests**: Test under high load conditions

## Monitoring and Metrics

1. **Event Success Rate**: Percentage of events successfully published
2. **Processing Time**: Average time from creation to publishing
3. **Queue Size**: Number of events in the queue
4. **Error Rate**: Percentage of events that fail
5. **Retry Rate**: Percentage of events that require retries