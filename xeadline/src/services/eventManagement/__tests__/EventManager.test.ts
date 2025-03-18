/**
 * Tests for the Event Management System
 */

import { EventManager } from '../EventManager';
import { ValidationService } from '../ValidationService';
import { SigningService } from '../SigningService';
import { PublishingService } from '../PublishingService';
import { QueueManager } from '../QueueManager';
import { EventMonitor } from '../EventMonitor';
import { UnsignedEvent } from '../types';

// Mock dependencies
jest.mock('../ValidationService');
jest.mock('../SigningService');
jest.mock('../PublishingService');
jest.mock('../QueueManager');
jest.mock('../EventMonitor');

describe('EventManager', () => {
  let eventManager: EventManager;
  let mockValidationService: jest.Mocked<ValidationService>;
  let mockSigningService: jest.Mocked<SigningService>;
  let mockPublishingService: jest.Mocked<PublishingService>;
  let mockQueueManager: jest.Mocked<QueueManager>;
  let mockEventMonitor: jest.Mocked<EventMonitor>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockValidationService = new ValidationService() as jest.Mocked<ValidationService>;
    mockSigningService = new SigningService() as jest.Mocked<SigningService>;
    mockPublishingService = new PublishingService() as jest.Mocked<PublishingService>;
    mockQueueManager = new QueueManager() as jest.Mocked<QueueManager>;
    mockEventMonitor = new EventMonitor() as jest.Mocked<EventMonitor>;
    
    // Create EventManager instance
    eventManager = new EventManager();
    
    // Replace dependencies with mocks
    (eventManager as any).validationService = mockValidationService;
    (eventManager as any).signingService = mockSigningService;
    (eventManager as any).publishingService = mockPublishingService;
    (eventManager as any).queueManager = mockQueueManager;
    (eventManager as any).eventMonitor = mockEventMonitor;
  });
  
  describe('createEvent', () => {
    it('should create an unsigned event with the correct properties', async () => {
      // Mock getPublicKey
      const mockPublicKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      mockSigningService.getPublicKey.mockResolvedValue(mockPublicKey);
      
      // Call createEvent
      const kind = 1;
      const content = 'Test content';
      const tags = [['t', 'test']];
      const result = await eventManager.createEvent(kind, content, tags);
      
      // Verify result
      expect(result).toEqual({
        kind,
        content,
        tags,
        pubkey: mockPublicKey,
        created_at: expect.any(Number),
      });
      
      // Verify getPublicKey was called
      expect(mockSigningService.getPublicKey).toHaveBeenCalled();
      
      // Verify trackEvent was called
      expect(mockEventMonitor.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          kind,
          content,
          tags,
          pubkey: mockPublicKey,
          id: '',
          sig: '',
        }),
        expect.objectContaining({
          status: 'created',
        })
      );
    });
  });
  
  describe('signEvent', () => {
    it('should validate and sign the event', async () => {
      // Create test event
      const event: UnsignedEvent = {
        kind: 1,
        content: 'Test content',
        tags: [],
        pubkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        created_at: Math.floor(Date.now() / 1000),
      };
      
      // Mock validate
      mockValidationService.validate.mockResolvedValue({ valid: true });
      
      // Mock sign
      const signedEvent = {
        ...event,
        id: 'event-id',
        sig: 'signature',
      };
      mockSigningService.sign.mockResolvedValue({
        success: true,
        event: signedEvent,
      });
      
      // Call signEvent
      const result = await eventManager.signEvent(event);
      
      // Verify result
      expect(result).toEqual({
        success: true,
        event: signedEvent,
      });
      
      // Verify validate was called
      expect(mockValidationService.validate).toHaveBeenCalledWith(event);
      
      // Verify sign was called
      expect(mockSigningService.sign).toHaveBeenCalledWith(event, undefined);
      
      // Verify trackEvent was called twice
      expect(mockEventMonitor.trackEvent).toHaveBeenCalledTimes(2);
    });
    
    it('should handle validation errors', async () => {
      // Create test event
      const event: UnsignedEvent = {
        kind: 1,
        content: 'Test content',
        tags: [],
        pubkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        created_at: Math.floor(Date.now() / 1000),
      };
      
      // Mock validate to throw error
      const validationError = new Error('Validation failed');
      mockValidationService.validate.mockRejectedValue(validationError);
      
      // Call signEvent
      const result = await eventManager.signEvent(event);
      
      // Verify result
      expect(result).toEqual({
        success: false,
        error: 'Validation failed',
      });
      
      // Verify validate was called
      expect(mockValidationService.validate).toHaveBeenCalledWith(event);
      
      // Verify sign was not called
      expect(mockSigningService.sign).not.toHaveBeenCalled();
    });
  });
  
  describe('publishEvent', () => {
    it('should publish the event', async () => {
      // Create test event
      const event = {
        kind: 1,
        content: 'Test content',
        tags: [],
        pubkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        created_at: Math.floor(Date.now() / 1000),
        id: 'event-id',
        sig: 'signature',
      };
      
      // Mock publish
      const publishedTo = ['relay1', 'relay2'];
      mockPublishingService.publish.mockResolvedValue({
        success: true,
        publishedTo,
      });
      
      // Call publishEvent
      const result = await eventManager.publishEvent(event);
      
      // Verify result
      expect(result).toEqual({
        success: true,
        publishedTo,
      });
      
      // Verify publish was called
      expect(mockPublishingService.publish).toHaveBeenCalledWith(event, undefined);
      
      // Verify trackEvent was called
      expect(mockEventMonitor.trackEvent).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          status: 'published',
          publishedTo,
        })
      );
    });
  });
  
  describe('signAndPublishEvent', () => {
    it('should validate, queue, and return a pending result', async () => {
      // Create test event
      const event: UnsignedEvent = {
        kind: 1,
        content: 'Test content',
        tags: [],
        pubkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        created_at: Math.floor(Date.now() / 1000),
      };
      
      // Mock validate
      mockValidationService.validate.mockResolvedValue({ valid: true });
      
      // Mock enqueue
      const queuedEvent = {
        id: 'queue-id',
        event,
        priority: 'NORMAL' as any, // Using 'as any' to bypass type checking in test
        createdAt: Date.now(),
        status: 'queued' as 'queued', // Type assertion to match the literal type
      };
      mockQueueManager.enqueue.mockResolvedValue(queuedEvent);
      
      // Call signAndPublishEvent
      const result = await eventManager.signAndPublishEvent(event);
      
      // Verify result
      expect(result).toEqual({
        success: true,
        event: undefined,
        publishedTo: [],
        pendingId: 'queue-id',
      });
      
      // Verify validate was called
      expect(mockValidationService.validate).toHaveBeenCalledWith(event);
      
      // Verify enqueue was called
      expect(mockQueueManager.enqueue).toHaveBeenCalledWith(event, 'normal');
      
      // Verify trackEvent was called
      expect(mockEventMonitor.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ...event,
          id: '',
          sig: '',
        }),
        expect.objectContaining({
          id: 'queue-id',
          status: 'queued',
        })
      );
    });
  });
});