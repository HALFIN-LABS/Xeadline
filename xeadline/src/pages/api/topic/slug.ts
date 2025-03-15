import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check if the table exists
  const { error: tableCheckError } = await supabase.from('topic_slugs').select('*').limit(1);
  
  if (tableCheckError) {
    console.error('Error accessing topic_slugs table:', tableCheckError);
    return res.status(500).json({
      error: 'The topic_slugs table does not exist. Please run the SQL migration script in xeadline/supabase/migrations/20250314_create_topic_slugs.sql in your Supabase SQL editor.'
    });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET: Retrieve a topic ID by slug
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug parameter is required' });
  }
  
  const { data, error } = await supabase
    .from('topic_slugs')
    .select('topic_id')
    .eq('slug', slug.toLowerCase())
    .single();
  
  if (error) {
    console.error('Error fetching topic slug:', error);
    return res.status(404).json({ error: 'Topic slug not found' });
  }
  
  return res.status(200).json({ topicId: data.topic_id });
}

// POST: Create a new slug mapping
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { slug, topicId } = req.body;
  
  if (!slug || !topicId) {
    return res.status(400).json({ error: 'Slug and topicId are required' });
  }
  
  // Check if slug already exists
  const { data: existingSlug } = await supabase
    .from('topic_slugs')
    .select('slug')
    .eq('slug', slug.toLowerCase())
    .single();
  
  if (existingSlug) {
    return res.status(409).json({ error: 'Slug already exists' });
  }
  
  // Insert new slug mapping
  const { data, error } = await supabase
    .from('topic_slugs')
    .insert([
      { 
        slug: slug.toLowerCase(), 
        topic_id: topicId,
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating topic slug:', error);
    return res.status(500).json({ error: 'Failed to create topic slug' });
  }
  
  return res.status(201).json(data);
}