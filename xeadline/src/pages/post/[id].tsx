'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import {
  fetchTopic,
  selectCurrentTopic,
  selectTopicLoading,
  selectTopicError,
  selectIsSubscribed,
  subscribeToTopic,
  unsubscribeFromTopic
} from '../../redux/slices/topicSlice'
import {
  fetchPostById,
  selectPostsLoading,
  selectPostsError
} from '../../redux/slices/postSlice'
import { selectCurrentUser } from '../../redux/slices/authSlice'
import { PostDetailLayout } from '../../components/post/PostDetailLayout'
import MainLayout from '../../components/layout/MainLayout'

export default function PostDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const dispatch = useAppDispatch()
  
  // Get the current user
  const currentUser = useAppSelector(selectCurrentUser)
  
  // Get the post from the store
  const posts = useAppSelector(state => state.post.byId)
  const post = id ? posts[id as string] : null
  
  // Get the topic from the store
  const topic = useAppSelector(selectCurrentTopic)
  const isTopicLoading = useAppSelector(selectTopicLoading)
  const topicError = useAppSelector(selectTopicError)
  
  // Get the post loading and error states
  const isPostsLoading = useAppSelector(selectPostsLoading)
  const postsError = useAppSelector(selectPostsError)
  
  // Check if the user is subscribed to the topic
  const isSubscribed = useAppSelector(state => post ? selectIsSubscribed(state, post.topicId) : false)
  
  // State for subscription loading
  const [isSubscribing, setIsSubscribing] = React.useState(false)
  
  // Fetch the post when the ID changes
  useEffect(() => {
    if (id) {
      dispatch(fetchPostById(id as string))
    }
  }, [dispatch, id])
  
  // Fetch the topic when the post is loaded
  useEffect(() => {
    if (post && post.topicId) {
      dispatch(fetchTopic(post.topicId))
    }
  }, [dispatch, post])
  
  // Handle subscribe to topic
  const handleSubscribe = async () => {
    if (!currentUser || !post) return
    
    setIsSubscribing(true)
    
    try {
      await dispatch(subscribeToTopic({
        topicId: post.topicId,
        privateKey: currentUser.privateKey
      })).unwrap()
    } catch (error) {
      console.error('Error subscribing to topic:', error)
    } finally {
      setIsSubscribing(false)
    }
  }
  
  // Handle unsubscribe from topic
  const handleUnsubscribe = async () => {
    if (!currentUser || !post) return
    
    setIsSubscribing(true)
    
    try {
      await dispatch(unsubscribeFromTopic({
        topicId: post.topicId,
        privateKey: currentUser.privateKey
      })).unwrap()
    } catch (error) {
      console.error('Error unsubscribing from topic:', error)
    } finally {
      setIsSubscribing(false)
    }
  }
  
  // Show loading state
  if (!id || isPostsLoading || isTopicLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
        </div>
      </MainLayout>
    )
  }
  
  // Show error state
  if (postsError || topicError) {
    return (
      <MainLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
          <p className="text-red-700 dark:text-red-300">{postsError || topicError}</p>
        </div>
      </MainLayout>
    )
  }
  
  // Show not found state
  if (!post || !topic) {
    return (
      <MainLayout>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 my-4 text-center">
          <p className="text-gray-700 dark:text-gray-300">Post not found.</p>
        </div>
      </MainLayout>
    )
  }
  
  return (
    <MainLayout>
      <PostDetailLayout
        post={post}
        topic={topic}
        isSubscribed={isSubscribed}
        onSubscribe={handleSubscribe}
        onUnsubscribe={handleUnsubscribe}
        isSubscribing={isSubscribing}
      />
    </MainLayout>
  )
}