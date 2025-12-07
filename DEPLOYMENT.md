# AgencyFlow Deployment Guide

This guide covers deploying AgencyFlow to production using Docker and Dokploy.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Docker Deployment](#docker-deployment)
4. [Dokploy Deployment](#dokploy-deployment)
5. [Database Setup](#database-setup)
6. [Email Configuration](#email-configuration)
7. [Health Checks](#health-checks)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- PostgreSQL 15+ (or use the included Docker service)
- Node.js 20+ (for local development)
- SMTP server credentials (for email notifications)

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agencyflow
EXTERNAL_DATABASE_URL=postgresql://user:password@your-db-host:5432/agencyflow

# Authentication
SESSION_SECRET=your-secure-session-secret-min-32-chars
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Email (SMTP)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-smtp-password

# Frontend (Supabase - if using)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# PostgreSQL (for docker-compose db service)
POSTGRES_USER=agencyflow
POSTGRES_PASSWORD=your-secure-db-password
POSTGRES_DB=agencyflow
```

## Docker Deployment

### Quick Start with Docker Compose

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd agencyflow
   ```

2. Create the `.env` file with your configuration (see above)

3. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```

4. Access the application at `http://localhost:5000`

### Production Build Only

To build just the application image:

```bash
docker build -t agencyflow:latest \
  --build-arg VITE_SUPABASE_URL=your-url \
  --build-arg VITE_SUPABASE_ANON_KEY=your-key \
  .
```

To run the built image:

```bash
docker run -d \
  --name agencyflow \
  -p 5000:5000 \
  -e DATABASE_URL=your-database-url \
  -e SESSION_SECRET=your-session-secret \
  -e JWT_SECRET=your-jwt-secret \
  -e SMTP_HOST=your-smtp-host \
  -e SMTP_PORT=465 \
  -e SMTP_USER=your-smtp-user \
  -e SMTP_PASSWORD=your-smtp-password \
  agencyflow:latest
```

## Dokploy Deployment

### Setting Up in Dokploy

1. **Create a New Application**
   - Go to your Dokploy dashboard
   - Click "Create Application"
   - Select "Docker" as the deployment type

2. **Connect Repository**
   - Connect your Git repository (GitHub, GitLab, etc.)
   - Select the branch to deploy (usually `main` or `production`)

3. **Configure Build Settings**
   - Dockerfile path: `Dockerfile`
   - Build context: `.`
   - Exposed port: `5000`

4. **Add Environment Variables**
   
   In Dokploy, add all environment variables from the [Environment Variables](#environment-variables) section:
   
   | Variable | Description |
   |----------|-------------|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `EXTERNAL_DATABASE_URL` | External database URL (optional) |
   | `SESSION_SECRET` | Secure random string (32+ chars) |
   | `JWT_SECRET` | Secure random string (32+ chars) |
   | `SMTP_HOST` | SMTP server hostname |
   | `SMTP_PORT` | SMTP port (465 for SSL) |
   | `SMTP_USER` | SMTP username/email |
   | `SMTP_PASSWORD` | SMTP password |
   | `VITE_SUPABASE_URL` | Supabase project URL (build arg) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key (build arg) |

5. **Configure Build Arguments**
   
   For Vite environment variables, add them as build arguments:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

6. **Set Up Database**
   
   Option A: Use Dokploy's PostgreSQL service
   - Create a new PostgreSQL database in Dokploy
   - Copy the connection string to `DATABASE_URL`
   
   Option B: Use external PostgreSQL
   - Use your existing PostgreSQL instance
   - Ensure the database is accessible from Dokploy

7. **Configure Domain**
   - Add your custom domain (e.g., `app.yourdomain.com`)
   - Enable HTTPS (recommended)
   - Configure DNS to point to your Dokploy server

8. **Deploy**
   - Click "Deploy" to start the build
   - Monitor the build logs for any errors
   - Once deployed, access your application at your configured domain

### Dokploy Environment Setup Example

```yaml
# dokploy.yml (if using declarative config)
name: agencyflow
type: docker
dockerfile: Dockerfile
port: 5000

environment:
  - DATABASE_URL=${DATABASE_URL}
  - SESSION_SECRET=${SESSION_SECRET}
  - JWT_SECRET=${JWT_SECRET}
  - SMTP_HOST=${SMTP_HOST}
  - SMTP_PORT=${SMTP_PORT}
  - SMTP_USER=${SMTP_USER}
  - SMTP_PASSWORD=${SMTP_PASSWORD}

build_args:
  - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
  - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

health_check:
  path: /api/health
  interval: 30s
  timeout: 10s
```

## Database Setup

### Automatic Database Setup (Docker)

When using Docker, the database is automatically set up on first run:

1. **Database migrations** run automatically via `drizzle-kit push`
2. **Default admin user** is created automatically:
   - Email: `admin@website.com`
   - Password: `Admin123`
   - **IMPORTANT**: Change this password immediately after first login!

The Docker entrypoint script handles:
- Waiting for the database to be ready
- Running database migrations
- Creating the default admin user (if not exists)
- Starting the application

### Manual Database Migration

If you need to run migrations manually:

```bash
# Using Docker
docker exec -it agencyflow npx drizzle-kit push --force

# Or connect directly to the database and run:
npm run db:push
```

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
   - Verify Vite build args were passed correctly

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

## Security Recommendations

1. **Use strong secrets** - Generate with: `openssl rand -base64 32`
2. **Enable HTTPS** - Always use SSL/TLS in production
3. **Regular updates** - Keep dependencies updated
4. **Database security** - Use strong passwords and limit network access
5. **Environment isolation** - Never share secrets between environments

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review application logs
- Contact support at your organization
