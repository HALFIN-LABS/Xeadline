import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// S3 client configuration using Supabase S3-compatible storage
export const s3Client = new S3Client({
  region: 'eu-west-2', // Region from Supabase storage settings
  endpoint: 'https://uayszqngxbhpmufaraad.supabase.co/storage/v1/s3',
  credentials: {
    accessKeyId: '2dfd1f78273c6c7b57270f85d50e9547',
    secretAccessKey: '14f6f5ff0b81a1c6c220ec1f10c3c1e01f570bd67d7682f4c7c151f8ed7999a4'
  },
  forcePathStyle: true // Required for S3-compatible storage
});

// Bucket name - must match the exact name in Supabase
export const BUCKET_NAME = 'topic-image';

// Helper function to upload a file to S3 and get a public URL
export async function uploadFileToS3(
  file: File, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`S3 Upload: Starting upload to ${BUCKET_NAME}/${path}`);
    
    // Create the upload command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: file,
      ContentType: file.type,
      ACL: 'public-read', // Make the object publicly readable
    });
    
    // Send the command to S3
    const response = await s3Client.send(command);
    console.log('S3 Upload: Success', response);
    
    // Construct the public URL for the Supabase bucket
    const publicUrl = `https://uayszqngxbhpmufaraad.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${path}`;
    
    return publicUrl;
  } catch (error) {
    console.error('S3 Upload: Error uploading file', error);
    throw error;
  }
}