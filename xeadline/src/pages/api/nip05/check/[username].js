import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  const { username } = req.query;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }
  
  try {
    const { data, error } = await supabase
      .from('nip05_usernames')
      .select('username')
      .eq('username', username)
      .maybeSingle();
    
    if (error) throw error;
    
    return res.status(200).json({
      available: !data
    });
  } catch (error) {
    console.error('Error checking username availability:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}