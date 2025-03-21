'use client'

import React, { useState, useCallback } from 'react'
import { useAppDispatch } from '../../redux/hooks'
import { fetchPostsForTopic } from '../../redux/slices/postSlice'
import Modal from '../ui/Modal'
import { TopicPostCreationForm } from '../topic/TopicPostCreationForm'
import { Button } from '../ui/Button'

interface PostCreationModalProps {
  isOpen: boolean
  onClose: () => void
  topicId: string
  topicName: string
  topicRules: Array<{ title: string; description?: string }>
}

export const PostCreationModal: React.FC<PostCreationModalProps> = ({
  isOpen,
  onClose,
  topicId,
  topicName,
  topicRules
}) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formRef, setFormRef] = useState<any>(null);
  
  const handleSubmit = useCallback(() => {
    if (formRef && typeof formRef.submitForm === 'function') {
      formRef.submitForm();
      setIsSubmitting(true);
    }
  }, [formRef]);
  
  const handleFormRef = useCallback((ref: any) => {
    setFormRef(ref);
  }, []);
  
  const handlePostCreated = useCallback(() => {
    setIsSubmitting(false);
    // Refresh the posts list after a post is created
    dispatch(fetchPostsForTopic(topicId));
    onClose();
  }, [dispatch, topicId, onClose]);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create post in t/${topicName}`}
      footer={
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="text-gray-300 bg-black/30 border-gray-700/30 hover:bg-black/50 hover:text-white transition-colors backdrop-blur-sm px-6 py-2 rounded-full"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="bg-bottle-green hover:bg-bottle-green/90 transition-colors px-6 py-2 rounded-full"
          >
            Post
          </Button>
        </div>
      }
    >
      <div className="w-full text-gray-100">
        <div className="flex flex-col space-y-4">
          <div className="glassmorphic-content relative">
            {/* Glassmorphic glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg blur-xl opacity-30 pointer-events-none"></div>
            <TopicPostCreationForm
              topicId={topicId}
              topicName={topicName}
              topicRules={topicRules}
              onPostCreated={handlePostCreated}
              formRef={handleFormRef}
              hideButtons={true}
              darkMode={true}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}