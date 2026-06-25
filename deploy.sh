#!/bin/bash
set -e

echo "======================================"
echo "🚀 Starting CitiVoice Deployment..."
echo "======================================"

# Ensure .env files exist (Copy examples if missing)
if [ ! -f ./backend/.env ]; then
  echo "⚠️ Backend .env missing! Copying from .env.example..."
  cp ./backend/.env.example ./backend/.env
fi

if [ ! -f ./admin-web/.env ]; then
  echo "⚠️ Admin-Web .env missing! Creating default..."
  echo "REACT_APP_API_URL=/api" > ./admin-web/.env
fi

echo "📦 Rebuilding and starting Docker containers..."

# Down existing containers
docker-compose down

# Build and start in detached mode
docker-compose up -d --build

# Prune dangling dangling images to save disk space
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "======================================"
echo "✅ Deployment Successful!"
echo "Database, Backend API, and Admin Dashboard are now live."
echo "======================================"
