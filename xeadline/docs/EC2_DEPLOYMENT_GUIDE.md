# Xeadline EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the entire Xeadline application on an AWS EC2 t2.micro instance, including domain configuration, database setup, and NIP-05 implementation.

## Table of Contents

1. [AWS Account Setup](#1-aws-account-setup)
2. [EC2 Instance Setup](#2-ec2-instance-setup)
3. [Domain and Elastic IP Configuration](#3-domain-and-elastic-ip-configuration)
4. [Server Environment Setup](#4-server-environment-setup)
5. [Database Setup](#5-database-setup)
6. [Application Deployment](#6-application-deployment)
7. [Web Server Configuration](#7-web-server-configuration)
8. [SSL Certificate Setup](#8-ssl-certificate-setup)
9. [NIP-05 Implementation](#9-nip-05-implementation)
10. [Monitoring and Maintenance](#10-monitoring-and-maintenance)

## 1. AWS Account Setup

If you don't already have an AWS account:

1. Go to [aws.amazon.com](https://aws.amazon.com/) and click "Create an AWS Account"
2. Follow the signup process, providing your email, password, and payment information
3. Complete the identity verification process
4. Select the Basic Support plan (free)

## 2. EC2 Instance Setup

### Launch a t2.micro Instance

1. Log in to the AWS Management Console
2. Navigate to EC2 service
3. Click "Launch Instance"
4. Configure your instance:
   - **Name**: xeadline-server
   - **Application and OS Images**: Ubuntu Server 22.04 LTS
   - **Instance type**: t2.micro (Free tier eligible)
   - **Key pair**: Create a new key pair named "xeadline-key" and download the .pem file
   - **Network settings**: Allow SSH (port 22), HTTP (port 80), and HTTPS (port 443) traffic
   - **Configure storage**: 30 GB gp2 (General Purpose SSD)
5. Click "Launch instance"

### Connect to Your Instance

For macOS/Linux:
```bash
# Set permissions for your key file
chmod 400 path/to/xeadline-key.pem

# Connect via SSH
ssh -i path/to/xeadline-key.pem ubuntu@your-instance-public-ip
```

For Windows (using PuTTY):
1. Convert the .pem file to .ppk using PuTTYgen
2. Configure PuTTY with your instance's public IP and the .ppk file
3. Connect

## 3. Domain and Elastic IP Configuration

### Allocate an Elastic IP

1. In the EC2 Dashboard, navigate to "Elastic IPs" under "Network & Security"
2. Click "Allocate Elastic IP address"
3. Select "Amazon's pool of IPv4 addresses" and click "Allocate"
4. Select the newly allocated IP, click "Actions" → "Associate Elastic IP address"
5. Select your instance and click "Associate"
6. Note down the Elastic IP address

### Configure Your Domain

1. Log in to your domain registrar (e.g., Namecheap, GoDaddy, Route 53)
2. Navigate to the DNS settings for your domain (xeadline.com)
3. Add/update the following records:
   - **A Record**: @ → Your Elastic IP address
   - **A Record**: www → Your Elastic IP address
   - **A Record**: relay → Elastic IP address of your separate relay server
4. Save changes (DNS propagation may take up to 48 hours)

### Using Route 53 (Optional)

If you prefer to manage your domain through AWS:

1. Go to Route 53 in the AWS Console
2. Create a hosted zone for your domain
3. Add the necessary A records pointing to your Elastic IP
4. Update your domain's name servers at your registrar to use Route 53's name servers

## 4. Server Environment Setup

Connect to your instance and run the following commands:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 8.x.x or higher

# Install development tools
sudo apt install -y build-essential git

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Start Nginx and enable it to start on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL and enable it to start on boot
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 5. Database Setup

### Configure PostgreSQL

```bash
# Switch to postgres user
sudo -i -u postgres

# Create a database for Xeadline
createdb xeadline

# Create a database user
createuser --interactive
# Enter name of role to add: xeadlineuser
# Shall the new role be a superuser? (y/n): n
# Shall the new role be allowed to create databases? (y/n): y
# Shall the new role be allowed to create more new roles? (y/n): n

# Set a password for the user
psql
postgres=# ALTER USER xeadlineuser WITH PASSWORD 'your_secure_password';
postgres=# \q

# Exit postgres user shell
exit
```

### Create Database Schema

```bash
# Connect to the xeadline database
sudo -u postgres psql -d xeadline

# Create tables
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

# Exit PostgreSQL
\q
```

## 6. Application Deployment

### Application Deployment Options

You have two options for deploying the application:

#### Option 1: Create a Deployment User (Recommended for Production)

```bash
# Create a deployment user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Create directories and set permissions
sudo mkdir -p /home/deploy/apps
sudo chown deploy:deploy /home/deploy/apps

# Switch to the deploy user
su - deploy

# Navigate to apps directory
cd ~/apps

# Clone the repository
git clone https://github.com/yourusername/Xeadline.git
cd Xeadline/xeadline
```

#### Option 2: Deploy as Ubuntu User (Simpler for Development)

If you're getting a "Permission denied" error with Option 1, you can use this simpler approach:

```bash
# Create application directory in ubuntu's home
mkdir -p ~/apps
cd ~/apps

# Clone the repository
git clone https://github.com/yourusername/Xeadline.git
cd Xeadline/xeadline

# Install dependencies
npm install

# Create .env file
cat > .env.local << EOL
# Database connection
DATABASE_URL=postgresql://xeadlineuser:your_secure_password@localhost:5432/xeadline

# Application settings
NEXT_PUBLIC_SITE_URL=https://xeadline.com
NEXT_PUBLIC_API_URL=https://xeadline.com/api
NEXT_PUBLIC_RELAY_URL=wss://relay.xeadline.com  # Points to your separate relay server

# Note: We're using the non-www version as the canonical URL.
# The Nginx configuration will handle both www and non-www versions,
# redirecting www.xeadline.com to xeadline.com for consistency.

# Add any other environment variables your application needs
EOL

# Build the application
npm run build
```

### Configure PM2 for Process Management

```bash
# Create a PM2 ecosystem file
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [
    {
      name: 'xeadline',
      script: 'npm',
      args: 'start',
      // Use the correct path based on your deployment option
      // This should point to the xeadline application directory
      cwd: '${PWD}',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
EOL

# Start the application with PM2
pm2 start ecosystem.config.js

# Save the PM2 configuration to start on system boot
pm2 save

# Set up PM2 to start on system boot
pm2 startup

# This will output a command that you need to run with sudo
# Copy and paste the exact command that PM2 outputs
# It will look something like this:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

> **Important**: Make sure to copy and paste the exact command that PM2 outputs, not the example above, as the paths may be different on your system.

> **Note**: If you're using the deploy user (Option 1), make sure you're logged in as that user when running the PM2 commands. The startup command will be different and will reference the deploy user instead of ubuntu (e.g., `-u deploy --hp /home/deploy`).

## 7. Web Server Configuration

### Configure Nginx as a Reverse Proxy

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/xeadline

# Add the following configuration
```

Paste this configuration:

```nginx
# Redirect www to non-www (canonical URL)
server {
    listen 80;
    server_name www.xeadline.com;
    return 301 $scheme://xeadline.com$request_uri;
}

# Main server block for xeadline.com
server {
    listen 80;
    server_name xeadline.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Special configuration for the NIP-05 well-known endpoint
    location /.well-known/nostr.json {
        proxy_pass http://localhost:3000/.well-known/nostr.json;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Add caching for better performance
        add_header Cache-Control "public, max-age=300";
        expires 5m;
    }

    # Add additional location blocks for other endpoints as needed
}

# Note: The relay is hosted on a separate EC2 instance
# and has its own SSL certificate
```

Enable the configuration:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/xeadline /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# Test Nginx configuration
sudo nginx -t

# If the test is successful, reload Nginx
sudo systemctl reload nginx
```

## 8. SSL Certificate Setup

### Install Certbot and Obtain SSL Certificates

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates for your domains
sudo certbot --nginx -d xeadline.com -d www.xeadline.com

# Follow the prompts to complete the process
# Select option 2 to redirect all HTTP traffic to HTTPS
```

Certbot will automatically update your Nginx configuration to use SSL. It will maintain the www to non-www redirect while adding SSL support for both domains. It will also set up a cron job to renew the certificates before they expire.

> **Note**: After running Certbot, verify that the www to non-www redirect still works properly with HTTPS. If not, you may need to manually adjust the Nginx configuration to ensure proper redirection.

> **Important**: The relay subdomain (relay.xeadline.com) is hosted on a separate EC2 instance with its own SSL certificate, so it's not included in the Certbot command for this server.

## 9. NIP-05 Implementation

### Create the NIP-05 API Endpoint

Ensure your Next.js application has the necessary API routes for NIP-05:

1. Create the well-known endpoint at `pages/api/.well-known/nostr.json.js` or equivalent in your app directory structure:

```javascript
// File: pages/api/.well-known/nostr.json.js
import { Pool } from 'pg';

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

2. Create API endpoints for username management:

```javascript
// File: pages/api/nip05/check/[username].js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const { username } = req.query;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username parameter' });
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

```javascript
// File: pages/api/nip05/claim.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
  
  try {
    // Check if user exists
    let result = await pool.query('SELECT * FROM users WHERE pubkey = $1', [pubkey]);
    
    // If user doesn't exist, create them
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO users (pubkey) VALUES ($1)', [pubkey]);
    }
    
    // Try to insert the username
    try {
      await pool.query(
        'INSERT INTO nip05_usernames (username, pubkey) VALUES ($1, $2)',
        [username, pubkey]
      );
      
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
    console.error('Error claiming username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Update Your Frontend Components

Ensure your profile editing component includes the NIP-05 username selection UI as described in the NIP-05 implementation documents.

## 10. Monitoring and Maintenance

### Set Up Basic Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop

# Monitor system resources
htop

# Monitor Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor application logs
pm2 logs xeadline
```

### Set Up Automatic Updates

```bash
# Install unattended-upgrades for automatic security updates
sudo apt install -y unattended-upgrades apt-listchanges

# Configure unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Set Up Database Backups

```bash
# Create backups directory in your home directory
mkdir -p ~/backups

# Create a backup script
cat > ~/backup-db.sh << EOL
#!/bin/bash
BACKUP_DIR="\$HOME/backups"
TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="\$BACKUP_DIR/xeadline_\$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p \$BACKUP_DIR

# Perform backup
sudo -u postgres pg_dump xeadline > \$BACKUP_FILE

# Compress the backup
gzip \$BACKUP_FILE

# Keep only the last 7 backups
ls -t \$BACKUP_DIR/xeadline_*.sql.gz | tail -n +8 | xargs -r rm
EOL

# Make the script executable
chmod +x ~/backup-db.sh

# Set up a daily cron job for backups
(crontab -l 2>/dev/null; echo "0 2 * * * \$HOME/backup-db.sh") | crontab -
```

## Troubleshooting

### Common Issues and Solutions

1. **Application not starting**:
   - Check logs: `pm2 logs xeadline`
   - Verify environment variables: `cat ~/apps/Xeadline/xeadline/.env.local` (or `/home/deploy/apps/Xeadline/xeadline/.env.local` if using deploy user)
   - Check Node.js version: `node -v`

2. **Database connection issues**:
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database credentials: `sudo -u postgres psql -c "\l"`
   - Test connection: `sudo -u postgres psql -d xeadline -c "SELECT 1;"`

3. **Nginx/SSL issues**:
   - Check Nginx status: `sudo systemctl status nginx`
   - Verify configuration: `sudo nginx -t`
   - Check SSL certificates: `sudo certbot certificates`

4. **Domain not resolving**:
   - Verify DNS settings: `dig xeadline.com`
   - Check Elastic IP association in AWS console
   - Ensure DNS propagation has completed (can take up to 48 hours)

## Resource Management for t2.micro

The t2.micro instance has limited resources (1 vCPU, 1GB RAM). To optimize performance:

1. **Monitor CPU credits**: t2.micro instances use a CPU credit system. Monitor your credit balance in the AWS console.

2. **Optimize memory usage**:
   - Limit Node.js memory: Add `--max-old-space-size=512` to Node.js options
   - Configure PostgreSQL for low memory: Edit `/etc/postgresql/14/main/postgresql.conf`:
     ```
     shared_buffers = 128MB
     work_mem = 4MB
     maintenance_work_mem = 32MB
     ```

3. **Use swap space**:
   ```bash
   # Create a 2GB swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   
   # Make swap permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## Conclusion

You now have a complete Xeadline application running on an EC2 t2.micro instance with:
- Domain configuration with Elastic IP
- SSL certificates
- PostgreSQL database
- NIP-05 implementation
- Process management with PM2
- Basic monitoring and backups

This setup provides a cost-effective way to run your application while maintaining full control over the infrastructure. As your user base grows, you can easily upgrade to a larger instance type or migrate to a more distributed architecture.