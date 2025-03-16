import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topicId, description, rules, createdBy } = req.body;

    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    console.log('Saving topic content:', { topicId, description, rules });

    // Insert the topic content into the database
    const { data, error } = await supabase
      .from('topic_content')
      .insert([
        {
          topic_id: topicId,
          description,
          rules: Array.isArray(rules) ? rules : [],
          created_by: createdBy || null,
        },
      ]);

    if (error) {
      console.error('Error saving topic content:', error);
      return res.status(500).json({ error: 'Failed to save topic content', details: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in save-content API:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}