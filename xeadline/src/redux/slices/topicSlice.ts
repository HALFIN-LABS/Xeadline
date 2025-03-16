import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Event, getEventHash, Filter } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';
import nostrService from '../../services/nostr/nostrService';

// Define types
export interface Topic {
  id: string; // Format: <pubkey>:<d-identifier>
  name: string;
  slug: string; // Human-readable identifier for URLs
  description: string;
  rules: string[];
  image?: string;
  banner?: string;
  moderators: string[]; // Array of pubkeys
  createdAt: number;
  pubkey: string; // Creator's pubkey
  moderationSettings: {
    moderationType: 'pre-approval' | 'post-publication' | 'hybrid';
    autoApproveAfter?: number; // Number of successful posts before auto-approval
    requireLightningDeposit?: boolean;
    depositAmount?: number;
  };
  memberCount?: number;
}

export interface TopicState {
  byId: Record<string, Topic>;
  allIds: string[];
  subscribed: string[];
  trending: string[];
  new: string[];
  loading: boolean;
  error: string | null;
  currentTopicId: string | null;
}

const initialState: TopicState = {
  byId: {},
  allIds: [],
  subscribed: [],
  trending: [],
  new: [],
  loading: false,
  error: null,
  currentTopicId: null
};

// Helper function to get public key from private key
function getPublicKey(privateKeyBytes: Uint8Array): string {
  return Buffer.from(schnorr.getPublicKey(privateKeyBytes)).toString('hex');
}

