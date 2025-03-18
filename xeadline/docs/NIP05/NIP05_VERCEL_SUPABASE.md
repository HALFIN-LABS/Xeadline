# NIP-05 Implementation with Vercel and Supabase

This guide outlines how to implement NIP-05 verification for Xeadline using Vercel for hosting and Supabase for the database and API endpoints.

## Overview

Instead of using a self-managed EC2 instance, we'll use:

1. **Vercel** - For hosting the Next.js application
2. **Supabase** - For the PostgreSQL database and API endpoints
3. **Custom Domain** - Configured with Vercel

This approach eliminates server management overhead and leverages platforms optimized for Next.js and PostgreSQL.

## Architecture

```
User → Vercel (Next.js app) ↔ Supabase (Database + Auth)
                ↓
        /.well-known/nostr.json
```

## Step 1: Set Up Supabase

### Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up/login
2. Create a new project
3. Note your project URL and API keys

### Set Up Database Tables

In the Supabase SQL Editor, create the necessary tables:

```sql
-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  pubkey VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create nip05_usernames table
CREATE TABLE nip05_usernames (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  pubkey VARCHAR(64) NOT NULL UNIQUE REFERENCES users(pubkey),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_nip05_usernames_pubkey ON nip05_usernames(pubkey);
CREATE INDEX idx_nip05_usernames_username ON nip05_usernames(username);
```

### Set Up Row-Level Security (Optional but Recommended)

```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nip05_usernames ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to users" 
  ON users FOR SELECT USING (true);

CREATE POLICY "Allow public read access to nip05_usernames" 
  ON nip05_usernames FOR SELECT USING (true);

-- Add more restrictive policies for INSERT, UPDATE, DELETE as needed
```

## Step 2: Create API Endpoints in Next.js

### 1. The Well-Known Endpoint

Create a file at `pages/api/.well-known/nostr.json.js`:

```javascript
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
```

### 2. Username Check Endpoint

Create a file at `pages/api/nip05/check/[username].js`:

```javascript
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
```

### 3. Username Claim Endpoint

Create a file at `pages/api/nip05/claim.js`:

```javascript
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
      nip05: `${username}@xeadline.com`
    });
  } catch (error) {
    console.error('Error claiming username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Step 3: Deploy to Vercel

### 1. Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 2. Configure Environment Variables

In your Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_SITE_URL=https://xeadline.com
NEXT_PUBLIC_API_URL=https://xeadline.com/api
NEXT_PUBLIC_RELAY_URL=wss://relay.xeadline.com
```

### 3. Deploy Your Project

Using Vercel CLI:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Step 4: Configure Custom Domain

1. In Vercel, go to your project settings → Domains
2. Add your custom domain (xeadline.com)
3. Configure DNS settings as instructed by Vercel
4. Vercel will automatically provision SSL certificates

## Step 5: Update Frontend Components

### Profile Edit Component

```jsx
import { useState, useEffect } from 'react';

// Add to your existing component
const [username, setUsername] = useState('');
const [usernameAvailable, setUsernameAvailable] = useState(false);
const [usernameChecking, setUsernameChecking] = useState(false);
const [usernameError, setUsernameError] = useState('');

const checkUsernameAvailability = async (value) => {
  if (!value || value.length < 3) {
    setUsernameAvailable(false);
    setUsernameError('Username must be at least 3 characters');
    return;
  }
  
  if (!/^[a-z0-9_]{3,30}$/.test(value)) {
    setUsernameAvailable(false);
    setUsernameError('Username can only contain letters, numbers, and underscores');
    return;
  }
  
  setUsernameChecking(true);
  try {
    const response = await fetch(`/api/nip05/check/${value}`);
    const data = await response.json();
    setUsernameAvailable(data.available);
    if (!data.available) {
      setUsernameError('Username already taken');
    } else {
      setUsernameError('');
    }
  } catch (error) {
    console.error('Error checking username:', error);
    setUsernameError('Error checking username availability');
  } finally {
    setUsernameChecking(false);
  }
};

// In your JSX
<div className="mb-4">
  <label className="block text-sm font-medium mb-1">
    NIP-05 Identifier
  </label>
  <div className="flex items-center">
    <input
      type="text"
      value={username}
      onChange={(e) => {
        const value = e.target.value.toLowerCase();
        setUsername(value);
        checkUsernameAvailability(value);
      }}
      className="mr-2 p-2 border rounded"
      placeholder="username"
    />
    <span>@xeadline.com</span>
  </div>
  {usernameChecking && (
    <p className="text-sm mt-1 text-gray-500">Checking availability...</p>
  )}
  {username && !usernameChecking && (
    <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-500' : 'text-red-500'}`}>
      {usernameAvailable 
        ? 'Username available!' 
        : usernameError || 'Username unavailable'}
    </p>
  )}
</div>

// Add to your form submission handler
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ... your existing form validation
  
  if (username && usernameAvailable) {
    try {
      const response = await fetch('/api/nip05/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          pubkey: currentUser.pubkey,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim username');
      }
      
      // Update user profile with NIP-05 identifier
      // ... your code to update the profile
      
    } catch (error) {
      console.error('Error claiming username:', error);
      // Handle error
    }
  }
  
  // ... rest of your form submission logic
};
```

### Profile Display Component

```jsx
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

// Add to your component
const [nip05Verified, setNip05Verified] = useState(false);
const [nip05Username, setNip05Username] = useState('');

useEffect(() => {
  if (profile?.nip05) {
    // Extract username from nip05 identifier
    const parts = profile.nip05.split('@');
    if (parts.length === 2 && parts[1] === 'xeadline.com') {
      setNip05Username(parts[0]);
      setNip05Verified(true);
    }
  }
}, [profile]);

// Add to your JSX
{nip05Verified && (
  <div className="flex items-center mt-1">
    <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-1" />
    <span className="text-sm text-gray-600">
      {nip05Username}@xeadline.com
    </span>
  </div>
)}
```

## Benefits of This Approach

1. **Scalability**: Vercel and Supabase automatically scale with traffic
2. **Simplified Deployment**: No server management required
3. **Cost-Effective**: Free tiers available for both Vercel and Supabase
4. **Performance**: Global CDN for your frontend
5. **Security**: Managed SSL certificates and database security

## Testing

1. Deploy your application to Vercel
2. Test the NIP-05 endpoints:
   - `https://xeadline.com/.well-known/nostr.json`
   - `https://xeadline.com/api/nip05/check/testuser`
3. Test the username claiming functionality through your UI
4. Verify with external Nostr clients

## Limitations and Considerations

1. **API Rate Limits**: Be aware of Supabase's free tier limitations
2. **Cold Starts**: Serverless functions may have cold starts
3. **Database Connections**: Manage connection pooling appropriately
4. **Costs**: Monitor usage to avoid unexpected charges

This approach provides a more maintainable and scalable solution than self-hosting on an EC2 instance, especially for a Next.js application.