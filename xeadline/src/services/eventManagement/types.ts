/**
 * Type definitions for the Event Management System
 * 
 * This file contains all the type definitions used throughout the Event Management System.
 */

// Event types
export interface UnsignedEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey: string;
}

export interface Event extends UnsignedEvent {
  id: string;
  sig: string;
}

// Result types
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface SigningResult {
  success: boolean;
  event?: Event;
  error?: string;
  needsPassword?: boolean;
}

export interface PublishResult {
  success: boolean;
  publishedTo: string[];
  error?: string;
}

export interface SignAndPublishResult extends SigningResult {
  publishedTo?: string[];
  pendingId?: string; // ID of the queued event if async processing
}

// Options types
export interface SigningOptions {
  privateKey?: string;
  password?: string;
  retryCount?: number;
  timeout?: number;
}

export interface PublishOptions {
  relays?: string[];
  timeout?: number;
  retries?: number;
}

export interface SignAndPublishOptions extends SigningOptions, PublishOptions {
  skipPublish?: boolean;
  priority?: Priority; // Added priority option for queue management
}

// Queue types
export enum Priority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

export interface QueuedEvent {
  id: string;
  event: UnsignedEvent;
  priority: Priority;
  createdAt: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface QueueStatus {
  queueLength: number;
  processing: number;
  maxSize: number;
}

// Error types
export enum ErrorType {
  VALIDATION = 'validation',
  SIGNING = 'signing',
  PUBLISHING = 'publishing',
  QUEUE = 'queue',
  GENERAL = 'general'
}

export interface ValidationError {
  field: string;
  message: string;
}

// Monitoring types
export interface EventStatus {
  id: string;
  status: 'created' | 'validated' | 'queued' | 'signed' | 'published' | 'failed';
  createdAt: number;
  updatedAt: number;
  error?: string;
  publishedTo?: string[];
}

export interface EventMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  publishSuccessRate: number;
}

// Service interfaces
export interface EventValidator {
  validate(event: UnsignedEvent): Promise<ValidationResult>;
}

export interface SigningMethod {
  canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean>;
  sign(event: UnsignedEvent, options?: SigningOptions): Promise<SigningResult>;
}