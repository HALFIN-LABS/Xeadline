import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: 'Username parameter is required' });
  }
  
  try {
    // Query the database for the user
    const { data, error } = await supabase
      .from('nip05_usernames')
      .select('username, pubkey, verification_type')
      .eq('username', username);
    
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Check if we got any results
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        username,
        timestamp: new Date().toISOString()
      });
    }
    
    // Return HTML page with badge information
    const user = data[0];
    const badgeType = user.verification_type || 'standard';
    const badgeColor = badgeType === 'staff' ? 'green' : badgeType === 'contributor' ? 'amber' : 'blue';
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Badge Check for ${username}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .card {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 10px;
          }
          .badge.staff {
            background-color: #e6f7e6;
            color: #0d6832;
          }
          .badge.contributor {
            background-color: #fff8e6;
            color: #b45309;
          }
          .badge.standard {
            background-color: #e6f0ff;
            color: #1e40af;
          }
          .info {
            margin-top: 20px;
            font-size: 14px;
            color: #666;
          }
          .pubkey {
            font-family: monospace;
            background-color: #f0f0f0;
            padding: 4px;
            border-radius: 4px;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Badge Check for ${username}</h1>
          <p>
            <strong>Username:</strong> ${user.username}<br>
            <strong>Verification Type:</strong> 
            <span class="badge ${badgeType}">${badgeType}</span>
          </p>
          <p>
            <strong>Public Key:</strong><br>
            <span class="pubkey">${user.pubkey}</span>
          </p>
          <div class="info">
            <p>This page shows the current verification badge type for this user as stored in the database.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error in check-badge endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
}