// Create topic thunk
export const createTopic = createAsyncThunk(
  'topic/createTopic',
  async (
    {
      name,
      slug,
      description,
      rules,
      image,
      banner,
      moderationSettings,
      privateKey
    }: {
      name: string;
      slug: string;
      description: string;
      rules: string[];
      image?: string;
      banner?: string;
      moderationSettings: {
        moderationType: 'pre-approval' | 'post-publication' | 'hybrid';
        autoApproveAfter?: number;
        requireLightningDeposit?: boolean;
        depositAmount?: number;
      };
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Generate a unique identifier for the topic
      const dIdentifier = `${slug}-${Date.now().toString(36)}`;
      
      // Create the topic content
      const topicContent = {
        description,
        rules,
        image,
        banner,
        moderationSettings
      };
      
      // Create the topic event
      const event: Event = {
        kind: 34550, // NIP-72 topic definition
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', dIdentifier],
          ['name', name],
          ['client', 'xeadline'],
          ['xd', 'topic']
        ],
        content: JSON.stringify(topicContent),
        pubkey: '', // Will be filled in
        id: '', // Will be filled in
        sig: '' // Will be filled in
      };
      
      let signedEvent: Event;
      
      // Sign the event
      if (typeof window !== 'undefined' && window.nostr) {
        // Use Nostr extension
        event.pubkey = await window.nostr.getPublicKey();
        signedEvent = await window.nostr.signEvent(event);
      } else if (privateKey) {
        // Use provided private key
        const pubkey = getPublicKey(hexToBytes(privateKey));
        event.pubkey = pubkey;
        
        // Sign the event
        event.id = getEventHash(event);
        const sig = schnorr.sign(event.id, hexToBytes(privateKey));
        event.sig = Buffer.from(sig).toString('hex');
        signedEvent = event;
      } else {
        return rejectWithValue('No signing method available');
      }
      
      // Publish the event to Nostr relays
      console.log('Publishing topic event to Nostr relays:', {
        id: signedEvent.id,
        pubkey: signedEvent.pubkey,
        kind: signedEvent.kind,
        created_at: signedEvent.created_at,
        tags: signedEvent.tags,
        content: signedEvent.content
      });
      
      try {
        const publishedTo = await nostrService.publishEvent(signedEvent);
        console.log(`Published topic event to ${publishedTo.length} relays:`, publishedTo);
        
        if (publishedTo.length === 0) {
          console.error('Failed to publish to any relays. Check relay connections.');
        }
      } catch (error) {
        console.error('Error publishing to Nostr relays:', error);
        // Continue even if publishing fails, as we still want to create the topic in the local state
      }
      
      // Create the topic object
      const topic: Topic = {
        id: `${signedEvent.pubkey}:${dIdentifier}`,
        name,
        slug,
        description,
        rules,
        image,
        banner,
        moderators: [signedEvent.pubkey], // Creator is the initial moderator
        createdAt: signedEvent.created_at,
        pubkey: signedEvent.pubkey,
        moderationSettings,
        memberCount: 1 // Creator is the first member
      };
      
      // Create slug mapping in the database
      try {
        await fetch('/api/topic/slug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slug, topicId: topic.id }),
        });
      } catch (error) {
        console.error('Error creating slug mapping:', error);
        // Continue even if slug mapping fails
      }
      
      // Automatically subscribe the creator to the topic
      try {
        console.log(`Auto-subscribing creator to topic: ${topic.id}`);
        
        // Create a subscription event
        const subscriptionEvent: Event = {
          kind: TOPIC_SUBSCRIPTION_KIND,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ['e', topic.id], // Topic ID
            ['a', 'subscribe'], // Action
            ['client', 'xeadline']
          ],
          content: '',
          pubkey: signedEvent.pubkey,
          id: '', // Will be filled in
          sig: '' // Will be filled in
        };
        
        // Sign the subscription event
        let signedSubscriptionEvent: Event | null = null;
        if (typeof window !== 'undefined' && window.nostr) {
          // Use Nostr extension
          signedSubscriptionEvent = await window.nostr.signEvent(subscriptionEvent);
        } else if (privateKey) {
          // Use provided private key
          subscriptionEvent.id = getEventHash(subscriptionEvent);
          const sig = schnorr.sign(subscriptionEvent.id, hexToBytes(privateKey));
          subscriptionEvent.sig = Buffer.from(sig).toString('hex');
          signedSubscriptionEvent = subscriptionEvent;
        } else {
          console.error('No signing method available for subscription');
          // Continue even if subscription fails
        }
        
        // Publish the subscription event
        if (signedSubscriptionEvent) {
          const publishedTo = await nostrService.publishEvent(signedSubscriptionEvent);
          console.log(`Published subscription event to ${publishedTo.length} relays`);
          
          // Verify the subscription was published to at least one relay
          if (publishedTo.length === 0) {
            console.error('Failed to publish subscription to any relays. Retrying...');
            
            // Retry publishing the subscription event
            for (let i = 0; i < 3; i++) {
              console.log(`Retry attempt ${i + 1} to publish subscription...`);
              const retryPublishedTo = await nostrService.publishEvent(signedSubscriptionEvent);
              if (retryPublishedTo.length > 0) {
                console.log(`Successfully published subscription on retry ${i + 1}`);
                break;
              }
              
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          // Store subscription in local storage
          if (typeof window !== 'undefined') {
            try {
              const storedSubscriptions = JSON.parse(localStorage.getItem('topicSubscriptions') || '[]');
              if (!storedSubscriptions.includes(topic.id)) {
                storedSubscriptions.push(topic.id);
                localStorage.setItem('topicSubscriptions', JSON.stringify(storedSubscriptions));
              }
            } catch (e) {
              console.error('Error storing subscription in local storage:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error auto-subscribing to topic:', error);
        // Continue even if subscription fails
      }
      
      return topic;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create topic');
    }
  }
);

// Fetch topic thunk
export const fetchTopic = createAsyncThunk(
  'topic/fetchTopic',
  async (topicId: string, { rejectWithValue }) => {
    try {
      // Parse the topic ID to get pubkey and d-identifier
      const [pubkey, dIdentifier] = topicId.split(':');
      
      if (!pubkey || !dIdentifier) {
        return rejectWithValue('Invalid topic ID format');
      }
      
      // Try to fetch the topic from Nostr relays
      console.log(`Fetching topic with ID: ${topicId} from Nostr relays`);
      
      // Create filters to get the topic definition event
      // Try multiple filter combinations to increase chances of finding the topic
      const filters: Filter[] = [
        // Filter by author and d-tag
        {
          kinds: [34550], // NIP-72 topic definition
          authors: [pubkey],
          '#d': [dIdentifier],
          limit: 5
        },
        // Broader filter - just by d-tag
        {
          kinds: [34550], // NIP-72 topic definition
          '#d': [dIdentifier],
          limit: 5
        },
        // Try with just the base slug without the unique suffix
        {
          kinds: [34550], // NIP-72 topic definition
          '#d': [dIdentifier.split('-').slice(0, -1).join('-')],
          limit: 5
        }
      ];
      
      console.log('Nostr filters:', JSON.stringify(filters, null, 2));
      
      // Fetch events from Nostr relays
      const events = await nostrService.getEvents(filters);
      console.log(`Found ${events.length} topic events`);
      
      // Log all events for debugging
      events.forEach((event, index) => {
        console.log(`Event ${index}:`, {
          id: event.id,
          pubkey: event.pubkey,
          created_at: event.created_at,
          tags: event.tags,
          content: event.content.substring(0, 100) + (event.content.length > 100 ? '...' : '')
        });
      });
      
      if (events.length > 0) {
        // Sort events by created_at to get the most recent one
        const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
        const topicEvent = sortedEvents[0];
        
        console.log('Selected topic event:', {
          id: topicEvent.id,
          pubkey: topicEvent.pubkey,
          created_at: topicEvent.created_at,
          tags: topicEvent.tags
        });
        
        // Extract topic name from tags
        const nameTag = topicEvent.tags.find(tag => tag[0] === 'name');
        const name = nameTag ? nameTag[1] : `Topic ${dIdentifier}`;
        console.log('Extracted name:', name);
        
        // Parse the topic content from the event content
        let topicContent;
        try {
          console.log('Raw event content:', topicEvent.content);
          topicContent = JSON.parse(topicEvent.content);
          console.log('Parsed topic content:', topicContent);
          console.log('Extracted moderators:', Array.isArray(topicContent.moderators) ? topicContent.moderators : [pubkey]);
        } catch (error) {
          console.error('Error parsing topic content:', error);
          console.error('Content that failed to parse:', topicEvent.content);
          topicContent = {
            description: 'Error parsing topic content',
            rules: ['Be respectful', 'Stay on topic'],
            moderationSettings: {
              moderationType: 'post-publication'
            }
          };
        }
        
        // Create the topic object from the event
        const topic: Topic = {
          id: topicId,
          name,
          slug: dIdentifier,
          description: topicContent.description || 'No description provided',
          rules: Array.isArray(topicContent.rules) ? topicContent.rules : ['Be respectful', 'Stay on topic'],
          image: topicContent.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(dIdentifier)}&background=random&size=128`,
          banner: topicContent.banner || `https://ui-avatars.com/api/?name=${encodeURIComponent(dIdentifier)}&background=718096&color=FFFFFF&size=300&width=1200&height=300`,
          moderators: Array.isArray(topicContent.moderators) ? topicContent.moderators : [pubkey],
          createdAt: topicEvent.created_at,
          pubkey,
          moderationSettings: topicContent.moderationSettings || {
            moderationType: 'post-publication'
          },
          memberCount: 10 // Placeholder, would need to count actual members
        };
        
        console.log('Created topic object from Nostr event:', topic);
        return topic;
      }
      
      // If no topic events found, try to fetch from the database as fallback
      try {
        // Properly encode the topic ID for the URL
        const encodedTopicId = encodeURIComponent(topicId);
        console.log('Fetching topic with ID from API:', encodedTopicId);
        
        const response = await fetch(`/api/topic/${encodedTopicId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.topic) {
            return data.topic;
          }
        } else {
          console.error('Error response from API:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching topic from API:', error);
      }
      
      // Fall back to mock topic if all else fails
      console.log('Falling back to mock topic for ID:', topicId);
      console.log('This means the topic was not found in Nostr relays or the API');
      const mockTopic: Topic = {
        id: topicId,
        name: `Topic ${dIdentifier}`,
        slug: dIdentifier,
        description: 'Topic content is loading or unavailable. Please refresh the page.',
        rules: ['Be respectful', 'Stay on topic'],
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(dIdentifier)}&background=random&size=128`,
        banner: `https://ui-avatars.com/api/?name=${encodeURIComponent(dIdentifier)}&background=718096&color=FFFFFF&size=300&width=1200&height=300`,
        moderators: [pubkey],
        createdAt: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        pubkey,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 10
      };
      
      return mockTopic;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch topic');
    }
  }
);

// Fetch trending topics thunk
export const fetchTrendingTopics = createAsyncThunk(
  'topic/fetchTrendingTopics',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll just return mock topics
      // In a real implementation, you would fetch from Nostr relays
      const mockTopics: Topic[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `pubkey${i}:trending-topic-${i}`,
        name: `Trending Topic ${i + 1}`,
        slug: `trending-topic-${i + 1}`.toLowerCase().replace(/\s+/g, '-'),
        description: `This is trending topic ${i + 1}.`,
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [`pubkey${i}`],
        createdAt: Math.floor(Date.now() / 1000) - 86400 * (i + 1),
        pubkey: `pubkey${i}`,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 100 - i * 10
      }));
      
      return mockTopics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch trending topics');
    }
  }
);

