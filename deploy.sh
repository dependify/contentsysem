#!/bin/bash

# ContentSys Deployment Script for Coolify
# This script helps prepare the application for deployment

echo "🚀 ContentSys Deployment Preparation"
echo "===================================="

# Check if required files exist
echo "📋 Checking deployment files..."

required_files=("Dockerfile" ".dockerignore" "package.json" "src/index.ts")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

echo "✅ All required files present"

# Check environment variables template
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production template not found"
else
    echo "✅ Environment template ready"
fi

# Build the application locally to test
echo "🔨 Testing local build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - fix errors before deploying"
    exit 1
fi

# Check Docker build (optional)
if command -v docker &> /dev/null; then
    echo "🐳 Testing Docker build..."
    docker build -t contentsys-test .
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker build successful"
        docker rmi contentsys-test
    else
        echo "❌ Docker build failed"
        exit 1
    fi
else
    echo "⚠️  Docker not available - skipping Docker build test"
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Push your code to your Git repository"
echo "2. Create a new application in Coolify"
echo "3. Connect your repository"
echo "4. Set environment variables (see .env.production)"
echo "5. Deploy!"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions"