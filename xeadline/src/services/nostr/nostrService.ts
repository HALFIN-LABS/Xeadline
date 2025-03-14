import { SimplePool, Event, Filter } from 'nostr-tools';

// Define our own interface for subscription closer
interface SubCloser {
  close: () => void;
}

// Default relay URLs - using Xeadline's relay as primary, followed by public Nostr relays
const DEFAULT_RELAY_URLS = [
  'wss://relay.xeadline.com', // Primary Xeadline relay
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.primal.net'
];

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface NostrServiceState {
  status: ConnectionStatus;
  error?: string;
  connectedRelays: string[];
}

class NostrService {
  private pool: SimplePool;
  private _relayUrls: string[];
  private subscriptions: Map<string, SubCloser>;
  private state: NostrServiceState;
  private stateListeners: ((state: NostrServiceState) => void)[];
  
  // Public getter for relay URLs
  get relayUrls(): string[] {
    return [...this._relayUrls]; // Return a copy to prevent modification
  }

  constructor(relayUrls: string[] = DEFAULT_RELAY_URLS) {
    // Initialize with default values
    this.pool = new SimplePool();
    this._relayUrls = relayUrls;
    this.subscriptions = new Map();
    this.stateListeners = [];
    this.state = {
      status: 'disconnected',
      connectedRelays: [],
    };
  }

  /**
   * Connect to the Nostr relays
   */
  async connect(): Promise<void> {
    try {
      this.updateState({ status: 'connecting' });
      
      // Connect to relays
      const connectedRelays: string[] = [];
      let primaryRelayConnected = false;
      
      // First try to connect to the primary relay (first in the list)
      const primaryUrl = this._relayUrls[0];
      try {
        console.log(`Attempting to connect to primary relay: ${primaryUrl}`);
        
        // Add a timeout to the connection attempt
        const primaryRelayPromise = this.pool.ensureRelay(primaryUrl);
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        });
        
        // Race the connection against the timeout
        const relay = await Promise.race([primaryRelayPromise, timeoutPromise]) as any;
        
        if (relay) {
          connectedRelays.push(primaryUrl);
          primaryRelayConnected = true;
          console.log(`Successfully connected to primary relay: ${primaryUrl}`);
        }
      } catch (error) {
        console.error(`Failed to connect to primary relay ${primaryUrl}:`, error);
      }
      
