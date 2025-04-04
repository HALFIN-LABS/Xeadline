'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectCurrentTopic, updateTopicModerators } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache';
import Image from 'next/image';
import Link from 'next/link';
import MemberRoleSelector from '../moderation/MemberRoleSelector';
import nostrService from '../../services/nostr/nostrService';
import { Event, Filter } from 'nostr-tools';
import { retrievePrivateKey } from '../../utils/nostrKeys';
import { signEvent, UnsignedEvent } from '../../services/nostr/eventSigningService';

// Define member roles
export type MemberRole = 'member' | 'contributor' | 'moderator' | 'admin' | 'banned';

// Define member interface
interface Member {
  pubkey: string;
  role: MemberRole;
  joinedAt: number;
  lastActive?: number;
}

interface MemberListPageProps {
  topicId: string;
}

// Member item component
const MemberItem = ({ 
  member, 
  isModerator, 
  onRoleChange 
}: { 
  member: Member; 
  isModerator: boolean;
  onRoleChange: (pubkey: string, newRole: MemberRole) => void;
}) => {
  const { username, profile } = useUserProfileWithCache(member.pubkey);
  
  // Generate a placeholder image if none is provided
  const imageUrl = profile?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || member.pubkey.substring(0, 8))}&background=random&size=128`;
  
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-4">
          <Image
            src={imageUrl}
            alt={username || member.pubkey.substring(0, 8)}
            width={48}
            height={48}
            className="object-cover"
          />
        </div>
        <div>
          <Link
            href={`/profile/${member.pubkey}`}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {profile?.displayName || username || `${member.pubkey.substring(0, 8)}...`}
          </Link>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Joined {new Date(member.joinedAt * 1000).toLocaleDateString()}
          </div>
          {member.lastActive && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last active {new Date(member.lastActive * 1000).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center">
        <div className={`px-3 py-1 rounded-full text-sm font-medium mr-4 ${
          member.role === 'banned' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-300 dark:border-red-700' :
          member.role === 'moderator' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          member.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          member.role === 'contributor' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}>
          {member.role === 'banned' ? 'Banned' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </div>
        
        {isModerator && (
          <MemberRoleSelector
            currentRole={member.role}
            pubkey={member.pubkey}
            onRoleChange={onRoleChange}
          />
        )}
      </div>
    </div>
  );
};

