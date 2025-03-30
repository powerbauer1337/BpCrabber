#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up Beatport MVP environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }

# Setup environment
echo "📝 Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env file from example"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Setup database
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma migrate dev --name init

# Build application
echo "🏗️ Building application..."
npm run build

# Start development environment
echo "🚀 Starting development environment..."
docker-compose up -d

# Run initial tests
echo "🧪 Running initial tests..."
npm run test

# Setup git hooks
echo "🔧 Setting up git hooks..."
npx husky install

echo "✅ MVP environment setup complete!"
echo "
Next steps:
1. Update .env with your configuration
2. Start the development server: npm run dev
3. Access the application at http://localhost:3000
"
