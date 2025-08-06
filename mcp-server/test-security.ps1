# PowerShell script to test security features
Write-Host "🧪 Testing AI Career Advisor Security Features" -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1️⃣ Health Check Test" -ForegroundColor Yellow
$health = curl -s http://localhost:4000/health | ConvertFrom-Json
Write-Host "✅ Server Status: $($health.status)" -ForegroundColor Green

# Test 2: Usage Monitoring
Write-Host "`n2️⃣ Usage Monitoring Test" -ForegroundColor Yellow
$usage = curl -s http://localhost:4000/api/admin/usage | ConvertFrom-Json
Write-Host "✅ Today's Requests: $($usage.stats[0].requests)" -ForegroundColor Green
Write-Host "✅ Today's Cost: `$$($usage.stats[0].cost)" -ForegroundColor Green

# Test 3: Input Validation
Write-Host "`n3️⃣ Input Validation Test" -ForegroundColor Yellow
$spam = curl -s -X POST http://localhost:4000/api/resume -H "Content-Type: application/json" -d '{"resumeText":"test spam lorem ipsum"}' | ConvertFrom-Json
if ($spam.error -like "*Invalid resume content*") {
    Write-Host "✅ Spam Detection: Working" -ForegroundColor Green
} else {
    Write-Host "❌ Spam Detection: Failed" -ForegroundColor Red
}

# Test 4: Rate Limiting
Write-Host "`n4️⃣ Rate Limiting Test" -ForegroundColor Yellow
$validResume = '{"resumeText":"John Doe, Software Engineer with experience in Python, JavaScript, React. Built web applications and APIs."}'

for ($i = 1; $i -le 6; $i++) {
    $response = curl -s -X POST http://localhost:4000/api/resume -H "Content-Type: application/json" -d $validResume | ConvertFrom-Json
    if ($response.error -like "*Too many AI requests*") {
        Write-Host "✅ Rate Limiting: Triggered at request $i" -ForegroundColor Green
        break
    } elseif ($response.skills) {
        Write-Host "✅ Request $i: Successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Request $i: Unexpected response" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

# Test 5: Final Usage Check
Write-Host "`n5️⃣ Final Usage Check" -ForegroundColor Yellow
$finalUsage = curl -s http://localhost:4000/api/admin/usage | ConvertFrom-Json
Write-Host "✅ Total Requests Today: $($finalUsage.stats[0].requests)" -ForegroundColor Green
Write-Host "✅ Total Cost Today: `$$($finalUsage.stats[0].cost)" -ForegroundColor Green
Write-Host "✅ Total Tokens Today: $($finalUsage.stats[0].tokens)" -ForegroundColor Green

Write-Host "`n🎉 Security Testing Complete!" -ForegroundColor Green
Write-Host "Monitor usage at: http://localhost:4000/api/admin/usage" -ForegroundColor Cyan
