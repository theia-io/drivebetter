#!/usr/bin/env sh
set -e

echo "🚀 Running CI seed script..."

# Fail if MongoDB URI is not set
if [ -z "$MONGODB_URI" ]; then
  echo "❌ MONGODB_URI is not set"
  exit 1
fi

# Always run seeding in CI, regardless of NODE_ENV
echo "🌱 Seeding test database at $MONGODB_URI..."
npm run seed || {
  echo "❌ Seeding failed"
  exit 1
}

echo "✅ CI seeding completed."
