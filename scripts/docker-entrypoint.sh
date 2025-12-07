#!/bin/sh
set -e

echo "AgencyFlow Docker Entrypoint"
echo "============================"

echo "Waiting for database to be ready..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => { client.end(); process.exit(0); })
  .catch(() => process.exit(1));
" 2>/dev/null; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"

# Check if migrations should be skipped (user has pre-initialized database)
if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "SKIP_MIGRATIONS is set to true, skipping database migrations and admin initialization..."
  echo "Make sure you have imported the database schema using the provided init-db.sql file."
else
  echo "Running database migrations..."
  npm run db:push 2>/dev/null || npx drizzle-kit push

  echo "Initializing default admin user..."
  npx tsx scripts/init-admin.ts
fi

echo "Starting application..."
exec npx tsx server/index.ts
