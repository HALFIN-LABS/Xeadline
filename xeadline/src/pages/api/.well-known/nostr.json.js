import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  const { name } = req.query;
  
  try {
    let query = supabase
      .from('nip05_usernames')
      .select('username, pubkey');
    
    if (name) {
      query = query.eq('username', name);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const response = {
      names: {}
    };
    
    data.forEach(user => {
      response.names[user.username] = user.pubkey;
    });
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching NIP-05 data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}