// Fetch new topics thunk
export const fetchNewTopics = createAsyncThunk(
  'topic/fetchNewTopics',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll just return mock topics
      // In a real implementation, you would fetch from Nostr relays
      const mockTopics: Topic[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `pubkey${i}:new-topic-${i}`,
        name: `New Topic ${i + 1}`,
        slug: `new-topic-${i + 1}`.toLowerCase().replace(/\s+/g, '-'),
        description: `This is new topic ${i + 1}.`,
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [`pubkey${i}`],
        createdAt: Math.floor(Date.now() / 1000) - 3600 * (i + 1), // Hours ago
        pubkey: `pubkey${i}`,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 5 - i
      }));
      
      return mockTopics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch new topics');
    }
  }
);
// Define Nostr event kind for topic subscriptions
const TOPIC_SUBSCRIPTION_KIND = 34551; // NIP-72 topic subscription

// Fetch user's topic subscriptions
export const fetchUserSubscriptions = createAsyncThunk(
  'topic/fetchUserSubscriptions',
  async (pubkey: string, { rejectWithValue }) => {
    try {
      console.log(`Fetching topic subscriptions for user: ${pubkey}`);
      
      // Create a filter to get all topic subscription events for this user
      const filters: Filter[] = [
        {
          kinds: [TOPIC_SUBSCRIPTION_KIND],
          authors: [pubkey],
          limit: 100
        }
      ];
      
      // Fetch events from Nostr relays
      const events = await nostrService.getEvents(filters);
      console.log(`Found ${events.length} subscription events`);
      
      // Process events to get subscribed topic IDs
      // The most recent event for each topic ID determines the subscription status
      const subscriptionMap = new Map<string, { subscribed: boolean, timestamp: number }>();
      
      events.forEach((event: Event) => {
        // Extract topic ID from the event tags
        const topicTag = event.tags.find((tag: string[]) => tag[0] === 'e');
        if (!topicTag || !topicTag[1]) return;
        
        const topicId = topicTag[1];
        const timestamp = event.created_at;
        
        // Check if this is a subscription or unsubscription event
        const action = event.tags.find((tag: string[]) => tag[0] === 'a')?.[1];
        const subscribed = action === 'subscribe';
        
        // Only update if this is a more recent event
        if (!subscriptionMap.has(topicId) || subscriptionMap.get(topicId)!.timestamp < timestamp) {
          subscriptionMap.set(topicId, { subscribed, timestamp });
        }
      });
      
      // Get the list of currently subscribed topic IDs
      const subscribedTopicIds = Array.from(subscriptionMap.entries())
        .filter(([_, { subscribed }]) => subscribed)
        .map(([topicId]) => topicId);
      
      console.log(`User is subscribed to ${subscribedTopicIds.length} topics from Nostr`);
      
      // Update localStorage with the fetched subscriptions
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('topicSubscriptions', JSON.stringify(subscribedTopicIds));
          console.log('Updated localStorage with subscriptions from Nostr');
        } catch (e) {
          console.error('Error updating localStorage with subscriptions:', e);
        }
      }
      
      return subscribedTopicIds;
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user subscriptions');
    }
  }
);

