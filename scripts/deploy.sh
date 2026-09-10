#!/bin/bash

# LunaStream Deployment Script
# This script helps you deploy the web app to Vercel

echo "🚀 LunaStream Deployment"
echo "========================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed"
    echo ""
    echo " Installing Vercel CLI..."
    npm install --global vercel@latest
fi

echo "✅ Vercel CLI is installed"
echo ""

# Check if Vercel is logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel..."
    echo ""
    echo "📱 Follow the instructions in your browser..."
    echo ""
    vercel login
fi

echo "✅ Logged in to Vercel"
echo ""

# Pull Vercel environment information
echo "📥 Pulling Vercel environment information..."
vercel pull --yes --environment=production

echo "✅ Vercel environment information pulled"
echo ""

# Build project artifacts
echo "🏗️  Building project..."
vercel build --prod

echo "✅ Project built"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel deploy --prebuilt --prod

echo ""
echo "✅ Deployed to Vercel!"
echo ""

# Get the deployment URL
echo "📱 Your deployment URL:"
vercel inspect

echo ""
echo " Deployment complete!"
echo ""
echo "📱 Next steps:"
echo "1. Copy the deployment URL"
echo "2. Update Android apps with the new URL"
echo "3. Rebuild Android apps (automatic on next GitHub release)"
echo "4. Enjoy!"
