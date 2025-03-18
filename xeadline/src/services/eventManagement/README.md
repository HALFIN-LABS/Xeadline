# Event Management System

The Event Management System provides a centralized, robust solution for handling Nostr events in the Xeadline application. It replaces the previous scattered approach with a unified architecture that ensures reliable event creation, validation, signing, and publishing.

## Features

- **Centralized Event Handling**: All event operations go through a single system
- **Comprehensive Validation**: Events are validated against Nostr specifications and application requirements
- **Multiple Signing Methods**: Support for browser extensions, private keys, and encrypted keys
- **Reliable Publishing**: Smart retry logic and relay selection
- **Queue Management**: Prioritization and concurrency control
- **Monitoring and Metrics**: Track event success rates and performance
- **Backward Compatibility**: Adapters for existing code

## Architecture

The Event Management System follows a modular architecture with clear separation of concerns:

```
src/services/eventManagement/
├── index.ts                  # Public API exports
├── types.ts                  # Shared type definitions
├── errors.ts                 # Error definitions
├── constants.ts              # Constants and configuration
├── EventManager.ts           # Main coordinator class
├── ValidationService.ts      # Event validation
├── SigningService.ts         # Event signing
├── PublishingService.ts      # Event publishing
├── QueueManager.ts           # Event queue management
├── EventMonitor.ts           # Monitoring and metrics
├── adapters/                 # Adapters for existing code
│   ├── legacyAdapter.ts      # Adapter for legacy functions
│   └── useEventSigningAdapter.ts  # Adapter for useEventSigning hook
└── examples/                 # Usage examples
    └── basic-usage.ts        # Basic usage examples
```

## Usage

### Basic Usage

```typescript
import { eventManager } from '../../services/eventManagement';

// Create an event
const event = await eventManager.createEvent(
  1, // kind 1 = text note
  'Hello, Nostr world!', // content
  [['t', 'xeadline']] // tags
);

// Sign and publish the event
const result = await eventManager.signAndPublishEvent(event);

if (result.success) {
  console.log('Event published successfully!');
}
```

### React Hook Usage

```typescript
import { useEventSigningAdapter, eventManager } from '../../services/eventManagement';

function MyComponent() {
  const { signAndPublishEvent, isSigningInProgress } = useEventSigningAdapter(eventManager);
  
  const handlePost = async () => {
    const event = await eventManager.createEvent(1, 'Hello from React!');
    await signAndPublishEvent(event, 'post a message');
  };
  
  return (
    <button onClick={handlePost} disabled={isSigningInProgress}>
      Post
    </button>
  );
}
```

### Legacy Compatibility

```typescript
import { signEvent, publishEvent } from '../../services/eventManagement';

// Use just like the old functions
const result = await signEvent(unsignedEvent);
if (result.success) {
  await publishEvent(result.event);
}
```

## Advanced Features

### Event Prioritization

```typescript
import { eventManager, Priority } from '../../services/eventManagement';

// Create a high-priority event
const event = await eventManager.createEvent(1, 'Important announcement!');
await eventManager.signAndPublishEvent(event, { priority: Priority.HIGH });
```

### Retry Failed Events

```typescript
import { eventManager } from '../../services/eventManagement';

// Retry a failed event
const result = await eventManager.retryEvent('event-id');
```

### Monitoring

```typescript
import { eventManager } from '../../services/eventManagement';

// Get event metrics
const metrics = eventManager['eventMonitor'].getMetrics();
console.log('Success rate:', metrics.publishSuccessRate);
```

## Implementation Details

### Event Flow

1. **Creation**: Events are created with the appropriate kind, content, and tags
2. **Validation**: Events are validated against Nostr specifications and application requirements
3. **Queueing**: Events are added to a priority queue for processing
4. **Signing**: Events are signed using the available signing methods
5. **Publishing**: Signed events are published to relays with retry logic
6. **Monitoring**: Event status and metrics are tracked throughout the process

### Error Handling

The system provides comprehensive error handling with specific error types for different failure scenarios:

- `ValidationFailedError`: Event validation failed
- `SigningFailedError`: Event signing failed
- `PublishingFailedError`: Event publishing failed
- `QueueError`: Queue operation failed

## Migration Guide

To migrate from the old event handling approach to the new Event Management System:

1. **Direct Function Calls**: Replace direct calls to `signEvent` and `publishEvent` with imports from the Event Management System
2. **React Hook**: Replace `useEventSigning` with `useEventSigningAdapter(eventManager)`
3. **Advanced Usage**: For more complex scenarios, use the `eventManager` directly

## Contributing

When extending the Event Management System:

1. Follow the existing architecture and separation of concerns
2. Add comprehensive tests for new functionality
3. Update documentation and examples
4. Ensure backward compatibility where possible