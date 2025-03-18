# NIP-05 Local Development Guide

This guide explains how to implement the NIP-05 verification system locally and then deploy it to your EC2 instance.

## Local Development Workflow

Yes, you can (and should) develop the NIP-05 implementation files locally first, test them in your development environment, and then deploy them to your EC2 instance. This is the recommended workflow for any web application development.

## Directory Structure

Assuming you're using Next.js, your local project structure should include:

```
xeadline/
├── pages/
│   ├── api/
│   │   ├── .well-known/
│   │   │   └── nostr.json.js
│   │   └── nip05/
│   │       ├── check/
│   │       │   └── [username].js
│   │       └── claim.js
│   └── ... (other pages)
├── components/
│   └── ... (UI components including profile editor)
└── ... (other project files)
```

## Implementation Steps

### 1. Set Up Local Database for Testing

You can set up a local PostgreSQL database with the same schema:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  pubkey VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nip05_usernames (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  pubkey VARCHAR(64) NOT NULL UNIQUE REFERENCES users(pubkey),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nip05_usernames_pubkey ON nip05_usernames(pubkey);
CREATE INDEX idx_nip05_usernames_username ON nip05_usernames(username);
```

### 2. Create API Endpoints

#### The Well-Known Endpoint

Create `pages/api/.well-known/nostr.json.js`:

```javascript
import { Pool } from 'pg';

// Configure database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const { name } = req.query;
  
  try {
    let query = 'SELECT username, pubkey FROM nip05_usernames';
    let params = [];
    
    if (name) {
      query += ' WHERE username = $1';
      params.push(name);
    }
    
    const result = await pool.query(query, params);
    
    const response = {
      names: {}
    };
    
    result.rows.forEach(user => {
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

#### Username Check Endpoint

Create `pages/api/nip05/check/[username].js`:

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const { username } = req.query;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }
  
  // Validate username format
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ 
      available: false,
      error: 'Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores' 
    });
  }
  
  try {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM nip05_usernames WHERE username = $1)',
      [username]
    );
    
    return res.status(200).json({
      available: !result.rows[0].exists
    });
  } catch (error) {
    console.error('Error checking username availability:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### Username Claim Endpoint

Create `pages/api/nip05/claim.js`:

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// List of reserved usernames that cannot be claimed
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
  
  // Validate username format
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ 
      error: 'Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores' 
    });
  }
  
  // Check for reserved usernames
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return res.status(403).json({ error: 'This username is reserved' });
  }
  
  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user exists
      let result = await client.query('SELECT * FROM users WHERE pubkey = $1', [pubkey]);
      
      // If user doesn't exist, create them
      if (result.rows.length === 0) {
        await client.query('INSERT INTO users (pubkey) VALUES ($1)', [pubkey]);
      }
      
      // Try to insert the username
      try {
        await client.query(
          'INSERT INTO nip05_usernames (username, pubkey) VALUES ($1, $2)',
          [username, pubkey]
        );
        
        await client.query('COMMIT');
        
        return res.status(201).json({
          success: true,
          nip05: `${username}@xeadline.com`
        });
      } catch (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Username already taken' });
        }
        throw error;
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error claiming username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 3. Add UI Components

Add a username selection component to your profile editor:

```jsx
// In your profile edit component
import { useState, useEffect } from 'react';

// Add this to your existing component
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

// Add this to your JSX
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
  <p className="text-xs text-gray-500 mt-1">
    This will be your verified identifier on Nostr. Other clients will display this as {username || 'username'}@xeadline.com
  </p>
</div>

// Add this to your form submission handler
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

### 4. Update Profile Display

Update your profile display component to show the NIP-05 verification:

```jsx
// In your profile display component
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

// Add this to your component
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

// Add this to your JSX
{nip05Verified && (
  <div className="flex items-center mt-1">
    <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-1" />
    <span className="text-sm text-gray-600">
      {nip05Username}@xeadline.com
    </span>
  </div>
)}
```

## Testing Locally

1. Set up your local environment variables:
```
DATABASE_URL=postgresql://username:password@localhost:5432/xeadline
```

2. Run your Next.js development server:
```bash
npm run dev
```

3. Test the endpoints:
   - `http://localhost:3000/.well-known/nostr.json`
   - `http://localhost:3000/api/nip05/check/testuser`
   - Test the claim functionality through your UI

## Deployment to EC2

Once you've tested everything locally, you can deploy to your EC2 instance:

1. Push your changes to your Git repository
2. Pull the changes on your EC2 instance:
```bash
cd /home/deploy/apps/xeadline
git pull
```

3. Install dependencies and rebuild:
```bash
npm install
npm run build
```

4. Restart your application:
```bash
pm2 restart xeadline
```

5. Ensure your Nginx configuration properly routes the `/.well-known/nostr.json` path:
```nginx
location /.well-known/nostr.json {
    proxy_pass http://localhost:3000/.well-known/nostr.json;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Add caching for better performance
    add_header Cache-Control "public, max-age=300";
    expires 5m;
}
```

## Verifying the Implementation

After deployment, verify that everything is working:

1. Test the well-known endpoint: `https://xeadline.com/.well-known/nostr.json`
2. Try claiming a username through your UI
3. Verify with external Nostr clients that they can verify your NIP-05 identifiers

## Troubleshooting

If you encounter issues:

1. Check your application logs:
```bash
pm2 logs xeadline
```

2. Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

3. Verify database connectivity:
```bash
sudo -u postgres psql -d xeadline -c "SELECT COUNT(*) FROM nip05_usernames;"
```

4. Test the API endpoints directly:
```bash
curl https://xeadline.com/.well-known/nostr.json