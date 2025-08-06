@echo off
echo Testing AI Career Advisor Security Features
echo.

echo 1. Health Check:
curl -s http://localhost:4000/health
echo.
echo.

echo 2. Usage Monitoring:
curl -s http://localhost:4000/api/admin/usage
echo.
echo.

echo 3. Test Resume Endpoint (should work):
curl -X POST http://localhost:4000/api/resume -H "Content-Type: application/json" -d "{\"resumeText\":\"Software Engineer with Python experience\"}"
echo.
echo.

echo 4. Test Spam Detection (should be blocked):
curl -X POST http://localhost:4000/api/resume -H "Content-Type: application/json" -d "{\"resumeText\":\"test spam lorem ipsum\"}"
echo.
echo.

echo 5. Final Usage Check:
curl -s http://localhost:4000/api/admin/usage
echo.

pause
