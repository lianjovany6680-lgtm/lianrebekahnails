@echo off
echo.
echo ======================================
echo   Lian Rebekah Nails - Local Server
echo ======================================
echo.
echo פותח את האתר בדפדפן...
echo כתובת: http://localhost:8080
echo.
echo לסגירה: לחצי Ctrl+C
echo.
cd /d "%~dp0"
python -m http.server 8080 2>nul || (
  echo Python לא מותקן, מנסה npx...
  npx serve . -p 8080 2>nul || (
    echo.
    echo שגיאה: לא נמצא Python או Node.js
    echo הורידי Python מ: https://python.org
    pause
    exit
  )
)
start http://localhost:8080/admin.html
pause
