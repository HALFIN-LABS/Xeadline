/**
 * Error definitions for the Event Management System
 * 
 * This file contains standardized error classes used throughout the Event Management System.
 */

import { ErrorType, ValidationError } from './types';

/**
 * Base error class for all Event Management System errors
 */
export class EventManagementError extends Error {
  type: ErrorType;
  
  constructor(message: string, type: ErrorType = ErrorType.GENERAL) {
    super(message);
    this.name = 'EventManagementError';
    this.type = type;
  }
}

/**
 * Error thrown when event validation fails
 */
export class ValidationFailedError extends EventManagementError {
  errors: ValidationError[];
  
  constructor(message: string, errors: ValidationError[]) {
    super(message, ErrorType.VALIDATION);
    this.name = 'ValidationFailedError';
    this.errors = errors;
  }
}

/**
 * Error thrown when event signing fails
 */
export class SigningFailedError extends EventManagementError {
  constructor(message: string) {
    super(message, ErrorType.SIGNING);
    this.name = 'SigningFailedError';
  }
}

/**
 * Error thrown when event publishing fails
 */
export class PublishingFailedError extends EventManagementError {
  constructor(message: string) {
    super(message, ErrorType.PUBLISHING);
    this.name = 'PublishingFailedError';
  }
}

/**
 * Error thrown when queue operations fail
 */
export class QueueError extends EventManagementError {
  constructor(message: string) {
    super(message, ErrorType.QUEUE);
    this.name = 'QueueError';
  }
}