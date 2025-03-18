/**
 * Validation Service for the Event Management System
 * 
 * This service validates Nostr events according to Nostr specifications and
 * application-specific requirements.
 */

import { UnsignedEvent, ValidationResult, ValidationError, EventValidator } from './types';
import { ValidationFailedError } from './errors';
import { EVENT_TYPES } from './constants';

/**
 * Service for validating Nostr events
 */
export class ValidationService {
  private validators: EventValidator[] = [];
  
  /**
   * Creates a new ValidationService with default validators
   */
  constructor() {
    // Register default validators
    this.registerValidator(new StructureValidator());
    this.registerValidator(new ContentValidator());
  }
  
  /**
   * Registers a new validator
   * 
   * @param validator The validator to register
   */
  registerValidator(validator: EventValidator): void {
    this.validators.push(validator);
  }
  
  /**
   * Validates an event using all registered validators
   * 
   * @param event The event to validate
   * @returns A promise that resolves to the validation result
   * @throws ValidationFailedError if validation fails
   */
  async validate(event: UnsignedEvent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Run all validators
    for (const validator of this.validators) {
      const result = await validator.validate(event);
      if (!result.valid && result.errors) {
        errors.push(...result.errors);
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationFailedError('Event validation failed', errors);
    }
    
    return { valid: true };
  }
}

/**
 * Validates the basic structure of an event
 */
class StructureValidator implements EventValidator {
  async validate(event: UnsignedEvent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required fields
    if (typeof event.kind !== 'number') {
      errors.push({ field: 'kind', message: 'Event kind must be a number' });
    }
    
    if (typeof event.created_at !== 'number') {
      errors.push({ field: 'created_at', message: 'Event created_at must be a number' });
    } else if (event.created_at > Math.floor(Date.now() / 1000) + 60) {
      errors.push({ field: 'created_at', message: 'Event created_at cannot be in the future (more than 1 minute ahead)' });
    }
    
    if (!Array.isArray(event.tags)) {
      errors.push({ field: 'tags', message: 'Event tags must be an array' });
    } else {
      // Validate tag structure
      for (let i = 0; i < event.tags.length; i++) {
        const tag = event.tags[i];
        if (!Array.isArray(tag)) {
          errors.push({ field: `tags[${i}]`, message: 'Tag must be an array' });
        } else if (tag.length === 0) {
          errors.push({ field: `tags[${i}]`, message: 'Tag cannot be empty' });
        } else if (typeof tag[0] !== 'string') {
          errors.push({ field: `tags[${i}][0]`, message: 'Tag name must be a string' });
        }
      }
    }
    
    if (typeof event.content !== 'string') {
      errors.push({ field: 'content', message: 'Event content must be a string' });
    }
    
    if (typeof event.pubkey !== 'string') {
      errors.push({ field: 'pubkey', message: 'Event pubkey must be a string' });
    } else if (!/^[0-9a-f]{64}$/i.test(event.pubkey)) {
      errors.push({ field: 'pubkey', message: 'Event pubkey must be a valid 32-byte hex string' });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

/**
 * Validates the content of an event based on its kind
 */
class ContentValidator implements EventValidator {
  async validate(event: UnsignedEvent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Content validation based on event kind
    switch (event.kind) {
      case EVENT_TYPES.TEXT_NOTE: // Text note
        if (event.content.length > 10000) {
          errors.push({ field: 'content', message: 'Text note content exceeds maximum length (10000 characters)' });
        }
        break;
      
      case EVENT_TYPES.DIRECT_MESSAGE: // Direct message
        if (event.content.length === 0) {
          errors.push({ field: 'content', message: 'Direct message content cannot be empty' });
        }
        
        // Check for 'p' tag (recipient)
        const hasRecipient = event.tags.some(tag => tag[0] === 'p' && tag[1]?.length === 64);
        if (!hasRecipient) {
          errors.push({ field: 'tags', message: 'Direct message must include a recipient (p tag)' });
        }
        break;
      
      case EVENT_TYPES.TOPIC_DEFINITION: // Topic definition (NIP-72)
        // Validate topic definition structure
        try {
          // Topic definition should have valid JSON content
          const topicData = JSON.parse(event.content);
          
          // Check required fields
          if (!topicData.name) {
            errors.push({ field: 'content.name', message: 'Topic name is required' });
          } else if (topicData.name.length > 100) {
            errors.push({ field: 'content.name', message: 'Topic name exceeds maximum length (100 characters)' });
          }
          
          if (!topicData.description) {
            errors.push({ field: 'content.description', message: 'Topic description is required' });
          } else if (topicData.description.length > 500) {
            errors.push({ field: 'content.description', message: 'Topic description exceeds maximum length (500 characters)' });
          }
          
          // Check for moderator tags
          const hasModerators = event.tags.some(tag => tag[0] === 'p');
          if (!hasModerators) {
            errors.push({ field: 'tags', message: 'Topic definition must include at least one moderator (p tag)' });
          }
        } catch (error) {
          errors.push({ field: 'content', message: 'Topic definition must contain valid JSON' });
        }
        break;
      
      case EVENT_TYPES.TOPIC_APPROVAL: // Topic approval (NIP-72)
        // Check for event reference
        const hasEventRef = event.tags.some(tag => tag[0] === 'e');
        if (!hasEventRef) {
          errors.push({ field: 'tags', message: 'Topic approval must reference an event (e tag)' });
        }
        
        // Check for topic reference
        const hasTopicRef = event.tags.some(tag => tag[0] === 'a');
        if (!hasTopicRef) {
          errors.push({ field: 'tags', message: 'Topic approval must reference a topic (a tag)' });
        }
        break;
      
      case EVENT_TYPES.REACTION: // Reaction (used for topic votes)
        // Check for event reference
        const hasReactionEventRef = event.tags.some(tag => tag[0] === 'e');
        if (!hasReactionEventRef) {
          errors.push({ field: 'tags', message: 'Reaction must reference an event (e tag)' });
        }
        
        // Check content is a valid reaction
        if (!['+', '-', ''].includes(event.content)) {
          errors.push({ field: 'content', message: 'Reaction content must be "+", "-", or empty' });
        }
        break;
      
      case EVENT_TYPES.POLL: // Poll (NIP-88)
        try {
          // Poll should have valid JSON content
          const pollData = JSON.parse(event.content);
          
          // Check required fields
          if (!pollData.question) {
            errors.push({ field: 'content.question', message: 'Poll question is required' });
          }
          
          if (!Array.isArray(pollData.options) || pollData.options.length < 2) {
            errors.push({ field: 'content.options', message: 'Poll must have at least 2 options' });
          }
        } catch (error) {
          errors.push({ field: 'content', message: 'Poll must contain valid JSON' });
        }
        break;
      
      case EVENT_TYPES.POLL_RESPONSE: // Poll response (NIP-88)
        // Check for poll reference
        const hasPollRef = event.tags.some(tag => tag[0] === 'e');
        if (!hasPollRef) {
          errors.push({ field: 'tags', message: 'Poll response must reference a poll (e tag)' });
        }
        
        // Check for response tag
        const hasResponse = event.tags.some(tag => tag[0] === 'response');
        if (!hasResponse) {
          errors.push({ field: 'tags', message: 'Poll response must include a response tag' });
        }
        break;
      
      case EVENT_TYPES.ZAP_REQUEST: // Zap request (NIP-57)
        // Check for recipient
        const hasZapRecipient = event.tags.some(tag => tag[0] === 'p');
        if (!hasZapRecipient) {
          errors.push({ field: 'tags', message: 'Zap request must include a recipient (p tag)' });
        }
        
        // Check for relay tag
        const hasRelayTag = event.tags.some(tag => tag[0] === 'relays');
        if (!hasRelayTag) {
          errors.push({ field: 'tags', message: 'Zap request must include relays tag' });
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}