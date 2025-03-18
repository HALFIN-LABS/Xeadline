# Architectural Decision Record: Event Management Refactor

## Status
Proposed

## Context
The current event handling system in Xeadline is scattered across multiple components, leading to inconsistent error handling, limited retry mechanisms, and no centralized validation or queue management. This makes it difficult to maintain reliability and debug issues with Nostr event creation, signing, and publishing.

## Current System Analysis

After examining the codebase, we've identified several issues with the current event management approach:

### Current Implementation Issues

- **Scattered Implementation**: Event handling logic is spread across multiple files:
  - `eventSigningService.ts` handles signing but with limited error recovery
  - `nostrService.ts` handles publishing with basic retry logic
  - `useEventSigning.ts` hook combines signing and publishing with its own retry logic
  - Various components and Redux slices implement their own event creation patterns

- **Inconsistent Error Handling**: Different components handle errors differently:
  - Some use try/catch blocks with console.error
  - Others return error objects
  - Some implement retries, others don't

- **Limited Validation**: No centralized validation for event structure or content

- **No Queue Management**: Events are processed immediately, which can lead to:
  - Rate limiting issues with relays
  - Poor performance during high event volume
  - No prioritization of critical events

- **Debugging Challenges**: Difficult to trace event lifecycle across the system

## Decision

We will implement a centralized Event Management System with clear separation of concerns, following a modular architecture that provides consistent event handling, validation, queuing, and publishing across the application.

## Proposed Architecture

### 1. System Components

The new Event Management System will consist of the following core components:

#### 1.1 EventManager

The central coordinator for all event operations, providing a unified API for the application.

**Responsibilities**:
- Coordinate the event lifecycle from creation to publishing
- Provide a simple, consistent API for components
- Handle error recovery and retries
- Maintain event state and history
- Provide observability into event processing

**API**:
```typescript
class EventManager {
  // Core methods
  async createEvent(kind: number, content: string, tags: string[][]): Promise<UnsignedEvent>;
  async signEvent(event: UnsignedEvent, options?: SigningOptions): Promise<SigningResult>;
  async publishEvent(event: Event): Promise<PublishResult>;
  async signAndPublishEvent(event: UnsignedEvent, options?: SignAndPublishOptions): Promise<SignAndPublishResult>;
  
  // Utility methods
  async getEventStatus(id: string): Promise<EventStatus>;
  async retryEvent(id: string): Promise<SignAndPublishResult>;
  async cancelEvent(id: string): Promise<boolean>;
}
```

#### 1.2 ValidationService

Ensures events conform to Nostr specifications and application requirements.

**Responsibilities**:
- Validate event structure according to NIP specifications
- Enforce application-specific validation rules
- Prevent malformed events from being processed

**API**:
```typescript
class ValidationService {
  async validate(event: UnsignedEvent): Promise<ValidationResult>;
  registerValidator(validator: EventValidator): void;
}

interface EventValidator {
  validate(event: UnsignedEvent): Promise<ValidationResult>;
}
```

#### 1.3 QueueManager

Manages event processing queues to ensure reliable delivery and prevent system overload.

**Responsibilities**:
- Queue events for processing
- Implement prioritization for critical events
- Handle rate limiting
- Provide persistence for events in case of application restart
- Manage concurrency

**API**:
```typescript
class QueueManager {
  async enqueue(event: UnsignedEvent, priority?: Priority): Promise<QueuedEvent>;
  async dequeue(): Promise<QueuedEvent | null>;
  async getQueueStatus(): Promise<QueueStatus>;
  async clearQueue(): Promise<void>;
}

enum Priority {
  HIGH,
  NORMAL,
  LOW
}
```

#### 1.4 SigningService

Handles all event signing operations with support for multiple signing methods.

**Responsibilities**:
- Sign events using available methods (extension, private key, etc.)
- Handle authentication and key management
- Implement secure signing workflows
- Provide consistent error handling

**API**:
```typescript
class SigningService {
  async sign(event: UnsignedEvent, options?: SigningOptions): Promise<SigningResult>;
  async getPublicKey(): Promise<string>;
  registerSigningMethod(method: SigningMethod): void;
}

interface SigningMethod {
  canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean>;
  sign(event: UnsignedEvent, options?: SigningOptions): Promise<SigningResult>;
}
```

