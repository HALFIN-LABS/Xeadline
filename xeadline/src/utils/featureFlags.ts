/**
 * Feature flags for controlling application functionality
 * This allows us to enable/disable features without changing code
 */

// Feature flags object
export const FeatureFlags = {
  // Nostr connectivity features
  nostr: {
    // Enable basic connection to relays
    enableConnection: true,
    
    // Enable profile synchronization (requires enableConnection)
    enableProfileSync: true,
    
    // Enable publishing events to relays (requires enableConnection)
    enablePublishing: true,
    
    // Enable subscribing to events from relays (requires enableConnection)
    enableSubscriptions: true,
    
    // Enable automatic reconnection on connection loss
    enableAutoReconnect: true,
  },
};

// Helper functions for checking feature flags
export const isFeatureEnabled = (featurePath: string): boolean => {
  try {
    // Split the feature path by dots (e.g., "nostr.enableConnection")
    const parts = featurePath.split('.');
    
    // Start with the root object
    let current: any = FeatureFlags;
    
    // Navigate through the parts
    for (const part of parts) {
      if (current[part] === undefined) {
        console.warn(`Feature flag "${featurePath}" not found`);
        return false;
      }
      current = current[part];
    }
    
    // Return the value of the feature flag
    return Boolean(current);
  } catch (error) {
    console.error(`Error checking feature flag "${featurePath}":`, error);
    return false;
  }
};

export default FeatureFlags;