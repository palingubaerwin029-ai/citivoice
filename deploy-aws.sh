#!/bin/bash
set -e

echo "======================================"
echo "🚀 CitiVoice AWS Deployment"
echo "======================================"

# ── Preflight checks ─────────────────────────────────────────
if [ ! -f ./backend/.env ]; then
  echo "❌ backend/.env not found!"
  echo "   Copy .env.example and fill in your RDS + API credentials:"
  echo "   cp backend/.env.example backend/.env"
  exit 1
fi

# ── Pull latest code ─────────────────────────────────────────
echo "📥 Pulling latest code..."
git pull origin main 2>/dev/null || echo "⚠️  Git pull skipped (not a git repo or no remote)"

# ── Build and deploy ─────────────────────────────────────────
echo "📦 Building and starting containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d --build

# ── Cleanup ───────────────────────────────────────────────────
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# ── Status ────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "✅ Deployment Successful!"
echo "======================================"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🌐 Admin Dashboard:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<EC2-PUBLIC-IP>')"
echo "🔌 Backend API:      http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<EC2-PUBLIC-IP>')/api/health"
echo "======================================"
