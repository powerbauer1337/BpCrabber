#!/bin/bash

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOL
DATABASE_URL="postgresql://username:password@localhost:5432/beatport_dev"
JWT_SECRET="development_jwt_secret_key"
JWT_EXPIRES_IN="900"
NODE_ENV="development"
PORT="3000"
EOL
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Run database migrations
echo "Running database migrations..."
npx prisma migrate dev

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo "Setup complete! You can now run 'npm run dev' to start the development server."
