#!/bin/bash

echo "🚀 AI Worker Deployment Script"
echo "================================"

# Check if deployment target is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh [fly|render|docker]"
    echo "  fly    - Deploy to Fly.io"
    echo "  render - Deploy to Render"
    echo "  docker - Build and run locally with Docker"
    exit 1
fi

case $1 in
    "fly")
        echo "🪰 Deploying to Fly.io..."
        if ! command -v flyctl &> /dev/null; then
            echo "❌ flyctl not found. Install it from: https://fly.io/docs/getting-started/installing-flyctl/"
            exit 1
        fi
        
        echo "📋 Setting up Fly app..."
        flyctl apps create --name your-ai-worker-app-name || echo "App may already exist"
        
        echo "🔧 Setting environment variables..."
        flyctl secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
        flyctl secrets set AI_WORKER_URL="https://your-ai-worker-app-name.fly.dev"
        
        echo "🚀 Deploying..."
        flyctl deploy
        
        echo "✅ Deployment complete!"
        echo "📍 Your AI Worker is available at: https://your-ai-worker-app-name.fly.dev"
        ;;
        
    "render")
        echo "🎨 Deploying to Render..."
        echo "1. Connect your repository to Render"
        echo "2. Create a new Web Service"
        echo "3. Use the render.yaml configuration"
        echo "4. Set environment variables:"
        echo "   - OPENAI_API_KEY"
        echo "   - AI_WORKER_URL (will be provided by Render)"
        echo "📖 Guide: https://render.com/docs/deploy-python"
        ;;
        
    "docker")
        echo "🐳 Building and running with Docker..."
        
        # Check if .env exists
        if [ ! -f ".env" ]; then
            echo "⚠️  No .env file found. Creating from .env.example..."
            cp ../.env.example .env
            echo "📝 Please edit .env with your actual values"
        fi
        
        echo "🔨 Building Docker image..."
        docker build -t ai-worker .
        
        echo "🏃 Running container..."
        docker run -p 8000:8000 --env-file .env ai-worker
        ;;
        
    *)
        echo "❌ Unknown deployment target: $1"
        echo "Usage: ./deploy.sh [fly|render|docker]"
        exit 1
        ;;
esac