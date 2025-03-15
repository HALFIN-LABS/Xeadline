import { Event, Filter, SimplePool } from 'nostr-tools';

// Define default relays
const DEFAULT_RELAYS = [
  'wss://relay.xeadline.com',
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://relay.current.fyi',
  'wss://purplepag.es'
];

// Define types
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type SubscriptionCallback = (event: Event) => void;
type EOSECallback = () => void;
type StateListener = (state: NostrServiceState) => void;

export interface NostrServiceState {
  status: ConnectionStatus;
  connectedRelays: string[];
  error: string | null;
}

class NostrService {
  private pool: SimplePool;
  private subscriptions: Map<string, { close: () => void }> = new Map();
  private stateListeners: StateListener[] = [];
  public relayUrls: string[] = DEFAULT_RELAYS;
  private state: NostrServiceState = {
    status: 'disconnected',
    connectedRelays: [],
    error: null
  };
  
  constructor() {
    this.pool = new SimplePool();
  }
  
  /**
   * Subscribe to events matching the given filters
   * @param subId Subscription ID
   * @param filters Filters to apply
   * @param callback Callback function for each event
   * @param eoseCallback Callback function for end of stored events
   * @returns Subscription ID
   */
  subscribe(
    subId: string,
    filters: Filter[],
    callback: SubscriptionCallback,
    eoseCallback?: EOSECallback
  ): string {
    console.log(`Subscribing to ${JSON.stringify(filters)} with ID ${subId}`);
    
    // Unsubscribe if there's an existing subscription with this ID
    if (this.subscriptions.has(subId)) {
      this.unsubscribe(subId);
    }
    
    // Create a new subscription
    const sub = this.pool.subscribeMany(
      this.relayUrls,
      filters,
      {
        onevent: (event) => {
          console.log(`Received event for subscription ${subId}:`, event.id);
          callback(event);
        },
        oneose: () => {
          if (eoseCallback) {
            console.log(`EOSE received for subscription ${subId}`);
            eoseCallback();
          }
        }
      }
    );
    
    // Store the subscription
    this.subscriptions.set(subId, sub);
    
    return subId;
  }
  
  /**
   * Unsubscribe from a subscription
   * @param subId Subscription ID
   */
  unsubscribe(subId: string): void {
    if (this.subscriptions.has(subId)) {
      console.log(`Unsubscribing from ${subId}`);
      this.subscriptions.get(subId)?.close();
      this.subscriptions.delete(subId);
    }
  }
  
  /**
   * Publish an event to relays
   * @param event Event to publish
   * @returns Array of relay URLs that accepted the event
   */
  async publishEvent(event: Event): Promise<string[]> {
    console.log('Publishing event:', event);
    
    try {
      // Publish to all relays
      const pubs = this.pool.publish(this.relayUrls, event);
      
      // Wait for all publish promises to resolve
      const results = await Promise.allSettled(pubs);
      
      // Get the URLs of relays that accepted the event
      const successfulRelays = results
        .map((result, index) => result.status === 'fulfilled' ? this.relayUrls[index] : null)
        .filter((url): url is string => url !== null);
      
      console.log(`Event published successfully to ${successfulRelays.length} relays`);
      return successfulRelays;
    } catch (error) {
      console.error('Error publishing event:', error);
      return [];
    }
  }
  