// Subscribe to topic thunk
export const subscribeToTopic = createAsyncThunk(
  'topic/subscribeToTopic',
  async (
    {
      topicId,
      privateKey
    }: {
      topicId: string;
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log(`Subscribing to topic: ${topicId}`, {
        hasPrivateKey: !!privateKey,
        hasNostrExtension: typeof window !== 'undefined' && !!window.nostr
      });
      
      // Create a subscription event
      const event: Event = {
        kind: TOPIC_SUBSCRIPTION_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', topicId], // Topic ID
          ['a', 'subscribe'], // Action
          ['client', 'xeadline']
        ],
        content: '',
        pubkey: '', // Will be filled in
        id: '', // Will be filled in
        sig: '' // Will be filled in
      };
      
      let signedEvent: Event;
      
      // Sign the event
      if (typeof window !== 'undefined' && window.nostr) {
        // Use Nostr extension
        event.pubkey = await window.nostr.getPublicKey();
        signedEvent = await window.nostr.signEvent(event);
      } else if (privateKey) {
        // Use provided private key
        const pubkey = getPublicKey(hexToBytes(privateKey));
        event.pubkey = pubkey;
        
        // Sign the event
        event.id = getEventHash(event);
        const sig = schnorr.sign(event.id, hexToBytes(privateKey));
        event.sig = Buffer.from(sig).toString('hex');
        signedEvent = event;
      } else {
        return rejectWithValue('No signing method available');
      }
      
      // Publish the event to relays
      const publishedTo = await nostrService.publishEvent(signedEvent);
      console.log(`Published subscription event to ${publishedTo.length} relays`);
      
      // Verify the subscription was published to at least one relay
      if (publishedTo.length === 0) {
        console.error('Failed to publish subscription to any relays. Retrying...');
        
        // Retry publishing the subscription event
        let retrySuccess = false;
        for (let i = 0; i < 3; i++) {
          console.log(`Retry attempt ${i + 1} to publish subscription...`);
          const retryPublishedTo = await nostrService.publishEvent(signedEvent);
          if (retryPublishedTo.length > 0) {
            console.log(`Successfully published subscription on retry ${i + 1}`);
            retrySuccess = true;
            break;
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!retrySuccess) {
          console.error('All retry attempts failed. Subscription may not be properly synced.');
        }
      }
      
      // Store subscription in local storage for faster loading next time
      if (typeof window !== 'undefined') {
        try {
          const storedSubscriptions = JSON.parse(localStorage.getItem('topicSubscriptions') || '[]');
          if (!storedSubscriptions.includes(topicId)) {
            storedSubscriptions.push(topicId);
            localStorage.setItem('topicSubscriptions', JSON.stringify(storedSubscriptions));
          }
        } catch (e) {
          console.error('Error storing subscription in local storage:', e);
        }
      }
      
      return topicId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to subscribe to topic');
    }
  }
);

