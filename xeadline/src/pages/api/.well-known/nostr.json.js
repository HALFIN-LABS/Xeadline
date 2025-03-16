import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Handle OPTIONS method for CORS preflight requests
  if (req.method === 'OPTIONS') {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(200).end();
  }
  
  const { name } = req.query;
  
  console.log('NIP-05 request received for name:', name);
  
  try {
    let query = supabase
      .from('nip05_usernames')
      .select('username, pubkey');
    
    if (name) {
      console.log('Querying for specific username:', name);
      query = query.eq('username', name);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    console.log('Query results:', data);
    
    // Standard NIP-05 response only includes names mapping
    const response = {
      names: {}
    };
    
    data.forEach(user => {
      console.log('Processing user:', user.username);
      response.names[user.username] = user.pubkey;
      
      // Just log the username being processed
      console.log(`Processing user: ${user.username}`);
    });
    
    console.log('Final response:', response);
    
    // Set cache headers - disable cache for testing
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching NIP-05 data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}