  /**
   * Get events matching the given filters
   * @param filters Filters to apply
   * @returns Promise resolving to array of events
   */
  async getEvents(filters: Filter[]): Promise<Event[]> {
    console.log(`Getting events matching ${JSON.stringify(filters)}`);
    
    try {
      // Create a promise that will resolve with the events
      return new Promise((resolve) => {
        const events: Event[] = [];
        const subId = `get-events-${Date.now()}`;
        
        // Subscribe to events
        this.subscribe(
          subId,
          filters,
          (event) => {
            events.push(event);
          },
          () => {
            // On EOSE, unsubscribe and resolve with the events
            this.unsubscribe(subId);
            resolve(events);
          }
        );
        
        // Set a timeout in case EOSE is never received
        setTimeout(() => {
          if (this.subscriptions.has(subId)) {
            this.unsubscribe(subId);
            resolve(events);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }
  
  /**
   * Connect to relays
   */
  async connect(): Promise<void> {
    // Update state to connecting
    this.updateState({
      status: 'connecting',
      connectedRelays: [],
      error: null
    });
    
    try {
      console.log(`Connecting to relays: ${this.relayUrls.join(', ')}`);
      
      // Force WebSocket protocol for Vercel deployments
      const secureRelayUrls = this.relayUrls.map(url => {
        // Ensure all relay URLs use secure WebSocket protocol
        if (url.startsWith('ws:')) {
          return url.replace('ws:', 'wss:');
        }
        return url;
      });
      
      console.log(`Using secure relay URLs: ${secureRelayUrls.join(', ')}`);
      
      // Connect to all relays with a timeout
      const connectedRelays: string[] = [];
      const connectionPromises = secureRelayUrls.map(async (url) => {
        try {
          // Create a promise that will reject after timeout
          const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error(`Connection to ${url} timed out`)), 15000);
          });
          
          // Create a promise for the relay connection
          const connectionPromise = this.pool.ensureRelay(url).then(relay => {
            console.log('Connected to relay:', url);
            connectedRelays.push(url);
            return relay;
          });
          
          // Race the connection against the timeout
          return await Promise.race([connectionPromise, timeoutPromise]);
        } catch (err) {
          console.error(`Failed to connect to relay ${url}:`, err);
          return null;
        }
      });
      
      // Wait for all connection attempts to complete
      await Promise.allSettled(connectionPromises);
      
      // Consider connection successful if we connect to at least one relay
      if (connectedRelays.length > 0) {
        // Update state to connected
        this.updateState({
          status: 'connected',
          connectedRelays,
          error: null
        });
        
        console.log(`Successfully connected to ${connectedRelays.length}/${secureRelayUrls.length} relays`);
      } else {
        // Try to connect to at least one relay with a longer timeout
        console.log('Retrying connection to first relay with longer timeout...');
        try {
          const firstRelay = await this.pool.ensureRelay(secureRelayUrls[0], { connectionTimeout: 30000 });
          console.log('Connected to relay:', secureRelayUrls[0]);
          connectedRelays.push(secureRelayUrls[0]);
          
          this.updateState({
            status: 'connected',
            connectedRelays,
            error: null
          });
          
          console.log(`Successfully connected to ${connectedRelays.length}/${secureRelayUrls.length} relays after retry`);
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw new Error('Failed to connect to any relays, even after retry');
        }
      }
    } catch (error) {
      console.error('Error connecting to relays:', error);
      
      // Update state to error
      this.updateState({
        status: 'error',
        connectedRelays: [],
        error: error instanceof Error ? error.message : 'Failed to connect to any relays'
      });
      
      throw error;
    }
  }
  
  /**
   * Disconnect from relays
   */
  disconnect(): void {
    console.log('Disconnecting from relays');
    
    // Close all active subscriptions
    Array.from(this.subscriptions.keys()).forEach(subId => {
      this.unsubscribe(subId);
    });
    
    // Close connections to all relays
    const connectedRelays = this.state.connectedRelays;
    if (connectedRelays.length > 0) {
      console.log(`Closing connections to ${connectedRelays.length} relays`);
      this.pool.close(connectedRelays);
    }
    
    // Update state to disconnected
    this.updateState({
      status: 'disconnected',
      connectedRelays: [],
      error: null
    });
    
    console.log('Disconnected from all relays');
  }
  
  /**
   * Get current state
   */
  getState(): NostrServiceState {
    return { ...this.state };
  }
  
  /**
   * Get the list of configured relays
   */
  getRelays(): string[] {
    return [...this.relayUrls];
  }
  
  /**
   * Add state listener
   * @param listener Function to call when state changes
   * @returns Function to remove the listener
   */
  addStateListener(listener: StateListener): () => void {
    this.stateListeners.push(listener);
    
    // Call listener immediately with current state
    listener({ ...this.state });
    
    // Return function to remove listener
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Update state and notify listeners
   * @param newState New state
   */
  private updateState(newState: NostrServiceState): void {
    this.state = newState;
    
    // Notify all listeners
    this.stateListeners.forEach(listener => {
      listener({ ...this.state });
    });
  }
}

// Create singleton instance
const nostrService = new NostrService();

export default nostrService;