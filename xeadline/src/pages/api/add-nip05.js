import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { username, pubkey } = req.body;
  
  console.log('Add NIP-05 request received:', { username, pubkey });
  
  // Validate required fields
  if (!username || !pubkey) {
    return res.status(400).json({ error: 'Username and pubkey are required' });
  }
  
  try {
    // Check if the username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('nip05_usernames')
      .select('username')
      .eq('username', username)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing user:', checkError);
      return res.status(500).json({ error: checkError.message });
    }
    
    if (existingUser) {
      // Update the existing user
      console.log('Updating existing user:', username);
      const { data, error } = await supabase
        .from('nip05_usernames')
        .update({ pubkey })
        .eq('username', username);
      
      if (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({
        message: 'User updated successfully',
        username,
        pubkey
      });
    } else {
      // Insert a new user
      console.log('Adding new user:', username);
      const { data, error } = await supabase
        .from('nip05_usernames')
        .insert([{
          username,
          pubkey
        }]);
      
      if (error) {
        console.error('Error adding user:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json({
        message: 'User added successfully',
        username,
        pubkey
      });
    }
  } catch (error) {
    console.error('Error in add-nip05 endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
}