// Unsubscribe from topic thunk
export const unsubscribeFromTopic = createAsyncThunk(
  'topic/unsubscribeFromTopic',
  async (
    {
      topicId,
      privateKey
    }: {
      topicId: string;
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log(`Unsubscribing from topic: ${topicId}`);
      
      // Create an unsubscription event
      const event: Event = {
        kind: TOPIC_SUBSCRIPTION_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', topicId], // Topic ID
          ['a', 'unsubscribe'], // Action
          ['client', 'xeadline']
        ],
        content: '',
        pubkey: '', // Will be filled in
        id: '', // Will be filled in
        sig: '' // Will be filled in
      };
      
      let signedEvent: Event;
      
      // Sign the event
      if (typeof window !== 'undefined' && window.nostr) {
        // Use Nostr extension
        event.pubkey = await window.nostr.getPublicKey();
        signedEvent = await window.nostr.signEvent(event);
      } else if (privateKey) {
        // Use provided private key
        const pubkey = getPublicKey(hexToBytes(privateKey));
        event.pubkey = pubkey;
        
        // Sign the event
        event.id = getEventHash(event);
        const sig = schnorr.sign(event.id, hexToBytes(privateKey));
        event.sig = Buffer.from(sig).toString('hex');
        signedEvent = event;
      } else {
        return rejectWithValue('No signing method available');
      }
      
      // Publish the event to relays
      const publishedTo = await nostrService.publishEvent(signedEvent);
      console.log(`Published unsubscription event to ${publishedTo.length} relays`);
      
      // Verify the unsubscription was published to at least one relay
      if (publishedTo.length === 0) {
        console.error('Failed to publish unsubscription to any relays. Retrying...');
        
        // Retry publishing the unsubscription event
        let retrySuccess = false;
        for (let i = 0; i < 3; i++) {
          console.log(`Retry attempt ${i + 1} to publish unsubscription...`);
          const retryPublishedTo = await nostrService.publishEvent(signedEvent);
          if (retryPublishedTo.length > 0) {
            console.log(`Successfully published unsubscription on retry ${i + 1}`);
            retrySuccess = true;
            break;
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!retrySuccess) {
          console.error('All retry attempts failed. Unsubscription may not be properly synced.');
        }
      }
      
      // Remove subscription from local storage
      if (typeof window !== 'undefined') {
        try {
          const storedSubscriptions = JSON.parse(localStorage.getItem('topicSubscriptions') || '[]');
          const updatedSubscriptions = storedSubscriptions.filter((id: string) => id !== topicId);
          localStorage.setItem('topicSubscriptions', JSON.stringify(updatedSubscriptions));
        } catch (e) {
          console.error('Error removing subscription from local storage:', e);
        }
      }
      
      return topicId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to unsubscribe from topic');
    }
  }
);

