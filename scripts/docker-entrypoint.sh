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

echo "Running database migrations..."
npm run db:push 2>/dev/null || npx drizzle-kit push

echo "Initializing default admin user..."
npx tsx scripts/init-admin.ts

echo "Starting application..."
exec npx tsx server/index.js
