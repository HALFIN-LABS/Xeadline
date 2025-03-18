# Event Management System Migration Guide

This guide explains how to migrate from the old event handling approach to the new Event Management System.

## Overview

The Event Management System provides a centralized, robust solution for handling Nostr events in the Xeadline application. It replaces the previous scattered approach with a unified architecture that ensures reliable event creation, validation, signing, and publishing.

## Integration Status

The new Event Management System has been integrated into the codebase with backward compatibility in mind:

- The `useEventSigning` hook now uses the new system internally
- The `signEvent` function in the nostr service now uses the new system
- The `publishEvent` function in the nostr service now uses the new system

This means that **existing code should continue to work without changes**, but you can also start using the new API directly for more advanced features.

## Migration Steps

### 1. For Basic Usage (No Changes Required)

If you're using the existing functions and hooks, your code should continue to work without changes:

```typescript
// This code will continue to work
import { signEvent } from '../services/nostr';
import { useEventSigning } from '../hooks/useEventSigning';

// Using the hook
function MyComponent() {
  const { signAndPublishEvent } = useEventSigning();
  // ...
}

// Using the function directly
const result = await signEvent(unsignedEvent);
```

### 2. Migrating to the New API (Recommended)

For new code or when refactoring existing code, we recommend using the new API directly:

```typescript
// Import from the new system
import { eventManager } from '../services/eventManagement';

// Create an event
const event = await eventManager.createEvent(
  1, // kind 1 = text note
  'Hello, Nostr world!', // content
  [['t', 'xeadline']] // tags
);

// Sign and publish in one operation
const result = await eventManager.signAndPublishEvent(event);

// Or sign and publish separately
const signResult = await eventManager.signEvent(event);
if (signResult.success && signResult.event) {
  const publishResult = await eventManager.publishEvent(signResult.event);
}
```

### 3. Using the React Hook

In React components, you can use the existing hook (which now uses the new system internally) or the new adapter hook:

```typescript
// Option 1: Use the existing hook (recommended for most cases)
import { useEventSigning } from '../../hooks/useEventSigning';

function MyComponent() {
  const { signAndPublishEvent } = useEventSigning();
  // ...
}

// Option 2: Use the new adapter hook directly
import { useEventSigningAdapter, eventManager } from '../../services/eventManagement';

function MyComponent() {
  const { signAndPublishEvent } = useEventSigningAdapter(eventManager);
  // ...
}
```

## Advanced Features

The new Event Management System provides several advanced features that weren't available in the old approach:

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

### Monitoring and Metrics

```typescript
import { eventManager } from '../../services/eventManagement';

// Get event metrics
const metrics = eventManager['eventMonitor'].getMetrics();
console.log('Success rate:', metrics.publishSuccessRate);
```

## Testing the New System

A test script is available to verify that the new Event Management System works correctly:

```bash
npx ts-node src/scripts/test-event-management.ts
```

This script creates, signs, and publishes a simple text note event using the new system.

## Troubleshooting

If you encounter issues with the new Event Management System:

1. Check the console for error messages
2. Verify that the event is being created correctly
3. Check that the signing method is available (extension, private key, or encrypted key)
4. Verify that relays are configured correctly

If problems persist, you can temporarily revert to the old implementation by modifying:
- `src/hooks/useEventSigning.ts`
- `src/services/nostr/index.ts`

## Next Steps

1. Review the [Event Management System README](../src/services/eventManagement/README.md) for detailed documentation
2. Explore the [examples](../src/services/eventManagement/examples) for usage patterns
3. Update your code to use the new API for new features