#!/bin/bash
set -e

echo "=== Strix SaaS Template Initialization ==="
echo ""

# Read Strix configuration
if [ ! -f "strix.config.json" ]; then
  echo "ERROR: strix.config.json not found"
  exit 1
fi

echo "✓ Strix configuration found"

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "CLERK_SECRET_KEY")

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "⚠ Warning: $var is not set"
  else
    echo "✓ $var is configured"
  fi
done

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Running database migrations..."
if [ -n "$DATABASE_URL" ]; then
  npm run db:migrate || echo "⚠ Migration failed or not configured"
else
  echo "⚠ Skipping migrations (DATABASE_URL not set)"
fi

echo ""
echo "Building application..."
npm run build

echo ""
echo "=== Initialization Complete ==="
echo ""
echo "Next steps:"
echo "  1. Set up environment variables"
echo "  2. Run 'npm run dev' to start development server"
echo "  3. Deploy to Vercel with 'vercel deploy'"
