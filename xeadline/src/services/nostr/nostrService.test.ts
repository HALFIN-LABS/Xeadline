import { SimplePool } from 'nostr-tools';
import nostrService, { NostrServiceState } from './nostrService';

// Mock nostr-tools SimplePool
jest.mock('nostr-tools', () => {
  const mockEnsureRelay = jest.fn();
  const mockClose = jest.fn();
  const mockSubscribeMany = jest.fn();
  const mockPublish = jest.fn();

  return {
    SimplePool: jest.fn().mockImplementation(() => ({
      ensureRelay: mockEnsureRelay,
      close: mockClose,
      subscribeMany: mockSubscribeMany,
      publish: mockPublish,
    })),
  };
});

describe('NostrService', () => {
  let mockPool: jest.Mocked<SimplePool>;
  let stateListener: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked SimplePool instance
    mockPool = (nostrService as any).pool;
    
    // Create a mock state listener
    stateListener = jest.fn();
    nostrService.addStateListener(stateListener);
    
    // Reset the service state
    (nostrService as any).state = {
      status: 'disconnected',
      connectedRelays: [],
    };
    
    // Clear any existing subscriptions
    (nostrService as any).subscriptions.clear();
  });
  
  describe('connect', () => {
    it('should update status to connecting when connecting', async () => {
      // Start connecting
      const connectPromise = nostrService.connect();
      
      // Check that status was updated to connecting
      expect(stateListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'connecting',
        })
      );
      
      // Resolve the connection
      mockPool.ensureRelay.mockResolvedValueOnce({} as any);
      await connectPromise;
    });
    
    it('should update status to connected when successfully connected', async () => {
      // Mock successful connection
      mockPool.ensureRelay.mockResolvedValueOnce({} as any);
      
      // Connect
      await nostrService.connect();
      
      // Check that status was updated to connected
      expect(stateListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'connected',
          connectedRelays: ['wss://relay.xeadline.com'],
        })
      );
    });
    
    it('should update status to error when connection fails', async () => {
      // Create a fresh instance for this test to avoid interference
      const mockEnsureRelay = jest.fn();
      const mockClose = jest.fn();
      const mockSubscribeMany = jest.fn();
      const mockPublish = jest.fn();
      
      // Create a mock pool that always fails to connect
      const mockFailingPool = {
        ensureRelay: mockEnsureRelay.mockRejectedValue(new Error('Connection failed')),
        close: mockClose,
        subscribeMany: mockSubscribeMany,
        publish: mockPublish,
      };
      
      // Create a new service instance with the failing pool
      const testService = new (nostrService.constructor as any)(['wss://relay.xeadline.com']);
      (testService as any).pool = mockFailingPool;
      
      // Add a state listener
      const stateListener = jest.fn();
      testService.addStateListener(stateListener);
      
      // Clear the initial call
      stateListener.mockClear();
      
      // Attempt to connect
      await testService.connect();
      
      // Verify the error state was set
      expect(stateListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: 'Failed to connect to any relays',
          connectedRelays: []
        })
      );
    });
  });
  
  describe('disconnect', () => {
    it('should close all subscriptions and update status', () => {
      // Setup mock subscriptions
      const mockClose = jest.fn();
      (nostrService as any).subscriptions.set('test-sub', { close: mockClose });
      
      // Set initial state
      (nostrService as any).state = {
        status: 'connected',
        connectedRelays: ['wss://relay.xeadline.com'],
      };
      
      // Disconnect
      nostrService.disconnect();
      
      // Check that subscription was closed
      expect(mockClose).toHaveBeenCalled();
      
      // Check that pool was closed
      expect(mockPool.close).toHaveBeenCalledWith(['wss://relay.xeadline.com']);
      
      // Check that status was updated
      expect(stateListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'disconnected',
          connectedRelays: [],
        })
      );
    });
  });
  
  describe('subscribe', () => {
    it('should create a subscription and store it', () => {
      // Mock subscription
      const mockSubCloser = { close: jest.fn() };
      mockPool.subscribeMany.mockReturnValueOnce(mockSubCloser);
      
      // Subscribe
      const filters = [{ kinds: [1], limit: 10 }];
      const onEvent = jest.fn();
      const onEose = jest.fn();
      
      nostrService.subscribe('test-sub', filters, onEvent, onEose);
      
      // Check that subscribeMany was called with correct params
      expect(mockPool.subscribeMany).toHaveBeenCalledWith(
        ['wss://relay.xeadline.com'],
        filters,
        expect.objectContaining({
          onevent: onEvent,
          oneose: onEose,
        })
      );
      
      // Check that subscription was stored
      expect((nostrService as any).subscriptions.get('test-sub')).toBe(mockSubCloser);
    });
    
    it('should unsubscribe from existing subscription with same ID', () => {
      // Setup existing subscription
      const mockClose = jest.fn();
      (nostrService as any).subscriptions.set('test-sub', { close: mockClose });
      
      // Mock new subscription
      const mockSubCloser = { close: jest.fn() };
      mockPool.subscribeMany.mockReturnValueOnce(mockSubCloser);
      
      // Subscribe with same ID
      nostrService.subscribe('test-sub', [{ kinds: [1] }], jest.fn());
      
      // Check that old subscription was closed
      expect(mockClose).toHaveBeenCalled();
      
      // Check that new subscription was stored
      expect((nostrService as any).subscriptions.get('test-sub')).toBe(mockSubCloser);
    });
  });
  
  describe('unsubscribe', () => {
    it('should close subscription and remove it', () => {
      // Setup mock subscription
      const mockClose = jest.fn();
      (nostrService as any).subscriptions.set('test-sub', { close: mockClose });
      
      // Unsubscribe
      nostrService.unsubscribe('test-sub');
      
      // Check that subscription was closed
      expect(mockClose).toHaveBeenCalled();
      
      // Check that subscription was removed
      expect((nostrService as any).subscriptions.has('test-sub')).toBe(false);
    });
    
    it('should do nothing if subscription does not exist', () => {
      // Unsubscribe from non-existent subscription
      nostrService.unsubscribe('non-existent');
      
      // No errors should be thrown
    });
  });
  
  describe('publishEvent', () => {
    it('should publish event to relays', async () => {
      // Mock successful publish
      const mockPromises = [Promise.resolve('ok'), Promise.resolve('ok')];
      mockPool.publish.mockReturnValueOnce(mockPromises);
      
      // Create test event
      const event = { id: 'test-id', kind: 1 } as any;
      
      // Publish event
      await nostrService.publishEvent(event);
      
      // Check that publish was called with correct params
      expect(mockPool.publish).toHaveBeenCalledWith(
        ['wss://relay.xeadline.com'],
        event
      );
    });
  });
});