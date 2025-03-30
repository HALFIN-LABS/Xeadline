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

// Define member roles
export type MemberRole = 'member' | 'contributor' | 'moderator' | 'admin';

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
          member.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          member.role === 'moderator' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          member.role === 'contributor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
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
      const filters: Filter[] = [
        {
          kinds: [TOPIC_SUBSCRIPTION_KIND],
          '#e': [topicId],
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
      let events = await Promise.race([
        nostrService.getEvents(filters),
        // If getEvents takes too long, use a longer timeout but don't fail completely
        new Promise<Event[]>(resolve =>
          setTimeout(() => {
            console.log('Using extended timeout for event fetching');
            nostrService.getEvents(filters).then(resolve);
          }, 10000)
        )
      ]);
      
      console.log(`Found ${events.length} subscription events for topic ${topicId}`);
      
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
      
      // Process events to get current subscribers
      const subscriptionMap = new Map<string, { subscribed: boolean, timestamp: number }>();
      
      // Enhanced logging for debugging subscription issues
      console.log('DEBUG - All event tags:', events.map(event => ({
        pubkey: event.pubkey.substring(0, 8),
        tags: event.tags,
        created_at: event.created_at
      })));
      
      events.forEach((event: Event) => {
        const pubkey = event.pubkey;
        const timestamp = event.created_at;
        
        // Check if this is a subscription or unsubscription event
        // Look for the 'a' tag with value 'subscribe' or 'unsubscribe'
        const actionTag = event.tags.find((tag: string[]) => tag[0] === 'a');
        const action = actionTag?.[1];
        
        // Default to treating events without an explicit action tag as subscriptions
        // This helps catch subscription events that might be missing the proper tag
        const subscribed = action ? action === 'subscribe' : true;
        
        // DEBUG: Log each event processing with more details
        console.log(`DEBUG - Processing event for pubkey ${pubkey.substring(0, 8)}...`, {
          pubkey,
          timestamp,
          action: action || 'MISSING_ACTION_TAG',
          subscribed,
          allTags: event.tags,
          hasExistingEntry: subscriptionMap.has(pubkey),
          existingTimestamp: subscriptionMap.has(pubkey) ? subscriptionMap.get(pubkey)!.timestamp : null,
          willUpdate: !subscriptionMap.has(pubkey) || subscriptionMap.get(pubkey)!.timestamp < timestamp,
          eventId: event.id
        });
        
        // Only update if this is a more recent event for this user
        if (!subscriptionMap.has(pubkey) || subscriptionMap.get(pubkey)!.timestamp < timestamp) {
          subscriptionMap.set(pubkey, { subscribed, timestamp });
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
              subscriptionMapSubscribed: subscriptionEntry.subscribed
            });
          }
        });
      }
      
      // DEBUG: Log the final subscription map
      console.log('DEBUG - Final subscription map:', Array.from(subscriptionMap.entries()).map(([key, value]) => ({
        pubkey: key,
        pubkeyShort: key.substring(0, 8),
        subscribed: value.subscribed,
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
      
      subscriptionMap.forEach(({ subscribed, timestamp }, pubkey) => {
        console.log(`DEBUG - Checking member: ${pubkey.substring(0, 8)}...`, {
          subscribed,
          timestamp,
          isModerator: currentTopic?.moderators.includes(pubkey)
        });
        
        if (subscribed) {
          // Skip if already added as a moderator
          if (!currentTopic?.moderators.includes(pubkey)) {
            console.log(`DEBUG - Adding regular member: ${pubkey.substring(0, 8)}...`);
            allMembers.push({
              pubkey,
              role: 'member' as MemberRole,
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
          const isSubscribeAction = !actionTag || actionTag[1] === 'subscribe';
          
          if (hasTopicTag && isSubscribeAction) {
            console.log(`DEBUG - Found missing member in events: ${pubkey.substring(0, 8)}...`);
            allMembers.push({
              pubkey,
              role: 'member' as MemberRole,
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
  
  const handleRoleChange = async (pubkey: string, newRole: MemberRole) => {
    try {
      console.log(`Changing role for ${pubkey} to ${newRole}`);
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
      
      // Update the local state first for immediate UI feedback
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.pubkey === pubkey ? { ...member, role: newRole } : member
        )
      );
      
      if (!currentTopic) {
        console.error('Cannot update moderators: No current topic');
        setError('Cannot update moderators: No current topic');
        return;
      }
      
      // If the role is moderator, we need to update the topic moderators list
      if (newRole === 'moderator' && !currentTopic.moderators.includes(pubkey)) {
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
      } else if (newRole !== 'moderator' && currentTopic.moderators.includes(pubkey)) {
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
      if (newRole === 'moderator' && !currentTopic.moderators.includes(pubkey)) {
        updatedModerators = [...currentTopic.moderators, pubkey];
      } else if (newRole !== 'moderator' && currentTopic.moderators.includes(pubkey)) {
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
      setPendingRoleChange(null);
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