// Initialize topic subscriptions from local storage and Nostr
export const initializeSubscriptions = createAsyncThunk(
  'topic/initializeSubscriptions',
  async (_, { dispatch, getState }) => {
    try {
      console.log('Initializing topic subscriptions');
      
      // First try to load from local storage for immediate UI update
      let subscriptions: string[] = [];
      if (typeof window !== 'undefined') {
        try {
          subscriptions = JSON.parse(localStorage.getItem('topicSubscriptions') || '[]');
          console.log(`Loaded ${subscriptions.length} subscriptions from local storage`);
        } catch (e) {
          console.error('Error loading subscriptions from local storage:', e);
        }
      }
      
      // Then try to fetch from Nostr relays if user is authenticated
      const state = getState() as RootState;
      const currentUser = state.auth.currentUser;
      
      if (currentUser?.publicKey) {
        try {
          console.log('Fetching subscriptions from Nostr for user:', currentUser.publicKey);
          // Wait for Nostr subscriptions to be fetched
          const nostrSubscriptions = await dispatch(fetchUserSubscriptions(currentUser.publicKey)).unwrap();
          console.log(`Fetched ${nostrSubscriptions.length} subscriptions from Nostr`);
          
          // Return the Nostr subscriptions as they are more authoritative
          return nostrSubscriptions;
        } catch (error) {
          console.error('Error fetching subscriptions from Nostr:', error);
          // If Nostr fetch fails, fall back to local storage subscriptions
          console.log('Falling back to local storage subscriptions');
        }
      } else {
        console.log('User not authenticated, using only local storage subscriptions');
      }
      
      return subscriptions;
    } catch (error) {
      console.error('Error initializing subscriptions:', error);
      return [];
    }
  }
);

