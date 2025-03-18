'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { retrievePrivateKey } from '../../utils/nostrKeys';
import {
  fetchTopic,
  selectCurrentTopic,
  selectTopicLoading,
  selectTopicError,
  subscribeToTopic,
  unsubscribeFromTopic,
  selectIsSubscribed
} from '../../redux/slices/topicSlice';
import { fetchPostsForTopic, selectPostsByTopic, selectPostsLoading } from '../../redux/slices/postSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import Image from 'next/image';
import Link from 'next/link';
import TopicManagersButton from './TopicManagersButton';
import { Button } from '../ui/Button';
import { PostCreationModal } from '../post/PostCreationModal';
import { PostCard } from '../post/PostCard';
import Modal from '../ui/Modal';
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache';

// Moderator item component with NIP-05 verification
const ModeratorItem = ({ pubkey }: { pubkey: string }) => {
  const { username } = useUserProfileWithCache(pubkey);
  
  return (
    <div className="flex items-center p-2 bg-gray-800/30 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <Link
        href={`/profile/${pubkey}`}
        className="text-blue-400 hover:underline"
      >
        {username}
      </Link>
    </div>
  );
};

interface TopicDetailPageProps {
  topicId: string;
}

export default function TopicDetailPage({ topicId }: TopicDetailPageProps) {
  const dispatch = useAppDispatch();
  const topic = useAppSelector(selectCurrentTopic);
  const isLoading = useAppSelector(selectTopicLoading);
  const error = useAppSelector(selectTopicError);
  const currentUser = useAppSelector(selectCurrentUser);
  const isSubscribed = useAppSelector(state => selectIsSubscribed(state, topicId));
  const posts = useAppSelector(state => selectPostsByTopic(state, topicId));
  const isPostsLoading = useAppSelector(selectPostsLoading);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'subscribe' | 'unsubscribe' | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  
  useEffect(() => {
    dispatch(fetchTopic(topicId));
  }, [dispatch, topicId]);
  
  useEffect(() => {
    if (topic) {
      dispatch(fetchPostsForTopic(topicId));
    }
  }, [dispatch, topicId, topic]);
  
  const handlePasswordSubmit = useCallback(async () => {
    if (!currentUser || !password) return;
    
    try {
      setPasswordError(null);
      const privateKey = await retrievePrivateKey(password);
      
      if (!privateKey) {
        setPasswordError('Invalid password');
        return;
      }
      
      console.log('Successfully decrypted private key', {
        privateKeyLength: privateKey.length,
        privateKeyType: typeof privateKey
      });
      
      if (pendingAction === 'subscribe') {
        await dispatch(subscribeToTopic({
          topicId,
          privateKey
        })).unwrap();
        console.log('Successfully subscribed to topic after password entry');
      } else if (pendingAction === 'unsubscribe') {
        await dispatch(unsubscribeFromTopic({
          topicId,
          privateKey
        })).unwrap();
        console.log('Successfully unsubscribed from topic after password entry');
      }
      
      // Close the modal and reset state
      setShowPasswordModal(false);
      setPassword('');
      setPendingAction(null);
      setIsSubscribing(false);
    } catch (error) {
      console.error('Error after password entry:', error);
      setPasswordError('Error processing request');
      setIsSubscribing(false);
    }
  }, [currentUser, password, pendingAction, topicId, dispatch]);
  
  const handleSubscribe = async () => {
    if (currentUser) {
      setIsSubscribing(true);
      
      console.log('Subscribing to topic:', {
        topicId,
        hasPrivateKey: !!currentUser.privateKey,
        hasEncryptedPrivateKey: !!currentUser.encryptedPrivateKey,
        userPublicKey: currentUser.publicKey,
        privateKeyType: currentUser.privateKey ? typeof currentUser.privateKey : 'undefined',
        privateKeyLength: currentUser.privateKey ? currentUser.privateKey.length : 0
      });
      
      try {
        // Try to subscribe using the improved event signing service
        // This will try to use window.nostr first, then fall back to other methods
        await dispatch(subscribeToTopic({
          topicId,
          privateKey: currentUser.privateKey // This is optional now
        })).unwrap();
        
        console.log('Successfully subscribed to topic');
        setIsSubscribing(false);
      } catch (error) {
        console.error('Error subscribing to topic:', error);
        
        // If we have an encrypted private key, show the password modal
        if (currentUser.encryptedPrivateKey) {
          console.log('Subscription failed, but found encrypted key. Showing password prompt.');
          setPendingAction('subscribe');
          setShowPasswordModal(true);
          // Don't reset isSubscribing here, it will be reset after password entry
        } else {
          console.error('Cannot subscribe: No private key available and no extension detected');
          setIsSubscribing(false);
        }
      }
    } else {
      console.error('Cannot subscribe: No current user');
      setIsSubscribing(false);
    }
  };
  
  const handleUnsubscribe = async () => {
    if (currentUser) {
      setIsSubscribing(true);
      
      console.log('Unsubscribing from topic:', {
        topicId,
        hasPrivateKey: !!currentUser.privateKey,
        hasEncryptedPrivateKey: !!currentUser.encryptedPrivateKey,
        userPublicKey: currentUser.publicKey,
        privateKeyType: currentUser.privateKey ? typeof currentUser.privateKey : 'undefined',
        privateKeyLength: currentUser.privateKey ? currentUser.privateKey.length : 0
      });
      
      try {
        // Try to unsubscribe using the improved event signing service
        // This will try to use window.nostr first, then fall back to other methods
        await dispatch(unsubscribeFromTopic({
          topicId,
          privateKey: currentUser.privateKey // This is optional now
        })).unwrap();
        
        console.log('Successfully unsubscribed from topic');
        setIsSubscribing(false);
      } catch (error) {
        console.error('Error unsubscribing from topic:', error);
        
        // If we have an encrypted private key, show the password modal
        if (currentUser.encryptedPrivateKey) {
          console.log('Unsubscription failed, but found encrypted key. Showing password prompt.');
          setPendingAction('unsubscribe');
          setShowPasswordModal(true);
          // Don't reset isSubscribing here, it will be reset after password entry
        } else {
          console.error('Cannot unsubscribe: No private key available and no extension detected');
          setIsSubscribing(false);
        }
      }
    } else {
      console.error('Cannot unsubscribe: No current user');
      setIsSubscribing(false);
    }
  };
  
  if (isLoading && !topic) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }
  
  if (!topic) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 my-4 text-center">
        <p className="text-gray-700 dark:text-gray-300">Topic not found.</p>
        <Link href="/t/discover" className="mt-4 inline-block px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700 transition-colors">
          Discover Topics
        </Link>
      </div>
    );
  }
  
  // Generate a placeholder image if none is provided
  const imageUrl = topic.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(topic.name)}&background=random&size=128`;
  const bannerUrl = topic.banner || `https://ui-avatars.com/api/?name=${encodeURIComponent(topic.name)}&background=718096&color=FFFFFF&size=300&width=1200&height=300`;
  
  // Format member count
  const formattedMemberCount = topic.memberCount ? 
    topic.memberCount > 1000 ? `${(topic.memberCount / 1000).toFixed(1)}k` : topic.memberCount.toString() 
    : '0';
  
  // Get moderation type label
  const getModerationLabel = () => {
    switch (topic.moderationSettings.moderationType) {
      case 'pre-approval':
        return 'Pre-approval moderation';
      case 'post-publication':
        return 'Post-publication moderation';
      case 'hybrid':
        return 'Hybrid moderation';
      default:
        return 'Standard moderation';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Enter Password</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Your private key is encrypted. Please enter your password to decrypt it and {pendingAction === 'subscribe' ? 'subscribe to' : 'unsubscribe from'} this topic.
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
                  setPendingAction(null);
                  setIsSubscribing(false);
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
      <div className="max-w-2xl mx-auto bg-white dark:bg-[rgb(10,10,10)] rounded-lg shadow overflow-hidden">
        {/* Banner */}
        <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
          <Image
            src={bannerUrl}
            alt={`${topic.name} banner`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        
        {/* Topic Info */}
        <div className="px-6 py-4 relative">
          {/* Topic Image */}
          <div className="absolute -top-16 left-6 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-200 dark:bg-gray-700 w-32 h-32">
            <Image
              src={imageUrl}
              alt={`${topic.name} image`}
              width={128}
              height={128}
              className="object-cover"
            />
          </div>
          
          {/* Action Buttons */}
          {currentUser && (
            <div className="absolute top-4 right-4 flex space-x-2">
              {/* Post Button */}
              <Button
                variant="primary"
                onClick={() => setShowPostModal(true)}
                className="px-4 py-2 bg-bottle-green text-white hover:bg-bottle-green-700"
              >
                Post
              </Button>
              
              {/* Subscribe Button */}
              <button
                onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                className={`px-4 py-2 rounded-md font-medium ${
                  isSubscribed
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-bottle-green text-white hover:bg-bottle-green-700'
                }`}
              >
                {isSubscribing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isSubscribed ? 'Leaving...' : 'Joining...'}
                  </span>
                ) : (
                  isSubscribed ? 'Joined' : 'Join Topic'
                )}
              </button>
            </div>
          )}
          
          {/* Topic Details */}
          <div className="mt-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{topic.name}</h1>
            </div>
            
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{formattedMemberCount} members</span>
              </div>
              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Created {new Date(topic.createdAt * 1000).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{getModerationLabel()}</span>
              </div>
            </div>
            
            <div className="mt-4 mb-4 text-gray-700 dark:text-gray-300">
              {topic.description}
            </div>
            
            {/* Moderation and Rules buttons */}
            <div className="flex space-x-4 mt-2">
              <button
                onClick={() => setShowModerationModal(true)}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Management
              </button>
              
              <button
                onClick={() => setShowRulesModal(true)}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                Rules
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Post Creation Modal */}
      <PostCreationModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        topicId={topicId}
        topicName={topic.name}
        topicRules={topic.rules?.map(rule => ({ title: rule })) || [
          { title: "Be respectful to others", description: "Treat others as you would like to be treated" },
          { title: "No spam or self-promotion", description: "Don't post content solely to promote yourself or your business" },
          { title: "Stay on topic", description: "Posts should be relevant to this community" }
        ]}
      />
      
      {/* Moderation Modal */}
      <Modal
        isOpen={showModerationModal}
        onClose={() => setShowModerationModal(false)}
        title="Topic Moderators"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Moderators help maintain the quality of discussions and enforce community guidelines.
          </p>
          
          {topic.moderators && topic.moderators.length > 0 ? (
            <div className="space-y-3">
              {topic.moderators.map((moderator, index) => (
                <ModeratorItem key={index} pubkey={moderator} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic">No moderators assigned to this topic.</p>
          )}
          
          {/* Only show the manage button if the user is a moderator */}
          {currentUser && topic.moderators.includes(currentUser.publicKey) && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="text-lg font-medium text-white mb-2">Moderator Controls</h3>
              <p className="text-gray-300 mb-4">
                As a moderator, you have access to additional controls for this topic.
              </p>
              <TopicManagersButton />
            </div>
          )}
        </div>
      </Modal>
      
      {/* Rules Modal */}
      <Modal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        title="Topic Rules"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            These rules help maintain a positive and productive community. All members are expected to follow these guidelines.
          </p>
          
          {topic.rules && topic.rules.length > 0 ? (
            <div className="space-y-3 mt-4">
              {topic.rules.map((rule, index) => (
                <div key={index} className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-start">
                    <div className="bg-bottle-green text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white">{rule}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-800/30 rounded-lg text-gray-400 italic">
              No specific rules have been set for this topic. Please follow general community guidelines and be respectful to others.
            </div>
          )}
        </div>
      </Modal>
      
      {/* Posts section */}
      <div className="mt-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Posts</h2>
        </div>
        
        {/* Sticky filters at the top - similar to home page */}
        <div className="sticky top-14 z-10 bg-gray-50 dark:bg-[rgb(10,10,10)] py-4 border-b border-gray-800 mb-4">
          <div className="flex flex-wrap gap-2">
            <button className="tab tab-selected">
              New
            </button>
            <button className="tab tab-unselected">
              Hot
            </button>
            <button className="tab tab-unselected">
              Top
            </button>
            <button className="tab tab-unselected">
              Rising
            </button>
          </div>
        </div>
        
        {isPostsLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-bottle-green"></div>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6 pt-2">
            {posts.map((post, index, array) => (
              <div key={post.id}>
                <PostCard post={post} topicName={topic.name} />
                {index < array.length - 1 && (
                  <div className="h-[1px] bg-gray-300 dark:bg-gray-600 border-t border-gray-400 dark:border-gray-500 mt-6 mb-6 max-w-[45rem] mx-auto" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-[rgb(10,10,10)] rounded-md p-6 text-center">
            <p className="text-gray-700 dark:text-gray-300">
              No posts yet. Be the first to post in this topic!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}