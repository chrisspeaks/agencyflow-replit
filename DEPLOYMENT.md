# AgencyFlow Deployment Guide

This guide covers deploying AgencyFlow to production using Docker and Dokploy.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [Dokploy Deployment](#dokploy-deployment)
6. [Email Configuration](#email-configuration)
7. [Health Checks](#health-checks)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- PostgreSQL 15+ (external database - you must create this before deployment)
- SMTP server credentials (for email notifications)

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database (Required - PostgreSQL connection string)
DATABASE_URL=postgresql://user:password@your-db-host:5432/agencyflow

# Authentication (Required)
SESSION_SECRET=your-secure-session-secret-min-32-chars
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Email (SMTP - Optional but recommended)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-smtp-password

# Migration Control (Optional)
# Set to "true" if you have already initialized the database with init-db.sql
SKIP_MIGRATIONS=true
```

### Environment Variable Descriptions

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secure random string (32+ chars) for session encryption |
| `JWT_SECRET` | Yes | Secure random string (32+ chars) for JWT token signing |
| `SMTP_HOST` | No | SMTP server hostname for email notifications |
| `SMTP_PORT` | No | SMTP port (465 for SSL, 587 for TLS) |
| `SMTP_USER` | No | SMTP username/email |
| `SMTP_PASSWORD` | No | SMTP password |
| `SKIP_MIGRATIONS` | No | Set to "true" to skip auto-migrations (use with pre-initialized DB) |

### Generating Secure Secrets

```bash
# Generate a secure random string for SESSION_SECRET and JWT_SECRET
openssl rand -base64 32
```

## Database Setup

AgencyFlow requires PostgreSQL 15 or higher. You must create and initialize the database **before** deploying the application.

### Step 1: Create PostgreSQL Database

Create a new PostgreSQL database for AgencyFlow:

```bash
# Connect to PostgreSQL as admin
psql -U postgres

# Create the database
CREATE DATABASE agencyflow;

# Create a user (optional, but recommended)
CREATE USER agencyflow_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE agencyflow TO agencyflow_user;

# Exit
\q
```

### Step 2: Initialize Database Schema

Run the initialization script to create all tables and the default admin user:

```bash
# Using psql command line
psql -h your-db-host -U agencyflow_user -d agencyflow -f scripts/init-db.sql

# Or using a connection string
psql "postgresql://agencyflow_user:your-password@your-db-host:5432/agencyflow" -f scripts/init-db.sql
```

### Default Admin User

After running `init-db.sql`, the following admin user is created:

- **Email**: `admin@website.com`
- **Password**: `Admin123`
- **IMPORTANT**: Change this password immediately after first login!

### Database Schema

The application uses the following main tables:

| Table | Description |
|-------|-------------|
| `users` | User authentication (email, password hash) |
| `profiles` | User profile information (name, role, avatar) |
| `user_roles` | Role assignments (admin, manager, staff) |
| `sessions` | JWT session management |
| `projects` | Project definitions (name, description, status) |
| `project_members` | Project team membership |
| `tasks` | Task definitions (title, status, priority, due date) |
| `task_assignees` | Task assignments (many-to-many) |
| `task_comments` | Comments on tasks |
| `task_logs` | Activity logs (status changes, assignments, comments) |
| `notifications` | User notifications |

### Database Backup

For production, set up regular database backups:

```bash
# Backup command
pg_dump -h hostname -U username -d agencyflow > backup_$(date +%Y%m%d).sql

# Restore command
psql -h hostname -U username -d agencyflow < backup_file.sql
```

## Docker Deployment

### Quick Start with Docker Compose

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd agencyflow
   ```

2. Create your PostgreSQL database and initialize it:
   ```bash
   # Create database (see Database Setup section)
   psql "postgresql://user:password@your-db-host:5432/agencyflow" -f scripts/init-db.sql
   ```

3. Create the `.env` file with your configuration:
   ```bash
   # .env file
   DATABASE_URL=postgresql://user:password@your-db-host:5432/agencyflow
   SESSION_SECRET=your-secure-session-secret-min-32-chars
   JWT_SECRET=your-secure-jwt-secret-min-32-chars
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SKIP_MIGRATIONS=true
   ```

4. Build and start the container:
   ```bash
   docker-compose up -d --build
   ```

5. Access the application at `http://localhost:5000`

### Production Build Only

To build just the application image:

```bash
docker build -t agencyflow:latest .
```

To run the built image:

```bash
docker run -d \
  --name agencyflow \
  -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:password@your-db-host:5432/agencyflow \
  -e SESSION_SECRET=your-session-secret \
  -e JWT_SECRET=your-jwt-secret \
  -e SMTP_HOST=your-smtp-host \
  -e SMTP_PORT=465 \
  -e SMTP_USER=your-smtp-user \
  -e SMTP_PASSWORD=your-smtp-password \
  -e SKIP_MIGRATIONS=true \
  agencyflow:latest
```

### Docker Compose File Reference

The `docker-compose.yml` file is configured for external PostgreSQL:

```yaml
version: '3.8'

services:
  agencyflow:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - SKIP_MIGRATIONS=${SKIP_MIGRATIONS:-false}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:5000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

## Dokploy Deployment

Dokploy is a self-hosted PaaS that makes deploying applications easy. Follow these steps to deploy AgencyFlow to Dokploy.

### Prerequisites for Dokploy

1. A running Dokploy instance
2. A PostgreSQL database (can be created in Dokploy or external)
3. Git repository with AgencyFlow code

### Step 1: Set Up PostgreSQL Database

**Option A: Use Dokploy's PostgreSQL Service**

1. In Dokploy dashboard, go to **Databases** > **Create Database**
2. Select **PostgreSQL**
3. Configure:
   - Name: `agencyflow-db`
   - Version: `15` (or latest)
   - Set a secure password
4. Click **Create**
5. Once created, copy the internal connection string (e.g., `postgresql://postgres:password@agencyflow-db:5432/postgres`)

**Option B: Use External PostgreSQL**

Use your existing PostgreSQL instance. Ensure it's accessible from your Dokploy server.

### Step 2: Initialize the Database

Before deploying the application, initialize the database with the schema:

```bash
# Connect to your Dokploy server via SSH
ssh user@your-dokploy-server

# Download the init script
curl -O https://raw.githubusercontent.com/your-repo/agencyflow/main/scripts/init-db.sql

# Run the initialization script
psql "postgresql://postgres:password@localhost:5432/agencyflow" -f init-db.sql
```

Alternatively, use Dokploy's database console to run the SQL commands from `scripts/init-db.sql`.

### Step 3: Create Application in Dokploy

1. Go to your Dokploy dashboard
2. Click **Create Application**
3. Select **Docker** as the deployment type

### Step 4: Connect Repository

1. Click **Connect Repository**
2. Choose your Git provider (GitHub, GitLab, Bitbucket)
3. Select the repository containing AgencyFlow
4. Choose the branch to deploy (usually `main` or `production`)

### Step 5: Configure Build Settings

In the **Build** tab:

| Setting | Value |
|---------|-------|
| Build Type | Dockerfile |
| Dockerfile Path | `Dockerfile` |
| Build Context | `.` |

### Step 6: Add Environment Variables

In the **Environment** tab, add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Your PostgreSQL connection string |
| `SESSION_SECRET` | (generate secure string) | 32+ character secret |
| `JWT_SECRET` | (generate secure string) | 32+ character secret |
| `SMTP_HOST` | `smtp.gmail.com` | Your SMTP server |
| `SMTP_PORT` | `465` | SMTP port |
| `SMTP_USER` | `your-email@gmail.com` | SMTP username |
| `SMTP_PASSWORD` | `your-app-password` | SMTP password |
| `SKIP_MIGRATIONS` | `true` | Skip auto-migrations (DB pre-initialized) |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `5000` | Application port |

### Step 7: Configure Networking

In the **Network** tab:

1. **Exposed Port**: `5000`
2. **Add Domain** (optional):
   - Add your custom domain (e.g., `app.yourdomain.com`)
   - Enable HTTPS (recommended)
   - Configure DNS to point to your Dokploy server

### Step 8: Configure Health Check

In the **Advanced** tab:

| Setting | Value |
|---------|-------|
| Health Check Path | `/api/health` |
| Health Check Interval | `30s` |
| Health Check Timeout | `10s` |
| Start Period | `60s` |

### Step 9: Deploy

1. Click **Deploy** to start the build
2. Monitor the build logs for any errors
3. Once deployed, access your application at your configured domain

### Dokploy Deployment Checklist

- [ ] PostgreSQL database created and accessible
- [ ] Database initialized with `init-db.sql`
- [ ] All environment variables configured
- [ ] Domain configured (optional)
- [ ] HTTPS enabled (recommended)
- [ ] Health check configured
- [ ] Application deployed and running

### Dokploy Troubleshooting

**Build fails:**
- Check that `package-lock.json` is committed
- Verify Dockerfile path is correct

**Cannot connect to database:**
- Verify `DATABASE_URL` is correct
- Check if database is accessible from the application container
- For Dokploy internal databases, use the internal hostname

**Application starts but health check fails:**
- Check application logs in Dokploy dashboard
- Verify port 5000 is correctly exposed
- Ensure the health endpoint `/api/health` is responding

## Email Configuration

AgencyFlow sends email notifications for:
- Task assignments and unassignments
- Project member additions and removals
- General notifications

### SMTP Configuration

For **Gmail**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

For **Outlook/Office 365**:
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

For **Custom SMTP**:
```
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
```

> **Note for Gmail**: You must use an App Password, not your regular Gmail password. Go to Google Account > Security > 2-Step Verification > App passwords to generate one.

## Health Checks

The application exposes a health check endpoint:

- **Endpoint**: `GET /api/health`
- **Success Response**: `{ "status": "ok" }`

Configure your reverse proxy or container orchestrator to use this endpoint.

## Troubleshooting

### Common Issues

1. **Build fails with "npm ci" error**
   - Ensure `package-lock.json` is committed
   - Try deleting `node_modules` and running `npm install`

2. **Database connection error**
   - Verify `DATABASE_URL` is correct
   - Check if the database server is accessible from the container
   - Ensure the database exists and the user has permissions
   - For Dokploy, use internal hostnames for databases created within Dokploy

3. **Email not sending**
   - Verify SMTP credentials are correct
   - Check if your SMTP server allows connections from your IP
   - For Gmail, use an App Password (not your regular password)

4. **Application not accessible**
   - Verify the container is running: `docker ps`
   - Check logs: `docker logs agencyflow`
   - Ensure port 5000 is exposed and not blocked by firewall

5. **Static assets not loading**
   - Ensure the build completed successfully
   - Check if `/dist` directory was created

6. **Admin user not created**
   - Verify `init-db.sql` was run on the database
   - Check database logs for errors during initialization
   - Manually run the admin creation SQL if needed

### Viewing Logs

```bash
# Docker logs
docker logs -f agencyflow

# Docker Compose logs
docker-compose logs -f agencyflow

# Dokploy logs
# View in Dokploy dashboard under application logs
```

### Debug Mode

To run in debug mode:

```bash
docker run -it \
  --entrypoint /bin/sh \
  agencyflow:latest
```

### Manual Database Initialization

If you need to manually create the admin user:

```sql
-- Connect to your database and run:
INSERT INTO users (id, email, password_hash)
VALUES (
    gen_random_uuid(),
    'admin@website.com',
    '$2b$10$...' -- bcrypt hash of your desired password
)
RETURNING id;

-- Then create the profile and role using the returned id
INSERT INTO profiles (id, full_name, role, email)
VALUES ('<user-id-from-above>', 'System Administrator', 'admin', 'admin@website.com');

INSERT INTO user_roles (user_id, role)
VALUES ('<user-id-from-above>', 'admin');
```

## Security Recommendations

1. **Use strong secrets** - Generate with: `openssl rand -base64 32`
2. **Enable HTTPS** - Always use SSL/TLS in production
3. **Regular updates** - Keep dependencies updated
4. **Database security** - Use strong passwords and limit network access
5. **Environment isolation** - Never share secrets between environments
6. **Change default admin password** - Immediately change the default admin password after first login

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review application logs
- Contact support at your organization
