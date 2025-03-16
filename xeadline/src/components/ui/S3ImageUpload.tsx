'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadFileToS3, BUCKET_NAME } from '../../lib/s3';

interface S3ImageUploadProps {
  imageType: 'icon' | 'banner';
  onImageUploaded: (url: string) => void;
  existingImageUrl?: string;
  topicId?: string;
}

export default function S3ImageUpload({ 
  imageType, 
  onImageUploaded, 
  existingImageUrl,
  topicId
}: S3ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    
    setError(null);
    setUploading(true);
    
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = topicId 
        ? `${topicId}/${imageType}/${fileName}`
        : `temp/${imageType}/${fileName}`;
      
      console.log(`S3 Upload: Starting upload to bucket: ${BUCKET_NAME}, path: ${filePath}`);
      
      // Upload to S3 using our helper function - now returns a public URL directly
      const publicUrl = await uploadFileToS3(file, filePath, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
      
      console.log('S3 Upload: Success, public URL:', publicUrl);
      
      // Set preview and notify parent
      setPreviewUrl(publicUrl);
      onImageUploaded(publicUrl);
      
    } catch (err) {
      console.error('Error uploading image to S3:', err);
      setError('Failed to upload image via S3. Please try again or use Supabase Storage instead.');
    } finally {
      setUploading(false);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {imageType === 'icon' ? 'Topic Icon' : 'Banner Image'} (S3)
        </label>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Preview */}
        <div className={`relative ${imageType === 'icon' ? 'w-16 h-16' : 'w-32 h-16'} bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex items-center justify-center`}>
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={`${imageType} preview`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        
        {/* Upload button */}
        <div>
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className="cursor-pointer bg-white dark:bg-gray-700 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
          >
            {uploading ? 'Uploading...' : 'Upload (S3)'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
      </div>
    </div>
  );
}