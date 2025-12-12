# AgencyFlow - Cloudways Hybrid VPS Deployment Guide

This guide provides step-by-step instructions for deploying the AgencyFlow application on Cloudways managed hosting platform.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Prerequisites](#prerequisites)
3. [Cloudways Server Setup](#cloudways-server-setup)
4. [Database Configuration](#database-configuration)
5. [Application Deployment](#application-deployment)
6. [PM2 Process Manager Setup](#pm2-process-manager-setup)
7. [Domain and SSL Configuration](#domain-and-ssl-configuration)
8. [Environment Variables](#environment-variables)
9. [Troubleshooting](#troubleshooting)

---

## Application Overview

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 with TypeScript, Vite, TailwindCSS, Shadcn/UI |
| Backend | Express.js 5, Node.js |
| Database | PostgreSQL (external) |
| ORM | Drizzle ORM |
| Authentication | JWT-based authentication |
| Email | Nodemailer (SMTP) |

### Key Files Structure

```
agencyflow/
├── server/
│   ├── index.ts          # Express server entry point
│   ├── routes.ts         # API routes
│   ├── auth.ts           # JWT authentication
│   ├── storage.ts        # Database operations
│   ├── db.ts             # Database connection
│   ├── email.ts          # Email notifications
│   └── vite.ts           # Static file serving (production)
├── shared/
│   └── schema.ts         # Database schema (Drizzle ORM)
├── src/                  # React frontend source
├── dist/                 # Production build output
├── package.json
├── vite.config.ts
└── drizzle.config.ts
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build frontend for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push database schema changes |
| `npm run db:migrate` | Run database migrations |

---

## Prerequisites

Before starting deployment, ensure you have:

1. **Cloudways Account** - Sign up at [platform.cloudways.com](https://platform.cloudways.com)
2. **External PostgreSQL Database** - A PostgreSQL database accessible from the internet (e.g., Neon, Supabase, AWS RDS, DigitalOcean Managed Database)
3. **Domain Name** (optional) - For custom domain setup
4. **SMTP Credentials** (optional) - For email notifications

---

## Cloudways Server Setup

### Step 1: Create a PHP Application

Since Cloudways doesn't natively support Node.js, you need to create a PHP application as a workaround:

1. Log in to [Cloudways Platform](https://platform.cloudways.com)
2. Click **Servers** → **Add Server**
3. Choose your cloud provider (DigitalOcean, AWS, Google Cloud, Vultr, or Linode)
4. Select **PHP Stack** (any version)
5. Configure server specifications:
   - **Recommended Minimum**: 2GB RAM, 1 vCPU
   - **For Production**: 4GB RAM, 2 vCPU
6. Name your application (e.g., "agencyflow")
7. Click **Launch Now**

### Step 2: Enable mod_proxy

**Important**: This step is required for Node.js apps to work on Cloudways.

1. Contact Cloudways Support via:
   - Live Chat: Click "Need a Hand" → "Send us a Message"
   - Support Ticket: [Create a ticket](https://support.cloudways.com/en/articles/5119857-how-to-create-a-support-ticket)
2. Request: "Please enable mod_proxy on my server for Node.js application"
3. Wait for confirmation (usually within 24 hours)

### Step 3: Access Server Credentials

1. Go to **Servers** → Select your server
2. Click **Master Credentials** under Server Management
3. Note down:
   - **Public IP**
   - **Username** (master)
   - **Password**
   - **SSH Port**

---

## Database Configuration

### Option A: Use External PostgreSQL (Recommended)

AgencyFlow is designed to work with an external PostgreSQL database. You can use services like:

- **Neon** (neon.tech) - Serverless PostgreSQL
- **Supabase** (supabase.com) - PostgreSQL with extras
- **AWS RDS** - Managed PostgreSQL
- **DigitalOcean Managed Databases**

Get your connection string in this format:
```
postgresql://username:password@host:port/database?sslmode=require
```

### Option B: Use Cloudways MySQL (Not Recommended)

Cloudways provides MySQL by default, but AgencyFlow uses PostgreSQL. If you must use MySQL, significant code changes would be required.

---

## Application Deployment

### Step 1: Connect via SSH

Using your terminal or an SSH client:

```bash
ssh master@YOUR_SERVER_IP -p YOUR_SSH_PORT
```

Or use the built-in SSH Terminal in Cloudways:
1. Go to **Servers** → Select server
2. Click **Launch SSH Terminal** under Server Management

### Step 2: Navigate to Application Directory

```bash
cd /home/master/applications/YOUR_APP_NAME/public_html
```

Replace `YOUR_APP_NAME` with your application's database name (found in Application Settings).

### Step 3: Remove Default Files

```bash
rm -f index.php
```

### Step 4: Upload Application Files

**Option A: Using Git (Recommended)**

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/agencyflow.git .

# Or if repository is private
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/agencyflow.git .
```

**Option B: Using SFTP**

Use an SFTP client like FileZilla or Cyberduck:
- Host: Your server IP
- Username: master
- Password: Your master password
- Port: Your SSH port
- Upload all project files to `/home/master/applications/YOUR_APP_NAME/public_html`

### Step 5: Install Node.js via NVM

Cloudways servers have Node.js pre-installed, but you may need a specific version:

```bash
# Check current Node.js version
node -v

# If you need a different version, use NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 20 (recommended for this project)
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node -v
npm -v
```

### Step 6: Install Dependencies

```bash
cd /home/master/applications/YOUR_APP_NAME/public_html

# Install all dependencies
npm install

# Build the frontend for production
npm run build
```

### Step 7: Configure .htaccess

Create or edit the `.htaccess` file in `public_html`:

```bash
nano .htaccess
```

Add the following content:

```apache
DirectoryIndex disabled

# Redirect all traffic to Node.js application on port 5000
RewriteEngine On
RewriteBase /

# Proxy all requests to Node.js
RewriteRule ^(.*)$ http://127.0.0.1:5000/$1 [P,L]
```

Save and exit (Ctrl+X, Y, Enter).

**Note**: The application runs on port 5000 as configured in `server/index.ts`.

### Step 8: Run Database Migrations

Before starting the application, push the database schema:

```bash
# Set your database URL
export EXTERNAL_DATABASE_URL="your_postgresql_connection_string"

# Push schema to database
npm run db:push
```

---

## PM2 Process Manager Setup

PM2 keeps your Node.js application running continuously, even after SSH disconnection.

### Step 1: Configure NPM Path for PM2

```bash
cd ~ && echo "export PATH='\$PATH:/home/master/bin/npm'" >> .bash_aliases
cd ~ && echo "export NODE_PATH='\$NODE_PATH:/home/master/bin/npm/lib/node_modules'" >> .bash_aliases
npm config set prefix "/home/master/bin/npm/lib/node_modules"
cd ~ && echo "alias pm2='/home/master/bin/npm/lib/node_modules/bin/pm2'" >> .bash_aliases

# Reload aliases
source ~/.bash_aliases
```

### Step 2: Install PM2

```bash
npm install pm2@latest -g
```

### Step 3: Create PM2 Ecosystem File

Create an ecosystem file for PM2 configuration:

```bash
cd /home/master/applications/YOUR_APP_NAME/public_html
nano ecosystem.config.cjs
```

Add the following content:

```javascript
module.exports = {
  apps: [{
    name: 'agencyflow',
    script: 'server/index.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    cwd: '/home/master/applications/YOUR_APP_NAME/public_html',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      EXTERNAL_DATABASE_URL: 'your_postgresql_connection_string',
      JWT_SECRET: 'your_secure_jwt_secret_here'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Step 4: Create Logs Directory

```bash
mkdir -p logs
```

### Step 5: Start Application with PM2

```bash
pm2 start ecosystem.config.cjs

# Save PM2 process list
pm2 save

# Configure PM2 to start on server reboot
pm2 startup

# Copy and run the command PM2 outputs
```

### PM2 Useful Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Check running processes |
| `pm2 logs agencyflow` | View application logs |
| `pm2 restart agencyflow` | Restart application |
| `pm2 stop agencyflow` | Stop application |
| `pm2 delete agencyflow` | Remove from PM2 |
| `pm2 monit` | Real-time monitoring dashboard |

---

## Domain and SSL Configuration

### Step 1: Add Custom Domain

1. In Cloudways, go to **Applications** → Select your app
2. Click **Domain Management**
3. Add your domain (e.g., `app.yourdomain.com`)
4. Click **Add Domain**

### Step 2: Configure DNS

At your domain registrar, create an A record:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | app (or @) | Your Cloudways Server IP | 3600 |

### Step 3: Install SSL Certificate

1. In Cloudways, go to **Applications** → Select your app
2. Click **SSL Certificate**
3. Select **Let's Encrypt**
4. Enter your email address
5. Select your domain
6. Click **Install Certificate**
7. Enable **Auto Renewal**

---

## Environment Variables

### Required Environment Variables

Create a `.env` file or set these in your `ecosystem.config.cjs`:

| Variable | Description | Required |
|----------|-------------|----------|
| `EXTERNAL_DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing (use a strong random string) | Yes |
| `NODE_ENV` | Set to `production` | Yes |
| `PORT` | Application port (default: 5000) | No |

### Optional Environment Variables (Email)

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 465) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |

### Setting Environment Variables

**Method 1: In ecosystem.config.cjs (Recommended)**

Already configured in the PM2 ecosystem file above.

**Method 2: System Environment**

```bash
# Add to ~/.bashrc
echo 'export EXTERNAL_DATABASE_URL="your_connection_string"' >> ~/.bashrc
echo 'export JWT_SECRET="your_jwt_secret"' >> ~/.bashrc
source ~/.bashrc
```

---

## Server Settings (Cloudways Dashboard)

Cloudways doesn't provide root access, but you can adjust settings via the dashboard:

1. Go to **Servers** → Select server
2. Click **Settings & Packages**

### Recommended Settings

| Setting | Recommended Value |
|---------|-------------------|
| Execution Limit | 300 seconds |
| Upload Size | 100 MB |
| Memory Limit | 512 MB (1GB RAM) or 1024 MB (2GB+ RAM) |

---

## Troubleshooting

### Issue: Application Not Loading (502/503 Error)

**Cause**: mod_proxy not enabled or Node.js not running

**Solutions**:
1. Verify mod_proxy is enabled (contact Cloudways support)
2. Check if PM2 is running: `pm2 status`
3. Check application logs: `pm2 logs agencyflow`
4. Verify .htaccess configuration

### Issue: Database Connection Failed

**Solutions**:
1. Verify `EXTERNAL_DATABASE_URL` is correct
2. Ensure database allows connections from Cloudways server IP
3. Check database credentials
4. Test connection: `npm run db:push`

### Issue: Application Stops After SSH Disconnect

**Cause**: Not using PM2

**Solution**: Start the app with PM2 as described above

### Issue: Permission Denied Errors

**Solutions**:
1. Reset file permissions via Cloudways dashboard:
   - **Applications** → Select app → **Application Settings** → **Reset File Permissions**
2. Ensure files are owned by master user

### Issue: Build Failures

**Solutions**:
1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check Node.js version compatibility

### Checking Logs

```bash
# PM2 logs
pm2 logs agencyflow

# Error logs
pm2 logs agencyflow --err

# Apache error logs (if mod_proxy issues)
tail -f /var/log/apache2/error.log
```

---

## Deployment Checklist

Before going live, verify:

- [ ] Server created on Cloudways
- [ ] mod_proxy enabled (contact support)
- [ ] Application files uploaded
- [ ] Dependencies installed (`npm install`)
- [ ] Frontend built (`npm run build`)
- [ ] `.htaccess` configured correctly
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Environment variables set
- [ ] PM2 running and configured for startup
- [ ] Custom domain added (optional)
- [ ] SSL certificate installed (optional)
- [ ] Application accessible via browser
- [ ] Login/registration working
- [ ] All features tested

---

## Updating the Application

To deploy updates:

```bash
cd /home/master/applications/YOUR_APP_NAME/public_html

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Run migrations if schema changed
npm run db:push

# Restart application
pm2 restart agencyflow
```

---

## Quick Reference

### SSH Connection
```bash
ssh master@SERVER_IP -p SSH_PORT
```

### Application Directory
```
/home/master/applications/YOUR_APP_NAME/public_html
```

### Start/Stop Application
```bash
pm2 start ecosystem.config.cjs
pm2 stop agencyflow
pm2 restart agencyflow
```

### View Logs
```bash
pm2 logs agencyflow
```

### Support Resources

- **Cloudways Documentation**: [support.cloudways.com](https://support.cloudways.com)
- **Cloudways 24/7 Support**: Live chat available in dashboard
- **PM2 Documentation**: [pm2.keymetrics.io/docs](https://pm2.keymetrics.io/docs)

---

*Last Updated: December 2024*
