@echo off
echo 🚀 ContentSys Deployment Preparation
echo ====================================

echo 📋 Checking deployment files...

if not exist "Dockerfile" (
    echo ❌ Missing required file: Dockerfile
    exit /b 1
)

if not exist "package.json" (
    echo ❌ Missing required file: package.json
    exit /b 1
)

if not exist "src\index.ts" (
    echo ❌ Missing required file: src\index.ts
    exit /b 1
)

echo ✅ All required files present

if not exist ".env.production" (
    echo ⚠️  .env.production template not found
) else (
    echo ✅ Environment template ready
)

echo 🔨 Testing local build...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed - fix errors before deploying
    exit /b 1
)

echo ✅ Build successful

echo.
echo 🎉 Deployment preparation complete!
echo.
echo Next steps:
echo 1. Push your code to your Git repository
echo 2. Create a new application in Coolify
echo 3. Connect your repository
echo 4. Set environment variables (see .env.production)
echo 5. Deploy!
echo.
echo 📚 See DEPLOYMENT.md for detailed instructions