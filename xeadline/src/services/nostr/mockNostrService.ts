/**
 * Mock implementation of the nostrService
 * This is used as a fallback when the real nostrService is not available
 * It provides empty implementations of all methods to prevent errors
 */

import { Event, Filter } from 'nostr-tools';
import { ConnectionStatus, NostrServiceState } from './nostrService';

// Define types
type SubscriptionCallback = (event: Event) => void;
type EOSECallback = () => void;
type StateListener = (state: NostrServiceState) => void;

class MockNostrService {
  private stateListeners: StateListener[] = [];
  public relayUrls: string[] = [];
  private state: NostrServiceState = {
    status: 'disconnected',
    connectedRelays: [],
    error: null
  };
  
  constructor() {
    console.warn('Using MockNostrService - limited functionality available');
  }
  
  subscribe(
    subId: string,
    filters: Filter[],
    callback: SubscriptionCallback,
    eoseCallback?: EOSECallback
  ): string {
    console.log(`[MockNostrService] Subscribe called with ID ${subId}`);
    
    // Call EOSE callback immediately if provided
    if (eoseCallback) {
      setTimeout(() => {
        console.log(`[MockNostrService] EOSE for subscription ${subId}`);
        eoseCallback();
      }, 100);
    }
    
    return subId;
  }
  
  unsubscribe(subId: string): void {
    console.log(`[MockNostrService] Unsubscribe called for ${subId}`);
  }
  
  async publishEvent(event: Event): Promise<string[]> {
    console.log('[MockNostrService] Publish event called:', event);
    return [];
  }
  
  async getEvents(filters: Filter[]): Promise<Event[]> {
    console.log(`[MockNostrService] Get events called with filters:`, filters);
    return [];
  }
  
  async connect(): Promise<void> {
    console.log('[MockNostrService] Connect called');
    
    // Update state to connected
    this.updateState({
      status: 'connected',
      connectedRelays: ['mock://relay'],
      error: null
    });
  }
  
  disconnect(): void {
    console.log('[MockNostrService] Disconnect called');
    
    // Update state to disconnected
    this.updateState({
      status: 'disconnected',
      connectedRelays: [],
      error: null
    });
  }
  
  getState(): NostrServiceState {
    return { ...this.state };
  }
  
  getRelays(): string[] {
    return [...this.relayUrls];
  }
  
  addStateListener(listener: StateListener): () => void {
    console.log('[MockNostrService] Add state listener called');
    this.stateListeners.push(listener);
    
    // Call listener immediately with current state
    listener({ ...this.state });
    
    // Return function to remove listener
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }
  
  private updateState(newState: NostrServiceState): void {
    this.state = newState;
    
    // Notify all listeners
    this.stateListeners.forEach(listener => {
      listener({ ...this.state });
    });
  }
}

// Create singleton instance
const mockNostrService = new MockNostrService();

export default mockNostrService;