// Create the topic slice
export const topicSlice = createSlice({
  name: 'topic',
  initialState,
  reducers: {
    setCurrentTopic: (state, action: PayloadAction<string>) => {
      state.currentTopicId = action.payload;
    },
    clearCurrentTopic: (state) => {
      state.currentTopicId = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create topic
      .addCase(createTopic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTopic.fulfilled, (state, action) => {
        state.loading = false;
        state.byId[action.payload.id] = action.payload;
        state.allIds.push(action.payload.id);
        state.subscribed.push(action.payload.id);
        state.new.unshift(action.payload.id);
        state.currentTopicId = action.payload.id;
      })
      .addCase(createTopic.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch topic
      .addCase(fetchTopic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTopic.fulfilled, (state, action) => {
        state.loading = false;
        state.byId[action.payload.id] = action.payload;
        if (!state.allIds.includes(action.payload.id)) {
          state.allIds.push(action.payload.id);
        }
        state.currentTopicId = action.payload.id;
      })
      .addCase(fetchTopic.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch trending topics
      .addCase(fetchTrendingTopics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrendingTopics.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add topics to byId and allIds
        action.payload.forEach(topic => {
          state.byId[topic.id] = topic;
          if (!state.allIds.includes(topic.id)) {
            state.allIds.push(topic.id);
          }
        });
        
        // Update trending list
        state.trending = action.payload.map(topic => topic.id);
      })
      .addCase(fetchTrendingTopics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch new topics
      .addCase(fetchNewTopics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewTopics.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add topics to byId and allIds
        action.payload.forEach(topic => {
          state.byId[topic.id] = topic;
          if (!state.allIds.includes(topic.id)) {
            state.allIds.push(topic.id);
          }
        });
        
        // Update new list
        state.new = action.payload.map(topic => topic.id);
      })
      .addCase(fetchNewTopics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Initialize subscriptions
      .addCase(initializeSubscriptions.fulfilled, (state, action) => {
        // Replace the subscribed array with the loaded subscriptions
        state.subscribed = action.payload;
      })
      
      // Fetch user subscriptions
      .addCase(fetchUserSubscriptions.fulfilled, (state, action) => {
        // Merge with existing subscriptions to avoid duplicates
        const newSubscriptions = action.payload.filter(id => !state.subscribed.includes(id));
        if (newSubscriptions.length > 0) {
          state.subscribed = [...state.subscribed, ...newSubscriptions];
          
          // Update local storage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('topicSubscriptions', JSON.stringify(state.subscribed));
            } catch (e) {
              console.error('Error updating local storage with subscriptions:', e);
            }
          }
        }
      })
      
      // Subscribe to topic
      .addCase(subscribeToTopic.fulfilled, (state, action) => {
        if (!state.subscribed.includes(action.payload)) {
          state.subscribed.push(action.payload);
        }
      })
      
      // Unsubscribe from topic
      .addCase(unsubscribeFromTopic.fulfilled, (state, action) => {
        state.subscribed = state.subscribed.filter(id => id !== action.payload);
      })
      
      // Update topic moderators
      .addCase(updateTopicModerators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTopicModerators.fulfilled, (state, action) => {
        state.loading = false;
        // Update the topic in the store
        state.byId[action.payload.id] = action.payload;
      })
      .addCase(updateTopicModerators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Update topic moderators thunk
export const updateTopicModerators = createAsyncThunk(
  'topic/updateTopicModerators',
  async (
    {
      topicId,
      moderators,
      privateKey
    }: {
      topicId: string;
      moderators: string[]; // Array of pubkeys
      privateKey?: string;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as RootState;
      const topic = state.topic.byId[topicId];
      
      if (!topic) {
        return rejectWithValue('Topic not found');
      }
      
      // Parse the topic ID to get pubkey and d-identifier
      const [pubkey, dIdentifier] = topicId.split(':');
      
      if (!pubkey || !dIdentifier) {
        return rejectWithValue('Invalid topic ID format');
      }
      
      // Create the updated topic content
      const topicContent = {
        description: topic.description,
        rules: topic.rules,
        image: topic.image,
        banner: topic.banner,
        moderationSettings: topic.moderationSettings,
        moderators: moderators
      };
      
      // Create the topic update event
      const event: Event = {
        kind: 34550, // NIP-72 topic definition
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', dIdentifier],
          ['name', topic.name],
          ['client', 'xeadline'],
          ['xd', 'topic']
        ],
        content: JSON.stringify(topicContent),
        pubkey: '', // Will be filled in
        id: '', // Will be filled in
        sig: '' // Will be filled in
      };
      
      let signedEvent: Event;
      
      // Sign the event
      if (typeof window !== 'undefined' && window.nostr) {
        // Use Nostr extension
        event.pubkey = await window.nostr.getPublicKey();
        
        // Verify that the current user is a moderator
        if (!topic.moderators.includes(event.pubkey)) {
          return rejectWithValue('Only topic moderators can update moderators');
        }
        
        signedEvent = await window.nostr.signEvent(event);
      } else if (privateKey) {
        // Use provided private key
        const derivedPubkey = getPublicKey(hexToBytes(privateKey));
        
        // Verify that the current user is a moderator
        if (!topic.moderators.includes(derivedPubkey)) {
          return rejectWithValue('Only topic moderators can update moderators');
        }
        
        event.pubkey = derivedPubkey;
        
        // Sign the event
        event.id = getEventHash(event);
        const sig = schnorr.sign(event.id, hexToBytes(privateKey));
        event.sig = Buffer.from(sig).toString('hex');
        signedEvent = event;
      } else {
        return rejectWithValue('No signing method available');
      }
      
      // Publish the event to Nostr relays
      console.log('Publishing topic update event to Nostr relays:', {
        id: signedEvent.id,
        pubkey: signedEvent.pubkey,
        kind: signedEvent.kind,
        created_at: signedEvent.created_at,
        tags: signedEvent.tags,
        content: signedEvent.content
      });
      
      const publishedTo = await nostrService.publishEvent(signedEvent);
      console.log(`Published topic update event to ${publishedTo.length} relays:`, publishedTo);
      
      // Verify the event was published to at least one relay
      if (publishedTo.length === 0) {
        console.error('Failed to publish to any relays. Retrying...');
        
        // Retry publishing the event
        let retrySuccess = false;
        for (let i = 0; i < 3; i++) {
          console.log(`Retry attempt ${i + 1} to publish topic update...`);
          const retryPublishedTo = await nostrService.publishEvent(signedEvent);
          if (retryPublishedTo.length > 0) {
            console.log(`Successfully published topic update on retry ${i + 1}`);
            retrySuccess = true;
            break;
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!retrySuccess) {
          console.error('All retry attempts failed. Topic update may not be properly synced.');
          return rejectWithValue('Failed to publish topic update to any relays');
        }
      }
      
      // Create the updated topic object
      const updatedTopic: Topic = {
        ...topic,
        moderators: moderators
      };
      
      return updatedTopic;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update topic moderators');
    }
  }
);

// Export actions
export const { setCurrentTopic, clearCurrentTopic, clearError } = topicSlice.actions;

// Basic selectors
export const selectTopics = (state: RootState) => state.topic.byId;
export const selectAllTopicIds = (state: RootState) => state.topic.allIds;
export const selectSubscribedIds = (state: RootState) => state.topic.subscribed;
export const selectTrendingIds = (state: RootState) => state.topic.trending;
export const selectNewIds = (state: RootState) => state.topic.new;
export const selectCurrentTopicId = (state: RootState) => state.topic.currentTopicId;
export const selectTopicLoading = (state: RootState) => state.topic.loading;
export const selectTopicError = (state: RootState) => state.topic.error;

// Memoized selectors
export const selectSubscribedTopics = createSelector(
  [selectTopics, selectSubscribedIds],
  (topics, subscribedIds) => subscribedIds.map((id: string) => topics[id]).filter(Boolean)
);

export const selectTrendingTopics = createSelector(
  [selectTopics, selectTrendingIds],
  (topics, trendingIds) => trendingIds.map((id: string) => topics[id]).filter(Boolean)
);

export const selectNewTopics = createSelector(
  [selectTopics, selectNewIds],
  (topics, newIds) => newIds.map((id: string) => topics[id]).filter(Boolean)
);

export const selectCurrentTopic = createSelector(
  [selectTopics, selectCurrentTopicId],
  (topics, currentId) => currentId ? topics[currentId] : null
);

export const selectIsSubscribed = (state: RootState, topicId: string) =>
  state.topic.subscribed.includes(topicId);

export default topicSlice.reducer;