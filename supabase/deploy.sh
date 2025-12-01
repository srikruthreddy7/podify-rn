#!/bin/bash

# Supabase Edge Functions Deployment Script
# This script helps deploy edge functions to Supabase

set -e

echo "🚀 PodcastAssist - Supabase Edge Functions Deployment"
echo "======================================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo "  or"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if .env file exists
if [ ! -f "supabase/.env" ]; then
    echo "⚠️  Warning: supabase/.env file not found"
    echo ""
    echo "Please create supabase/.env with your Podcast Index API credentials:"
    echo "  cp supabase/.env.example supabase/.env"
    echo ""
    read -p "Do you want to continue deployment anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        exit 1
    fi
fi

# Ask which deployment type
echo "Select deployment option:"
echo "  1) Deploy all functions"
echo "  2) Deploy podcast-index function only"
echo "  3) Set Supabase secrets"
echo "  4) Deploy with local testing (no JWT verification)"
echo ""
read -p "Enter option (1-4): " option

case $option in
    1)
        echo ""
        echo "📦 Deploying all edge functions..."
        supabase functions deploy
        echo ""
        echo "✅ All functions deployed successfully!"
        ;;
    2)
        echo ""
        echo "📦 Deploying podcast-index function..."
        supabase functions deploy podcast-index
        echo ""
        echo "✅ podcast-index function deployed successfully!"
        ;;
    3)
        echo ""
        echo "🔐 Setting Supabase secrets..."
        echo ""
        echo "Podcast Index API credentials:"
        read -p "  API Key: " podcast_api_key
        read -p "  API Secret: " podcast_api_secret
        echo ""
        echo "LiveKit API credentials:"
        read -p "  API Key: " livekit_api_key
        read -p "  API Secret: " livekit_api_secret

        supabase secrets set PODCAST_INDEX_API_KEY="$podcast_api_key"
        supabase secrets set PODCAST_INDEX_API_SECRET="$podcast_api_secret"
        supabase secrets set LIVEKIT_API_KEY="$livekit_api_key"
        supabase secrets set LIVEKIT_API_SECRET="$livekit_api_secret"

        echo ""
        echo "✅ Secrets set successfully!"
        echo ""
        echo "Now deploy the functions with option 1 or 2"
        ;;
    4)
        echo ""
        echo "📦 Deploying podcast-index function (development mode)..."
        echo "⚠️  WARNING: JWT verification disabled - do not use in production!"
        supabase functions deploy podcast-index --no-verify-jwt
        echo ""
        echo "✅ podcast-index function deployed (dev mode)!"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "======================================================"
echo "📋 Next Steps:"
echo ""
echo "1. Test your function:"
echo "   Visit your Supabase dashboard to get the function URL"
echo ""
echo "2. View logs:"
echo "   supabase functions logs podcast-index"
echo ""
echo "3. View real-time logs:"
echo "   supabase functions logs podcast-index --follow"
echo ""
echo "======================================================"
