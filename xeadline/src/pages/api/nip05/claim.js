import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// List of reserved usernames
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'xeadline', 'support', 'help', 
  'mod', 'moderator', 'system', 'official'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { username, pubkey } = req.body;
  
  // Validate input
  if (!username || !pubkey) {
    return res.status(400).json({ error: 'Username and pubkey are required' });
  }
  
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }
  
  // Check for reserved usernames
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return res.status(403).json({ error: 'This username is reserved' });
  }
  
  try {
    // Start a transaction
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('pubkey', pubkey)
      .maybeSingle();
    
    if (userError) throw userError;
    
    // If user doesn't exist, create them
    if (!user) {
      const { error: insertUserError } = await supabase
        .from('users')
        .insert({ pubkey });
      
      if (insertUserError) throw insertUserError;
    }
    
    // Try to insert the username
    const { data, error: insertError } = await supabase
      .from('nip05_usernames')
      .insert({ username, pubkey })
      .select()
      .single();
    
    if (insertError) {
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'Username already taken' });
      }
      throw insertError;
    }
    
    return res.status(201).json({
      success: true,
      nip05: `${username}@xead.space`
    });
  } catch (error) {
    console.error('Error claiming username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}