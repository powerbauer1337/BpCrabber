#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting build and test process..."

# Check if running in CI environment
if [ -z "$CI" ]; then
  echo "Running in local environment"
  # Load environment variables
  if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  fi
else
  echo "Running in CI environment"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Build application
echo "🏗️ Building application..."
npm run build

# Build Docker images
echo "🐳 Building Docker images..."
docker build -t beatport-app:prod -f Dockerfile.prod .

# Start production stack
echo "🚀 Starting production stack..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run health checks
echo "🏥 Running health checks..."
curl -f http://localhost:3000/health || (echo "Health check failed" && exit 1)

# Run E2E tests
echo "🧪 Running E2E tests..."
npm run test:e2e

# Cleanup
echo "🧹 Cleaning up..."
docker-compose -f docker-compose.prod.yml down

echo "✅ Build and test process completed successfully!"
