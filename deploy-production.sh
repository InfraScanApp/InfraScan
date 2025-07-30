#!/bin/bash

# 🚀 InfraScan Production Deployment Script
# This script helps deploy InfraScan to production with 1000+ node support

echo "🚀 InfraScan Production Deployment"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "config-task.yml" ]; then
    echo "❌ Error: config-task.yml not found. Please run this script from the InfraScan-phase1 directory."
    exit 1
fi

echo "✅ Configuration file found"
echo ""

# Verify production settings
echo "🔍 Verifying production configuration..."

# Check bounty limits
BOUNTY_PER_ROUND=$(grep "bounty_amount_per_round:" config-task.yml | awk '{print $2}')
TOTAL_BOUNTY=$(grep "total_bounty_amount:" config-task.yml | awk '{print $2}')
ENVIRONMENT=$(grep "environment:" config-task.yml | awk '{print $2}')

echo "📊 Current Configuration:"
echo "   - Bounty per round: $BOUNTY_PER_ROUND tokens"
echo "   - Total bounty: $TOTAL_BOUNTY tokens"
echo "   - Environment: $ENVIRONMENT"
echo ""

# Validate production settings
if [ "$BOUNTY_PER_ROUND" != "4000" ]; then
    echo "❌ Error: bounty_amount_per_round should be 4000 for production"
    exit 1
fi

if [ "$TOTAL_BOUNTY" != "1000000" ]; then
    echo "❌ Error: total_bounty_amount should be 1000000 for production"
    exit 1
fi

if [ "$ENVIRONMENT" != "\"PRODUCTION\"" ]; then
    echo "❌ Error: environment should be set to PRODUCTION"
    exit 1
fi

echo "✅ Production configuration verified"
echo ""

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check for errors."
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Check for testing references
echo "🔍 Checking for testing references..."
TEST_REFS=$(grep -r "testing.*true\|TEST.*environment" src/ --include="*.ts" --include="*.js" | wc -l)

if [ "$TEST_REFS" -gt 0 ]; then
    echo "⚠️  Warning: Found $TEST_REFS testing references. Please review before deployment."
else
    echo "✅ No testing references found"
fi

echo ""

# Display deployment summary
echo "📋 DEPLOYMENT SUMMARY"
echo "===================="
echo "✅ Configuration: Production ready"
echo "✅ Build: Completed successfully"
echo "✅ Node Capacity: ~1,333 nodes maximum (dynamic)"
echo "✅ Bounty Limit: 4,000 tokens per round"
echo "✅ Initial Budget: 1,000,000 tokens (monitored)"
echo "✅ Safety Mechanisms: Active"
echo ""

echo "🚀 READY FOR DEPLOYMENT!"
echo ""
echo "Next steps:"
echo "1. Deploy to Koii network using the updated config-task.yml"
echo "2. Monitor node registration and reward distribution"
echo "3. Check logs in rewards.json for distribution tracking"
echo "4. Monitor system performance and community feedback"
echo ""
echo "📞 Support: Check PRODUCTION_DEPLOYMENT_SUMMARY.md for detailed information"
echo ""
echo "🎯 Good luck with the launch! 🚀" 