export default function MemberListPage({ topicId }: MemberListPageProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentTopic = useAppSelector(selectCurrentTopic);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'all'>('all');
  
  // Check if current user is a moderator
  const isModerator = currentTopic?.moderators.includes(currentUser?.publicKey || '') || false;
  
  useEffect(() => {
    if (topicId) {
      fetchMembers();
    }
  }, [topicId]);
  
  // Define Nostr event kind for topic subscriptions
  const TOPIC_SUBSCRIPTION_KIND = 34551; // NIP-72 topic subscription

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching members for topic:', topicId);
      
      // Create a filter to get all subscription events for this topic
      // Include a larger limit to ensure we get all events
      const filters: Filter[] = [
        {
          kinds: [TOPIC_SUBSCRIPTION_KIND],
          '#e': [topicId],
          limit: 2000
        }
      ];
      
      // Add specific filters for ban events to ensure we catch them all
      // Use multiple filters with different strategies to ensure we catch all ban events
      const banFilters: Filter[] = [
        {
          kinds: [TOPIC_SUBSCRIPTION_KIND],
          '#e': [topicId],
          '#a': ['ban', 'unban'],
          limit: 1000
        },
        // Additional filter to catch ban events that might not have the 'a' tag indexed properly
        {
          kinds: [TOPIC_SUBSCRIPTION_KIND],
          '#e': [topicId],
          '#p': [], // This will match any event with a 'p' tag, which ban events should have
          limit: 1000
        },
        // Filter by content to catch ban events that might have been created with different tag structures
        {
          kinds: [TOPIC_SUBSCRIPTION_KIND],
          '#e': [topicId],
          limit: 1000
        },
        // Filter specifically for events with the 't' tag set to 'moderation'
        {
          kinds: [TOPIC_SUBSCRIPTION_KIND],
          '#e': [topicId],
          '#t': ['moderation'],
          limit: 1000
        }
      ];
      
      // Store member data in localStorage to provide consistency between page refreshes
      const localStorageKey = `topic-members-${topicId}`;
      let cachedMembers: Member[] = [];
      
      try {
        const cachedData = localStorage.getItem(localStorageKey);
        if (cachedData) {
          cachedMembers = JSON.parse(cachedData);
          console.log(`Loaded ${cachedMembers.length} members from cache`);
        }
      } catch (e) {
        console.error('Error loading cached members:', e);
      }
      
      // Fetch all subscription events from Nostr relays with a longer timeout
      console.log('Fetching subscription events with increased timeout...');
      let subscriptionEvents = await Promise.race([
        nostrService.getEvents(filters),
        // If getEvents takes too long, use a longer timeout but don't fail completely
        new Promise<Event[]>(resolve =>
          setTimeout(() => {
            console.log('Using extended timeout for event fetching');
            nostrService.getEvents(filters).then(resolve);
          }, 10000)
        )
      ]);
      
      console.log(`Found ${subscriptionEvents.length} subscription events for topic ${topicId}`);
      
      // Fetch specific ban events to ensure we don't miss any
      console.log('Fetching ban events...');
      let banEvents = await nostrService.getEvents(banFilters);
      console.log(`Found ${banEvents.length} ban/unban events for topic ${topicId}`);
      
      // Merge all events, removing duplicates by event ID
      const eventMap = new Map<string, Event>();
      [...subscriptionEvents, ...banEvents].forEach(event => {
        eventMap.set(event.id, event);
      });
      
      let events = Array.from(eventMap.values());
      console.log(`Combined ${events.length} unique events for processing`);
      
      // Sort events by timestamp (newest first) to ensure we process the most recent events first
      events = events.sort((a, b) => b.created_at - a.created_at);
      
      // DEBUG: Log all events to inspect their structure (sorted by timestamp)
      console.log('DEBUG - All subscription events (sorted by timestamp, newest first):', events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        created_at_date: new Date(event.created_at * 1000).toISOString(),
        tags: event.tags,
        content: event.content
      })));
      
      // First, sort events by timestamp (newest first) to ensure we process the most recent events first
      events = events.sort((a, b) => b.created_at - a.created_at);
      
      // Process events to get current subscribers and their status
      // We'll use two maps: one for regular subscription events and one for ban events
      const subscriptionMap = new Map<string, { subscribed: boolean, banned: boolean, timestamp: number }>();
      const banMap = new Map<string, { banned: boolean, timestamp: number }>();
      
      // Enhanced logging for debugging subscription issues
      console.log('DEBUG - All event tags:', events.map(event => ({
        pubkey: event.pubkey.substring(0, 8),
        tags: event.tags,
        created_at: event.created_at,
        action: event.tags.find(tag => tag[0] === 'a')?.[1] || 'MISSING_ACTION_TAG'
      })));
      
      // First pass: process all events to separate subscription and ban events
      events.forEach((event: Event) => {
        const pubkey = event.pubkey;
        const timestamp = event.created_at;
        
        // Get the target user (if this is a ban event targeting another user)
        const targetTag = event.tags.find((tag: string[]) => tag[0] === 'p');
        const targetPubkey = targetTag?.[1] || pubkey; // If no target, assume it's about the event creator
        
        // Check if this is a subscription, unsubscription, or ban event
        const actionTag = event.tags.find((tag: string[]) => tag[0] === 'a');
        const action = actionTag?.[1];
        
        // Process based on action type
        if (action === 'ban' || action === 'unban') {
          // This is a ban/unban event targeting another user
          const banned = action === 'ban';
          
          // Only update if this is a more recent ban event for this user
          if (!banMap.has(targetPubkey) || banMap.get(targetPubkey)!.timestamp < timestamp) {
            console.log(`DEBUG - Processing ${action} event for ${targetPubkey.substring(0, 8)} by ${pubkey.substring(0, 8)}`, {
              timestamp,
              eventId: event.id
            });
            banMap.set(targetPubkey, { banned, timestamp });
            
            // Also update the subscription map if it exists
            if (subscriptionMap.has(targetPubkey)) {
              const subInfo = subscriptionMap.get(targetPubkey)!;
              // Only update if this ban event is more recent
              if (subInfo.timestamp < timestamp) {
                console.log(`DEBUG - Updating subscription map with ban status for ${targetPubkey.substring(0, 8)}`);
                subscriptionMap.set(targetPubkey, {
                  ...subInfo,
                  banned,
                  timestamp
                });
              }
            } else {
              // If the user isn't in the subscription map yet, add them
              console.log(`DEBUG - Adding banned user to subscription map: ${targetPubkey.substring(0, 8)}`);
              subscriptionMap.set(targetPubkey, {
                subscribed: true, // Assume they're subscribed if they're being banned
                banned,
                timestamp
              });
            }
          }
        } else {
          // This is a regular subscription event
          const subscribed = action !== 'unsubscribe'; // Default to subscribed if no action tag or action is not 'unsubscribe'
          
          // Only update if this is a more recent subscription event for this user
          if (!subscriptionMap.has(pubkey) || subscriptionMap.get(pubkey)!.timestamp < timestamp) {
            console.log(`DEBUG - Processing ${action || 'subscription'} event for ${pubkey.substring(0, 8)}`, {
              timestamp,
              eventId: event.id
            });
            
            // Check if there's a ban status for this user
            const banInfo = banMap.get(pubkey);
            const banned = banInfo ? banInfo.banned : false;
            
            subscriptionMap.set(pubkey, {
              subscribed,
              banned,
              timestamp
            });
          }
        }
      });
      
      // Log the separate maps for debugging
      console.log('DEBUG - Subscription map:', Array.from(subscriptionMap.entries()).map(([key, value]) => ({
        pubkey: key.substring(0, 8),
        subscribed: value.subscribed,
        banned: value.banned,
        timestamp: value.timestamp,
        date: new Date(value.timestamp * 1000).toISOString()
      })));
      
      console.log('DEBUG - Ban map:', Array.from(banMap.entries()).map(([key, value]) => ({
        pubkey: key.substring(0, 8),
        banned: value.banned,
        timestamp: value.timestamp,
        date: new Date(value.timestamp * 1000).toISOString()
      })));
      
      // Now we need to merge the subscription and ban information
      // Create a combined map with the final status of each user
      const mergedStatusMap = new Map<string, { subscribed: boolean, banned: boolean, timestamp: number }>();
      
      // First, add all subscribed users
      subscriptionMap.forEach((subInfo, pubkey) => {
        mergedStatusMap.set(pubkey, {
          subscribed: subInfo.subscribed,
          banned: subInfo.banned, // Use the banned status from subscription map
          timestamp: subInfo.timestamp
        });
      });
      
      // Then apply ban status
      banMap.forEach((banInfo, pubkey) => {
        const existingInfo = mergedStatusMap.get(pubkey);
        if (existingInfo) {
          // Update existing entry
          existingInfo.banned = banInfo.banned;
          // Use the most recent timestamp
          if (banInfo.timestamp > existingInfo.timestamp) {
            existingInfo.timestamp = banInfo.timestamp;
          }
        } else {
          // Create new entry if user wasn't in subscription map
          mergedStatusMap.set(pubkey, {
            subscribed: true, // Assume subscribed if they're banned
            banned: banInfo.banned,
            timestamp: banInfo.timestamp
          });
        }
      });
      
      // Check for users with multiple events and verify we're using the most recent one
      const userEventCounts = new Map<string, number>();
      events.forEach(event => {
        const pubkey = event.pubkey;
        userEventCounts.set(pubkey, (userEventCounts.get(pubkey) || 0) + 1);
      });
      
      const usersWithMultipleEvents = Array.from(userEventCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([pubkey, count]) => ({ pubkey, count }));
      
      if (usersWithMultipleEvents.length > 0) {
        console.log('DEBUG - Users with multiple events:', usersWithMultipleEvents);
        
        // For each user with multiple events, log all their events sorted by timestamp
        usersWithMultipleEvents.forEach(({ pubkey, count }) => {
          const userEvents = events
            .filter(event => event.pubkey === pubkey)
            .sort((a, b) => b.created_at - a.created_at);
          
          console.log(`DEBUG - All events for user ${pubkey.substring(0, 8)} (${count} events, newest first):`,
            userEvents.map(event => ({
              id: event.id,
              created_at: event.created_at,
              created_at_date: new Date(event.created_at * 1000).toISOString(),
              tags: event.tags,
              action: event.tags.find(tag => tag[0] === 'a')?.[1] || 'MISSING_ACTION_TAG'
            }))
          );
          
          // Check if the subscription map has the most recent event for this user
          const mostRecentEvent = userEvents[0];
          const subscriptionEntry = subscriptionMap.get(pubkey);
          
          if (subscriptionEntry) {
            const usingMostRecent = subscriptionEntry.timestamp === mostRecentEvent.created_at;
            console.log(`DEBUG - For user ${pubkey.substring(0, 8)}: Using most recent event? ${usingMostRecent}`, {
              mostRecentEventTimestamp: mostRecentEvent.created_at,
              mostRecentEventDate: new Date(mostRecentEvent.created_at * 1000).toISOString(),
              subscriptionMapTimestamp: subscriptionEntry.timestamp,
              subscriptionMapDate: new Date(subscriptionEntry.timestamp * 1000).toISOString(),
              subscriptionMapSubscribed: subscriptionEntry.subscribed,
              subscriptionMapBanned: subscriptionEntry.banned
            });
          }
        });
      }
      
      // DEBUG: Log the final subscription map
      console.log('DEBUG - Final subscription map:', Array.from(subscriptionMap.entries()).map(([key, value]) => ({
        pubkey: key,
        pubkeyShort: key.substring(0, 8),
        subscribed: value.subscribed,
        banned: value.banned,
        timestamp: value.timestamp,
        date: new Date(value.timestamp * 1000).toISOString()
      })));
      
      // Create member objects for all subscribed users
      const allMembers: Member[] = [];
      
      // DEBUG: Log moderators from currentTopic
      console.log('DEBUG - Current topic moderators:', currentTopic?.moderators || []);
      
      // First add moderators with the moderator role
      if (currentTopic) {
        currentTopic.moderators.forEach(pubkey => {
          console.log(`DEBUG - Adding moderator: ${pubkey.substring(0, 8)}...`);
          allMembers.push({
            pubkey,
            role: 'moderator' as MemberRole,
            joinedAt: currentTopic.createdAt,
            lastActive: Math.floor(Date.now() / 1000)
          });
        });
      }
      
      // Then add all other subscribers with the member role
      console.log('DEBUG - Processing subscription map for regular members...');
      let skippedCount = 0;
      let addedCount = 0;
      
      subscriptionMap.forEach(({ subscribed, banned, timestamp }, pubkey) => {
        console.log(`DEBUG - Checking member: ${pubkey.substring(0, 8)}...`, {
          subscribed,
          banned,
          timestamp,
          isModerator: currentTopic?.moderators.includes(pubkey)
        });
        
        if (subscribed) {
          // Skip if already added as a moderator
          if (!currentTopic?.moderators.includes(pubkey)) {
            console.log(`DEBUG - Adding regular member: ${pubkey.substring(0, 8)}...`);
            allMembers.push({
              pubkey,
              role: banned ? 'banned' as MemberRole : 'member' as MemberRole,
              joinedAt: timestamp,
              lastActive: timestamp
            });
            addedCount++;
          } else {
            console.log(`DEBUG - Skipping member (already a moderator): ${pubkey.substring(0, 8)}...`);
            skippedCount++;
          }
        } else {
          console.log(`DEBUG - Skipping member (not subscribed): ${pubkey.substring(0, 8)}...`);
          skippedCount++;
        }
      });
      
      // Double-check for any missing members in the original events
      // This helps catch users who might have joined but whose subscription status
      // wasn't properly tracked in the subscriptionMap
      console.log('DEBUG - Double-checking for missing members in original events...');
      const existingPubkeys = new Set(allMembers.map(member => member.pubkey));
      
      events.forEach((event: Event) => {
        const pubkey = event.pubkey;
        const timestamp = event.created_at;
        
        // If this pubkey isn't already in our members list and the event looks like a subscription
        if (!existingPubkeys.has(pubkey) && !currentTopic?.moderators.includes(pubkey)) {
          // Check if this looks like a subscription event (has 'e' tag for the topic)
          const hasTopicTag = event.tags.some(tag => tag[0] === 'e' && tag[1] === topicId);
          const actionTag = event.tags.find(tag => tag[0] === 'a');
          const action = actionTag?.[1];
          const isSubscribeAction = !actionTag || action === 'subscribe';
          const isBanAction = action === 'ban';
          
          if (hasTopicTag && (isSubscribeAction || isBanAction)) {
            console.log(`DEBUG - Found missing member in events: ${pubkey.substring(0, 8)}...`);
            allMembers.push({
              pubkey,
              role: isBanAction ? 'banned' as MemberRole : 'member' as MemberRole,
              joinedAt: timestamp,
              lastActive: timestamp
            });
            addedCount++;
          }
        }
      });
      
      console.log(`DEBUG - Member processing summary: Added ${addedCount}, Skipped ${skippedCount}`);
      console.log('MemberListPage - Loaded members:', allMembers.length);
      
      // DEBUG: Log all members for verification with more details
      console.log('DEBUG - All members:', allMembers.map(member => ({
        pubkey: member.pubkey,
        pubkeyShort: member.pubkey.substring(0, 8),
        role: member.role,
        joinedAt: member.joinedAt,
        joinedDate: new Date(member.joinedAt * 1000).toISOString()
      })));
      
      // Log subscription events for each member to help diagnose issues
      console.log('DEBUG - Subscription events by member:');
      allMembers.forEach(member => {
        const memberEvents = events.filter(event => event.pubkey === member.pubkey);
        console.log(`Member ${member.pubkey.substring(0, 8)} has ${memberEvents.length} events:`,
          memberEvents.map(event => ({
            id: event.id,
            created_at: new Date(event.created_at * 1000).toISOString(),
            tags: event.tags
          }))
        );
      });
      
      // Log any subscription events for users not in the member list
      const memberPubkeys = new Set(allMembers.map(member => member.pubkey));
      const nonMemberEvents = events.filter(event => !memberPubkeys.has(event.pubkey));
      if (nonMemberEvents.length > 0) {
        console.log(`DEBUG - Found ${nonMemberEvents.length} events from users not in member list:`,
          nonMemberEvents.map(event => ({
            pubkey: event.pubkey,
            pubkeyShort: event.pubkey.substring(0, 8),
            id: event.id,
            created_at: new Date(event.created_at * 1000).toISOString(),
            tags: event.tags
          }))
        );
      }
      
      // Merge with cached members to ensure consistency between page refreshes
      // If a member exists in both lists, use the one from allMembers (newly fetched)
      const mergedMembers: Member[] = [...cachedMembers];
      
      // Create a map of existing cached members by pubkey for quick lookup
      const cachedMemberMap = new Map<string, Member>();
      cachedMembers.forEach(member => {
        cachedMemberMap.set(member.pubkey, member);
      });
      
      // Add or update members from allMembers
      allMembers.forEach(member => {
        const existingIndex = mergedMembers.findIndex(m => m.pubkey === member.pubkey);
        if (existingIndex >= 0) {
          // Update existing member
          mergedMembers[existingIndex] = member;
        } else {
          // Add new member
          mergedMembers.push(member);
        }
      });
      
      console.log(`Final member count: ${mergedMembers.length} (${allMembers.length} from current fetch, ${cachedMembers.length} from cache)`);
      
      // Save to localStorage for next time
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(mergedMembers));
        console.log(`Saved ${mergedMembers.length} members to cache`);
      } catch (e) {
        console.error('Error saving members to cache:', e);
      }
      
      setMembers(mergedMembers);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(typeof err === 'string' ? err : 'Failed to fetch members');
      setIsLoading(false);
    }
  };
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{pubkey: string, newRole: MemberRole} | null>(null);
  const [roleChangeSuccess, setRoleChangeSuccess] = useState<string | null>(null);
  
  // Add a useEffect to clear success message after 5 seconds
  useEffect(() => {
    if (roleChangeSuccess) {
      const timer = setTimeout(() => {
        setRoleChangeSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [roleChangeSuccess]);
  
  // Function to publish a ban event to Nostr relays
  const publishBanEvent = async (pubkey: string, isBanned: boolean): Promise<boolean> => {
    try {
      console.log(`Publishing ${isBanned ? 'ban' : 'unban'} event for ${pubkey}`, {
        hasPrivateKey: !!currentUser?.privateKey,
        hasEncryptedKey: !!currentUser?.encryptedPrivateKey,
        hasExtension: typeof window !== 'undefined' && !!window.nostr
      });
      
      if (!currentTopic) {
        console.error('Cannot publish ban event: No current topic');
        return false;
      }
      
      // Check if we have a signing method available before proceeding
      if (!currentUser?.privateKey && !currentUser?.encryptedPrivateKey &&
          !(typeof window !== 'undefined' && window.nostr)) {
        console.error('No signing method available for ban event');
        setError('No signing method available. Please log in with a private key or use a Nostr extension.');
        return false;
      }
      
      // Create an event for banning/unbanning with enhanced tags for better indexing
      const banEvent: UnsignedEvent = {
        kind: TOPIC_SUBSCRIPTION_KIND, // Use the same kind as subscriptions
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', topicId], // Topic ID
          ['p', pubkey], // Member's public key
          ['a', isBanned ? 'ban' : 'unban'], // Action: ban or unban
          ['client', 'xeadline'],
          ['t', 'moderation'], // Add a tag to help with indexing
          ['d', `${isBanned ? 'ban' : 'unban'}-${Date.now().toString(36)}`] // Unique identifier for this event
        ],
        content: JSON.stringify({
          action: isBanned ? 'ban' : 'unban',
          targetPubkey: pubkey,
          topicId: topicId,
          timestamp: Math.floor(Date.now() / 1000)
        }),
        pubkey: currentUser?.publicKey || ''
      };
      
      console.log('Created ban event (unsigned):', banEvent);
      
      // If we have an encrypted private key, show the password modal immediately
      if (!currentUser?.privateKey && currentUser?.encryptedPrivateKey) {
        console.log('Encrypted private key detected, showing password modal');
        setPendingRoleChange({ pubkey, newRole: isBanned ? 'banned' : 'member' });
        setShowPasswordModal(true);
        return false;
      }
      
      // Try to sign the event with the private key if available
      if (currentUser?.privateKey) {
        console.log('Signing ban event with private key');
        const signingResult = await signEvent(banEvent, {
          privateKey: currentUser.privateKey,
          timeout: 15000,
          retryCount: 3 // Increase retry count for more reliability
        });
        
        if (signingResult.success && signingResult.event) {
          console.log('Successfully signed ban event with private key');
          const signedEvent = signingResult.event;
          
          // Publish the event to relays
          const publishedTo = await nostrService.publishEvent(signedEvent);
          console.log(`Published ban event to ${publishedTo.length} relays`);
          
          // Verify the ban event was published to at least one relay
          if (publishedTo.length === 0) {
            console.error('Failed to publish ban event to any relays. Retrying with increased timeout...');
            
            // Retry publishing the ban event with even longer timeout
            let retrySuccess = false;
            for (let i = 0; i < 5; i++) { // Increase to 5 retries
              console.log(`Retry attempt ${i + 1} to publish ban event...`);
              const retryPublishedTo = await nostrService.publishEvent(signedEvent);
              
              if (retryPublishedTo.length > 0) {
                console.log(`Successfully published ban event on retry ${i + 1} to ${retryPublishedTo.length} relays`);
                retrySuccess = true;
                break;
              }
              
              // Wait a bit longer before retrying
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
            }
            
            return retrySuccess;
          }
          
          return true;
        } else {
          console.error('Failed to sign ban event with private key:', signingResult.error);
        }
      }
      
      // Try to use the extension as a fallback
      if (typeof window !== 'undefined' && window.nostr) {
        try {
          console.log('Attempting to sign ban event with extension');
          
          // Get the public key from the extension
          const extensionPubkey = await window.nostr.getPublicKey();
          console.log('Got public key from extension:', extensionPubkey);
          
          // Create a new event for the extension
          const eventForExtension = {
            ...banEvent,
            pubkey: extensionPubkey
          };
          
          // Sign with the extension
          console.log('Sending event to extension for signing');
          const signedEvent = await window.nostr.signEvent(eventForExtension);
          console.log('Event signed by extension:', !!signedEvent.sig);
          
          // Publish the event
          const publishedTo = await nostrService.publishEvent(signedEvent);
          console.log(`Published ban event to ${publishedTo.length} relays`);
          
          // Verify the ban event was published to at least one relay
          if (publishedTo.length === 0) {
            console.error('Failed to publish ban event to any relays using extension. Retrying with increased timeout...');
            
            // Retry publishing the ban event with even longer timeout
            let retrySuccess = false;
            for (let i = 0; i < 5; i++) { // Increase to 5 retries
              console.log(`Retry attempt ${i + 1} to publish ban event with extension...`);
              const retryPublishedTo = await nostrService.publishEvent(signedEvent);
              
              if (retryPublishedTo.length > 0) {
                console.log(`Successfully published ban event on retry ${i + 1} to ${retryPublishedTo.length} relays`);
                retrySuccess = true;
                break;
              }
              
              // Wait a bit longer before retrying
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
            }
            
            return retrySuccess;
          }
          
          return true;
        } catch (extensionError) {
          console.error('Failed to use extension for ban event:', extensionError);
          setError(`Failed to sign with extension: ${extensionError instanceof Error ? extensionError.message : String(extensionError)}`);
          return false;
        }
      }
      
      console.error('All signing methods failed');
      setError('Failed to sign ban event. Please try again or use a different login method.');
      return false;
    } catch (error) {
      console.error('Error publishing ban event:', error);
      setError(`Error publishing ban event: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };
  
  const handleRoleChange = async (pubkey: string, newRole: MemberRole) => {
    try {
      console.log(`Changing role for ${pubkey} to ${newRole}`);
      
      // Check if this is a ban/unban action
      const isBanAction = newRole === 'banned';
      const isUnbanAction = members.find((m: Member) => m.pubkey === pubkey)?.role === 'banned' && newRole !== 'banned';
      // Enhanced debug logging for NIP-7 extension and authentication state
      console.log('DEBUG - Role change attempt:', {
        hasWindowObject: typeof window !== 'undefined',
        hasNostrObject: typeof window !== 'undefined' && !!window.nostr,
        nostrMethods: typeof window !== 'undefined' && window.nostr ? Object.keys(window.nostr) : [],
        currentUser: currentUser ? {
          hasPublicKey: !!currentUser.publicKey,
          hasPrivateKey: !!currentUser.privateKey,
          hasEncryptedKey: !!currentUser.encryptedPrivateKey
        } : 'No current user'
      });
      
      // Test if the extension can actually sign
      if (typeof window !== 'undefined' && window.nostr) {
        try {
          console.log('DEBUG - Testing NIP-7 extension signing capability...');
          const testEvent = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: 'Test signing',
            pubkey: currentUser?.publicKey || ''
          };
          
          // Just attempt to get the public key to check extension state
          window.nostr.getPublicKey()
            .then(pubkey => {
              console.log('DEBUG - NIP-7 extension returned public key:', pubkey);
              console.log('DEBUG - Extension appears to be working and unlocked');
              
              // Now test if it can actually sign
              if (window.nostr) {
                return window.nostr.signEvent(testEvent);
              }
              return Promise.reject(new Error('window.nostr became unavailable'));
            })
            .then(signedEvent => {
              console.log('DEBUG - Extension successfully signed test event:', !!signedEvent.sig);
            })
            .catch(err => {
              console.error('DEBUG - NIP-7 extension error:', err.message);
              console.error('DEBUG - Extension might be locked or permission denied');
            });
        } catch (err) {
          console.error('DEBUG - Error testing NIP-7 extension:', err);
        }
      }
      
      // Special handling for banned users
      const isBanning = newRole === 'banned';
      const roleDisplayName = isBanning ? 'Banned' : newRole.charAt(0).toUpperCase() + newRole.slice(1);
      
      // Handle ban/unban actions
      if (isBanAction || isUnbanAction) {
        console.log(`Processing ${isBanAction ? 'ban' : 'unban'} action for ${pubkey}`);
        const success = await publishBanEvent(pubkey, isBanAction);
        
        if (success) {
          console.log(`Successfully ${isBanAction ? 'banned' : 'unbanned'} user ${pubkey}`);
          setRoleChangeSuccess(`Successfully ${isBanAction ? 'banned' : 'unbanned'} user`);
          
          // Update the local state immediately for better UI feedback
          setMembers(prevMembers => {
            const updatedMembers = prevMembers.map(member =>
              member.pubkey === pubkey ? { ...member, role: isBanAction ? 'banned' as MemberRole : 'member' as MemberRole } : member
            );
            
            // Update the localStorage cache with the updated members
            try {
              const localStorageKey = `topic-members-${topicId}`;
              localStorage.setItem(localStorageKey, JSON.stringify(updatedMembers));
              console.log(`Updated ${updatedMembers.length} members in cache after ban/unban`);
            } catch (e) {
              console.error('Error updating members in cache:', e);
            }
            
            return updatedMembers;
          });
          
          // Import the updateSubscriptionStatus action to update Redux state
          const { updateSubscriptionStatus } = await import('../../redux/slices/topicSlice');
          
          // Update the subscription status in Redux if banning
          if (isBanAction) {
            dispatch(updateSubscriptionStatus({
              topicId,
              isSubscribed: false
            }));
            
            // Also update localStorage to reflect the change
            if (typeof window !== 'undefined') {
              try {
                const storedSubscriptions = JSON.parse(localStorage.getItem('topicSubscriptions') || '[]');
                const updatedSubscriptions = storedSubscriptions.filter((id: string) => id !== topicId);
                localStorage.setItem('topicSubscriptions', JSON.stringify(updatedSubscriptions));
                console.log('Updated localStorage to remove banned topic subscription');
              } catch (e) {
                console.error('Error updating localStorage subscriptions:', e);
              }
            }
          }
          
          // Trigger a refresh of the member list to ensure UI is up to date
          // Use a longer timeout to ensure the ban event has propagated to relays
          setTimeout(() => fetchMembers(), 2000);
        } else {
          console.error(`Failed to ${isBanAction ? 'ban' : 'unban'} user ${pubkey}`);
          setError(`Failed to ${isBanAction ? 'ban' : 'unban'} user. Please try again.`);
          return;
        }
      }
      
      // Update the local state first for immediate UI feedback
      setMembers(prevMembers => {
        const updatedMembers = prevMembers.map(member =>
          member.pubkey === pubkey ? { ...member, role: newRole } : member
        );
        
        // Update the localStorage cache with the updated members
        try {
          const localStorageKey = `topic-members-${topicId}`;
          localStorage.setItem(localStorageKey, JSON.stringify(updatedMembers));
          console.log(`Updated ${updatedMembers.length} members in cache after role change`);
        } catch (e) {
          console.error('Error updating members in cache:', e);
        }
        
        return updatedMembers;
      });
      
      if (!currentTopic) {
        console.error('Cannot update moderators: No current topic');
        setError('Cannot update moderators: No current topic');
        return;
      }
      
      // If the role is moderator or admin, we need to update the topic moderators list
      if ((newRole === 'moderator' || newRole === 'admin') && !currentTopic.moderators.includes(pubkey)) {
        // Create a new moderators array with the new moderator added
        const updatedModerators = [...currentTopic.moderators, pubkey];
        
        console.log('Updating topic moderators:', {
          currentModerators: currentTopic.moderators,
          newModerators: updatedModerators
        });
        
        // Try to update using the current user's private key if available
        if (currentUser?.privateKey) {
          try {
            await dispatch(updateTopicModerators({
              topicId: currentTopic.id,
              moderators: updatedModerators,
              privateKey: currentUser.privateKey
            })).unwrap();
            
            console.log(`Successfully added ${pubkey} as moderator`);
            setRoleChangeSuccess(`Successfully updated user role to ${roleDisplayName}`);
            // Trigger a refresh of the member list to ensure UI is up to date
            setTimeout(() => fetchMembers(), 1000);
          } catch (error) {
            console.error('Error updating topic moderators:', error);
            
            // If we have an encrypted private key, show the password modal
            if (currentUser.encryptedPrivateKey) {
              setPendingRoleChange({ pubkey, newRole });
              setShowPasswordModal(true);
            } else {
              setError('Failed to update topic moderators. Please try again.');
            }
          }
        } else if (currentUser?.encryptedPrivateKey) {
          // If we have an encrypted private key, show the password modal
          setPendingRoleChange({ pubkey, newRole });
          setShowPasswordModal(true);
        } else {
          // Try to use the extension directly as a last resort
          if (typeof window !== 'undefined' && window.nostr) {
            console.log('DEBUG - Attempting to use extension directly for moderator update');
            try {
              // Get the public key from the extension
              const extensionPubkey = await window.nostr.getPublicKey();
              console.log('DEBUG - Got public key from extension:', extensionPubkey);
              
              // Try to dispatch without a private key, letting the signEvent function use the extension
              await dispatch(updateTopicModerators({
                topicId: currentTopic.id,
                moderators: updatedModerators
                // No privateKey provided, forcing signEvent to use the extension
              })).unwrap();
              
              console.log(`Successfully added ${pubkey} as moderator using extension`);
              setRoleChangeSuccess(`Successfully updated user role to ${roleDisplayName}`);
              // Trigger a refresh of the member list to ensure UI is up to date
              setTimeout(() => fetchMembers(), 1000);
            } catch (extensionError) {
              console.error('DEBUG - Failed to use extension directly:', extensionError);
              // No private key available, but we can still show a more helpful message
              console.error('Cannot update moderators: No private key available');
              setError('To update moderators, you need to use a Nostr extension like nos2x or Alby, or log in with your private key. Please reload the page and try again with a different login method.');
            }
          } else {
            // No extension and no private key
            console.error('Cannot update moderators: No private key available and no extension');
            setError('To update moderators, you need to use a Nostr extension like nos2x or Alby, or log in with your private key. Please reload the page and try again with a different login method.');
          }
        }
      } else if (newRole !== 'moderator' && newRole !== 'admin' && currentTopic.moderators.includes(pubkey)) {
        // Remove from moderators if they were previously a moderator
        const updatedModerators = currentTopic.moderators.filter(mod => mod !== pubkey);
        
        console.log('Updating topic moderators:', {
          currentModerators: currentTopic.moderators,
          newModerators: updatedModerators
        });
        
        // Try to update using the current user's private key if available
        if (currentUser?.privateKey) {
          try {
            await dispatch(updateTopicModerators({
              topicId: currentTopic.id,
              moderators: updatedModerators,
              privateKey: currentUser.privateKey
            })).unwrap();
            
            console.log(`Successfully removed ${pubkey} from moderators`);
            setRoleChangeSuccess(`Successfully updated user role to ${roleDisplayName}`);
            // Trigger a refresh of the member list to ensure UI is up to date
            setTimeout(() => fetchMembers(), 1000);
          } catch (error) {
            console.error('Error updating topic moderators:', error);
            
            // If we have an encrypted private key, show the password modal
            if (currentUser.encryptedPrivateKey) {
              setPendingRoleChange({ pubkey, newRole });
              setShowPasswordModal(true);
            } else {
              setError('Failed to update topic moderators. Please try again.');
            }
          }
        } else if (currentUser?.encryptedPrivateKey) {
          // If we have an encrypted private key, show the password modal
          setPendingRoleChange({ pubkey, newRole });
          setShowPasswordModal(true);
        } else {
          // Try to use the extension directly as a last resort
          if (typeof window !== 'undefined' && window.nostr) {
            console.log('DEBUG - Attempting to use extension directly for moderator removal');
            try {
              // Get the public key from the extension
              const extensionPubkey = await window.nostr.getPublicKey();
              console.log('DEBUG - Got public key from extension:', extensionPubkey);
              
              // Try to dispatch without a private key, letting the signEvent function use the extension
              await dispatch(updateTopicModerators({
                topicId: currentTopic.id,
                moderators: updatedModerators
                // No privateKey provided, forcing signEvent to use the extension
              })).unwrap();
              
              console.log(`Successfully removed ${pubkey} from moderators using extension`);
              setRoleChangeSuccess(`Successfully updated user role to ${roleDisplayName}`);
              // Trigger a refresh of the member list to ensure UI is up to date
              setTimeout(() => fetchMembers(), 1000);
            } catch (extensionError) {
              console.error('DEBUG - Failed to use extension directly:', extensionError);
              // No private key available, but we can still show a more helpful message
              console.error('Cannot update moderators: No private key available');
              setError('To update moderators, you need to use a Nostr extension like nos2x or Alby, or log in with your private key. Please reload the page and try again with a different login method.');
            }
          } else {
            // No extension and no private key
            console.error('Cannot update moderators: No private key available and no extension');
            setError('To update moderators, you need to use a Nostr extension like nos2x or Alby, or log in with your private key. Please reload the page and try again with a different login method.');
          }
        }
      }
    } catch (err) {
      console.error('Error in handleRoleChange:', err);
      setError(typeof err === 'string' ? err : 'Failed to update member role');
    }
  };
  
  const handlePasswordSubmit = async () => {
    if (!currentUser || !password || !pendingRoleChange || !currentTopic) {
      setPasswordError('Missing required information');
      return;
    }
    
    try {
      setPasswordError(null);
      const privateKey = await retrievePrivateKey(password);
      
      if (!privateKey) {
        setPasswordError('Invalid password');
        return;
      }
      
      console.log('Successfully decrypted private key');
      
      const { pubkey, newRole } = pendingRoleChange;
      
      // Determine the updated moderators list
      let updatedModerators: string[];
      if ((newRole === 'moderator' || newRole === 'admin') && !currentTopic.moderators.includes(pubkey)) {
        updatedModerators = [...currentTopic.moderators, pubkey];
      } else if (newRole !== 'moderator' && newRole !== 'admin' && currentTopic.moderators.includes(pubkey)) {
        updatedModerators = currentTopic.moderators.filter(mod => mod !== pubkey);
      } else {
        // No change needed to moderators list
        setShowPasswordModal(false);
        setPendingRoleChange(null);
        return;
      }
      
      // Dispatch the updateTopicModerators action
      await dispatch(updateTopicModerators({
        topicId: currentTopic.id,
        moderators: updatedModerators,
        privateKey
      })).unwrap();
      
      console.log(`Successfully updated moderators list`);
      
      // Close the modal and reset state
      setShowPasswordModal(false);
      setPassword('');
      // Determine the role display name
      const isBanning = newRole === 'banned';
      const roleDisplayName = isBanning ? 'Banned' : newRole.charAt(0).toUpperCase() + newRole.slice(1);
      setRoleChangeSuccess(`Successfully updated user role to ${roleDisplayName}`);
      setPendingRoleChange(null);
      
      // Trigger a refresh of the member list to ensure UI is up to date
      setTimeout(() => fetchMembers(), 1000);
    } catch (error) {
      console.error('Error after password entry:', error);
      setPasswordError('Error processing request');
    }
  };
  
  // Filter members based on search query and role filter
  const filteredMembers = members.filter(member => {
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesSearch = searchQuery === '' || member.pubkey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Enter Password</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Your private key is encrypted. Please enter your password to decrypt it and update the moderator list.
            </p>
            
            {passwordError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
                <p className="text-red-700 dark:text-red-300 text-sm">{passwordError}</p>
              </div>
            )}
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPendingRoleChange(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        {roleChangeSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-6 flex items-center justify-between">
            <p className="text-green-700 dark:text-green-300">{roleChangeSuccess}</p>
            <button
              onClick={() => setRoleChangeSuccess(null)}
              className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentTopic?.name} - Members
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {members.length} members
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as MemberRole | 'all')}
              className="w-full md:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="member">Members</option>
              <option value="contributor">Contributors</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Admins</option>
              <option value="banned">Banned Users</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <MemberItem
                key={member.pubkey}
                member={member}
                isModerator={isModerator}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 text-center">
            <p className="text-gray-700 dark:text-gray-300">No members found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}