#### 1.5 PublishingService

Manages reliable event publishing to Nostr relays.

**Responsibilities**:
- Publish events to configured relays
- Implement smart retry logic
- Track publishing status
- Handle relay selection and fallback

**API**:
```typescript
class PublishingService {
  async publish(event: Event): Promise<PublishResult>;
  async getPublishStatus(eventId: string): Promise<PublishStatus>;
  async retryPublish(eventId: string): Promise<PublishResult>;
}
```

#### 1.6 EventMonitor

Provides observability into the event system for debugging and analytics.

**Responsibilities**:
- Track event lifecycle
- Collect metrics on success/failure rates
- Provide debugging information
- Log event history

**API**:
```typescript
class EventMonitor {
  trackEvent(event: Event, status: EventStatus): void;
  getEventHistory(eventId?: string): EventHistory[];
  getMetrics(): EventMetrics;
}
```

### 2. Data Flow

The event lifecycle will follow this flow:

1. **Creation**: Component calls `EventManager.createEvent()` or `EventManager.signAndPublishEvent()`
2. **Validation**: `ValidationService` validates the event structure and content
3. **Queueing**: `QueueManager` adds the event to the processing queue
4. **Signing**: `SigningService` signs the event using the appropriate method
5. **Publishing**: `PublishingService` publishes the event to relays
6. **Monitoring**: `EventMonitor` tracks the event throughout its lifecycle

### 3. Error Handling Strategy

The new system will implement a comprehensive error handling strategy:

1. **Categorized Errors**: All errors will be categorized (validation, signing, network, etc.)
2. **Retry Policies**: Different retry policies based on error type
3. **Fallback Mechanisms**: Automatic fallbacks for different failure scenarios
4. **User Feedback**: Clear error messages for user-facing errors
5. **Logging**: Detailed error logging for debugging

### 4. Implementation Approach

We will implement this system in phases:

#### Phase 1: Core Infrastructure
- Create the basic `EventManager` class
- Implement `ValidationService` with basic validators
- Create simple `SigningService` that wraps existing functionality

#### Phase 2: Queue Management
- Implement `QueueManager` with in-memory queue
- Add prioritization logic
- Integrate with `EventManager`

#### Phase 3: Publishing Enhancements
- Implement `PublishingService` with improved retry logic
- Add relay selection strategy
- Integrate with `EventManager`

#### Phase 4: Monitoring & Observability
- Implement `EventMonitor`
- Add metrics collection
- Create debugging tools

### 5. Migration Strategy

To minimize disruption, we'll follow this migration strategy:

1. **Parallel Implementation**: Build the new system alongside the existing one
2. **Adapter Layer**: Create adapters for existing components to use the new system
3. **Gradual Adoption**: Migrate components one by one to use the new `EventManager`
4. **Feature Flags**: Use feature flags to control the rollout
5. **Monitoring**: Monitor success rates and performance during migration

## Consequences

### Positive

- **Improved Reliability**: Centralized error handling and retry mechanisms
- **Better Debugging**: Consistent logging and monitoring
- **Reduced Code Duplication**: Single system for event management
- **Enhanced Performance**: Queue management prevents system overload
- **Easier Maintenance**: Clear separation of concerns

### Negative

- **Initial Complexity**: More complex than the current direct approach
- **Migration Effort**: Requires updating all components that create/publish events
- **Learning Curve**: Developers need to learn the new API

### Neutral

- **Abstraction Layer**: Adds an abstraction layer between components and Nostr
- **Centralization**: Moves from distributed to centralized approach

## Implementation Plan

1. Create the core `EventManager` and supporting services
2. Implement unit tests for all components
3. Create an adapter for the existing `useEventSigning` hook
4. Update one non-critical component to use the new system
5. Monitor performance and fix issues
6. Gradually migrate all components

## References

- Current implementation in `src/services/nostr/eventSigningService.ts`
- Current implementation in `src/services/nostr/nostrService.ts`
- Current implementation in `src/hooks/useEventSigning.ts`
- Nostr NIPs documentation