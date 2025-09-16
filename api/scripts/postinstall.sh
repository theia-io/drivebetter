#!/usr/bin/env sh
set -e

echo "🚀 Running postinstall script..."

# Only seed DB in development mode
if [ "$NODE_ENV" = "development" ]; then
  echo "🌱 Seeding development database..."
  npm run seed || echo "⚠️ Seeding failed (check logs), continuing..."
else
  echo "ℹ️ Skipping seed, NODE_ENV=$NODE_ENV"
fi

echo "✅ Postinstall completed."