      // Then try to connect to the other relays
      const relayPromises = this._relayUrls.slice(1).map(async (url) => {
        try {
          console.log(`Attempting to connect to relay: ${url}`);
          
          // Add a timeout to the connection attempt
          const relayPromise = this.pool.ensureRelay(url);
          const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), 10000);
          });
          
          // Race the connection against the timeout
          const relay = await Promise.race([relayPromise, timeoutPromise]) as any;
          
          if (relay) {
            connectedRelays.push(url);
            console.log(`Successfully connected to relay: ${url}`);
          }
        } catch (error) {
          console.error(`Failed to connect to relay ${url}:`, error);
        }
      });
      
      // Wait for all relay connection attempts to complete
      await Promise.all(relayPromises);
      
      if (connectedRelays.length === 0) {
        this.updateState({
          status: 'error',
          error: 'Failed to connect to any relays',
          connectedRelays: [],
        });
        return;
      }
      
      if (!primaryRelayConnected) {
        console.warn(`Primary relay ${primaryUrl} connection failed, but connected to ${connectedRelays.length} other relays`);
      }
      
      this.updateState({
        status: 'connected',
        connectedRelays,
      });
    } catch (error) {
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        connectedRelays: [],
      });
    }
  }

  /**
   * Disconnect from all relays
   */
  disconnect(): void {
    // Close all subscriptions
    Array.from(this.subscriptions.keys()).forEach(id => {
      this.unsubscribe(id);
    });
    
    // Close all relays
    this.pool.close(this._relayUrls);
    
    this.updateState({
      status: 'disconnected',
      connectedRelays: [],
    });
  }

  /**
   * Subscribe to events matching the given filter
   */
  subscribe(
    id: string,
    filters: Filter[],
    onEvent: (event: Event) => void,
    onEose?: () => void
  ): void {
    // Unsubscribe if already subscribed with this ID
    if (this.subscriptions.has(id)) {
      this.unsubscribe(id);
    }

    try {
      // Create new subscription with error handling
      console.log(`Creating subscription ${id} with filters:`, JSON.stringify(filters));
      
      // Safari might have issues with certain relay URLs, so we'll use only connected relays
      const connectedRelayUrls = this.state.connectedRelays.length > 0
        ? this.state.connectedRelays
        : this._relayUrls;
      
      console.log(`Using ${connectedRelayUrls.length} connected relays for subscription`);
      
      // Wrap event handler to catch errors
      const safeOnEvent = (event: Event) => {
        try {
          onEvent(event);
        } catch (error) {
          console.error(`Error in event handler for subscription ${id}:`, error);
        }
      };
      
      // Wrap EOSE handler to catch errors
      const safeOnEose = onEose ? () => {
        try {
          onEose();
        } catch (error) {
          console.error(`Error in EOSE handler for subscription ${id}:`, error);
        }
      } : undefined;
      
      const subCloser = this.pool.subscribeMany(connectedRelayUrls, filters, {
        onevent: safeOnEvent,
        oneose: safeOnEose,
      });
      
      // Store subscription
      this.subscriptions.set(id, subCloser);
      console.log(`Subscription ${id} created successfully`);
    } catch (error) {
      console.error(`Error creating subscription ${id}:`, error);
      // Create a dummy subscription closer in case of error
      this.subscriptions.set(id, { close: () => console.log(`Closing dummy subscription ${id}`) });
    }
  }

  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(id: string): void {
    const subCloser = this.subscriptions.get(id);
    if (subCloser) {
      subCloser.close();
      this.subscriptions.delete(id);
    }
  }

  /**
   * Publish an event to the relays
   */
  async publishEvent(event: Event): Promise<string[]> {
    try {
      console.log('Publishing event to relays:', event);
      console.log('Connected relays:', this.state.connectedRelays);
      console.log('Attempting to publish to relay URLs:', this._relayUrls);
      
      const pubs = this.pool.publish(this._relayUrls, event);
      console.log('Publication promises created:', pubs.length);
      
      // Safari has issues with Promise.all rejections, so we'll use a more resilient approach
      const pubPromises = this._relayUrls.map((url, i) => {
        console.log(`Setting up promise for relay ${url}`);
        // Wrap in a promise that never rejects, only resolves with success or null
        return new Promise<string | null>(resolve => {
          if (!pubs[i]) {
            console.error(`No publication promise for relay ${url}`);
            resolve(null);
            return;
          }
          
          pubs[i].then(
            (result) => {
              console.log(`Successfully published to ${url}:`, result);
              resolve(result);
            },
            (error) => {
              console.error(`Failed to publish to ${url}:`, error);
              resolve(null); // Resolve with null instead of rejecting
            }
          );
        });
      });
      
      console.log('Waiting for all publication promises to resolve');
      const results = await Promise.all(pubPromises);
      console.log('All publications completed with results:', results);
      // Filter out null results and return
      return results.filter((result): result is string => result !== null);
    } catch (error) {
      console.error('Failed to publish event:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Add a listener for state changes
   */
  addStateListener(listener: (state: NostrServiceState) => void): () => void {
    this.stateListeners.push(listener);
    // Immediately call with current state
    listener(this.state);
    
    // Return function to remove listener
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get the current connection state
   */
  getState(): NostrServiceState {
    return { ...this.state };
  }

  /**
   * Update the state and notify listeners
   */
  private updateState(partialState: Partial<NostrServiceState>): void {
    this.state = {
      ...this.state,
      ...partialState,
    };
    
    // Notify all listeners
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }
}

// Export singleton instance
export const nostrService = new NostrService();

export default nostrService;