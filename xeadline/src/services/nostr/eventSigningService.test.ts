import { signEvent, UnsignedEvent } from './eventSigningService';
import * as nostrKeys from '../../utils/nostrKeys';
import { getPublicKey } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

// Mock the nostrKeys module
jest.mock('../../utils/nostrKeys');

// Mock window.nostr
const mockNostr = {
  getPublicKey: jest.fn(),
  signEvent: jest.fn()
};

describe('eventSigningService', () => {
  // Sample private key for testing
  const testPrivateKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const testPublicKey = getPublicKey(hexToBytes(testPrivateKey));
  
  // Sample unsigned event for testing
  const unsignedEvent: UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: 'Test content',
    pubkey: testPublicKey
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset window.nostr
    delete (window as any).nostr;
    
    // Mock retrievePrivateKey
    (nostrKeys.retrievePrivateKey as jest.Mock).mockResolvedValue(testPrivateKey);
  });
  
  it('should sign an event with a provided private key', async () => {
    const result = await signEvent(unsignedEvent, { privateKey: testPrivateKey });
    
    expect(result.success).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event?.pubkey).toBe(testPublicKey);
    expect(result.event?.content).toBe('Test content');
    expect(result.event?.id).toBeTruthy();
    expect(result.event?.sig).toBeTruthy();
  });
  
  it('should sign an event with a Nostr extension', async () => {
    // Mock window.nostr
    (window as any).nostr = mockNostr;
    mockNostr.getPublicKey.mockResolvedValue(testPublicKey);
    mockNostr.signEvent.mockImplementation(async (event) => {
      return {
        ...event,
        id: 'mock-id',
        sig: 'mock-signature'
      };
    });
    
    const result = await signEvent(unsignedEvent);
    
    expect(result.success).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event?.id).toBe('mock-id');
    expect(result.event?.sig).toBe('mock-signature');
    expect(mockNostr.getPublicKey).toHaveBeenCalled();
    expect(mockNostr.signEvent).toHaveBeenCalled();
  });
  
  it('should handle extension timeout', async () => {
    // Mock window.nostr with a function that never resolves
    (window as any).nostr = {
      getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
      signEvent: jest.fn().mockImplementation(() => new Promise(() => {}))
    };
    
    const result = await signEvent(unsignedEvent, { timeout: 100 });
    
    // Should fall through to other methods and fail because no private key is provided
    expect(result.success).toBe(false);
    expect(result.needsPassword).toBe(true);
  });
  
  it('should decrypt and use a stored private key when password is provided', async () => {
    const result = await signEvent(unsignedEvent, { password: 'test-password' });
    
    expect(result.success).toBe(true);
    expect(result.event).toBeDefined();
    expect(nostrKeys.retrievePrivateKey).toHaveBeenCalledWith('test-password');
  });
  
  it('should indicate when a password is needed', async () => {
    const result = await signEvent(unsignedEvent);
    
    expect(result.success).toBe(false);
    expect(result.needsPassword).toBe(true);
    expect(result.error).toBe('Password required to decrypt private key');
  });
  
  it('should handle invalid password', async () => {
    // Mock retrievePrivateKey to return null (invalid password)
    (nostrKeys.retrievePrivateKey as jest.Mock).mockResolvedValue(null);
    
    const result = await signEvent(unsignedEvent, { password: 'wrong-password' });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid password or no encrypted key found');
  });
  
  it('should retry on failure', async () => {
    // Mock window.nostr to fail on first call but succeed on second
    let callCount = 0;
    (window as any).nostr = {
      getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
      signEvent: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Test error');
        }
        return Promise.resolve({
          ...unsignedEvent,
          id: 'mock-id',
          sig: 'mock-signature'
        });
      })
    };
    
    // Simulate an error that will trigger a retry
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    try {
      const result = await signEvent(unsignedEvent);
      
      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect((window as any).nostr.signEvent).toHaveBeenCalledTimes(2);
    } finally {
      console.error = originalConsoleError;
    }
  });
});