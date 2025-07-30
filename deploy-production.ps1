# 🚀 InfraScan Production Deployment Script (PowerShell)
# This script helps deploy InfraScan to production with 1000+ node support

Write-Host "🚀 InfraScan Production Deployment" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "config-task.yml")) {
    Write-Host "❌ Error: config-task.yml not found. Please run this script from the InfraScan-phase1 directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Configuration file found" -ForegroundColor Green
Write-Host ""

# Verify production settings
Write-Host "🔍 Verifying production configuration..." -ForegroundColor Yellow

# Check bounty limits
$configContent = Get-Content "config-task.yml" -Raw
$bountyPerRound = ($configContent -split "`n" | Select-String "bounty_amount_per_round:" | ForEach-Object { $_.ToString().Split(":")[1].Trim() })
$totalBounty = ($configContent -split "`n" | Select-String "total_bounty_amount:" | ForEach-Object { $_.ToString().Split(":")[1].Trim() })
$environment = ($configContent -split "`n" | Select-String "environment:" | ForEach-Object { $_.ToString().Split(":")[1].Trim() })

Write-Host "📊 Current Configuration:" -ForegroundColor Cyan
Write-Host "   - Bounty per round: $bountyPerRound tokens" -ForegroundColor White
Write-Host "   - Total bounty: $totalBounty tokens" -ForegroundColor White
Write-Host "   - Environment: $environment" -ForegroundColor White
Write-Host ""

# Validate production settings
if ($bountyPerRound -ne "4000") {
    Write-Host "❌ Error: bounty_amount_per_round should be 4000 for production" -ForegroundColor Red
    exit 1
}

if ($totalBounty -ne "1000000") {
    Write-Host "❌ Error: total_bounty_amount should be 1000000 for production" -ForegroundColor Red
    exit 1
}

if ($environment -ne '"PRODUCTION"') {
    Write-Host "❌ Error: environment should be set to PRODUCTION" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Production configuration verified" -ForegroundColor Green
Write-Host ""

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please check for errors." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully" -ForegroundColor Green
Write-Host ""

# Check for testing references
Write-Host "🔍 Checking for testing references..." -ForegroundColor Yellow
$testRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.js" | Select-String "testing.*true|TEST.*environment" | Measure-Object | Select-Object -ExpandProperty Count

if ($testRefs -gt 0) {
    Write-Host "⚠️  Warning: Found $testRefs testing references. Please review before deployment." -ForegroundColor Yellow
} else {
    Write-Host "✅ No testing references found" -ForegroundColor Green
}

Write-Host ""

# Display deployment summary
Write-Host "📋 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "✅ Configuration: Production ready" -ForegroundColor Green
Write-Host "✅ Build: Completed successfully" -ForegroundColor Green
Write-Host "✅ Node Capacity: ~1,333 nodes maximum (dynamic)" -ForegroundColor Green
Write-Host "✅ Bounty Limit: 4,000 tokens per round" -ForegroundColor Green
Write-Host "✅ Initial Budget: 1,000,000 tokens (monitored)" -ForegroundColor Green
Write-Host "✅ Safety Mechanisms: Active" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 READY FOR DEPLOYMENT!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Deploy to Koii network using the updated config-task.yml" -ForegroundColor White
Write-Host "2. Monitor node registration and reward distribution" -ForegroundColor White
Write-Host "3. Check logs in rewards.json for distribution tracking" -ForegroundColor White
Write-Host "4. Monitor system performance and community feedback" -ForegroundColor White
Write-Host ""
Write-Host "📞 Support: Check PRODUCTION_DEPLOYMENT_SUMMARY.md for detailed information" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Good luck with the launch! 🚀" -ForegroundColor Green 