import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  const { username, list } = req.query;
  
  console.log('Test verification request received for username:', username);
  console.log('List all entries:', list === 'true');
  
  try {
    // If list=true, list all entries in the table
    if (list === 'true') {
      const { data, error } = await supabase
        .from('nip05_usernames')
        .select('username, pubkey, verification_type');
      
      if (error) {
        console.error('Supabase query error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      console.log('All entries:', data);
      return res.status(200).json({
        entries: data,
        count: data.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // Query the database for the user
    const { data, error } = await supabase
      .from('nip05_usernames')
      .select('username, pubkey, verification_type')
      .eq('username', username || 't333btc');
    
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Query result:', data);
    
    // Check if we got any results
    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        username: username || 't333btc',
        timestamp: new Date().toISOString()
      });
    }
    
    // Return the user data
    return res.status(200).json({
      user: data[0] || null,
      username: data[0]?.username || 'not found',
      pubkey: data[0]?.pubkey || 'not found',
      verification_type: data[0]?.verification_type || 'not found',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-verification endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
}