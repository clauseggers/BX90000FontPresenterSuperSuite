@echo off
setlocal enabledelayedexpansion

:: Check if Node.js is installed first
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    exit /b 1
)

:: Check if http-server is installed
where http-server >nul 2>&1
if %errorlevel% neq 0 (
    echo http-server is not installed. Installing now...
    call npm install -g http-server
    if %errorlevel% neq 0 (
        echo Failed to install http-server
        exit /b 1
    )
)

:: Build the project
echo Building project...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed
    exit /b 1
)

:: Check and change to http_root directory
if not exist http_root\ (
    echo Directory http_root does not exist
    exit /b 1
)
cd http_root

:: Start server with caching disabled and CORS enabled
echo Starting server with caching disabled...
start /b cmd /c http-server -c-1 --cors --silent

:: Wait for the server to start (using PowerShell for better port checking)
echo Waiting for server to start...
:checkPort
powershell -command "$port = New-Object Net.Sockets.TcpClient; try { $port.Connect('localhost', 8080); Write-Host 'Port is open'; $port.Close() } catch { exit 1 }"
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto :checkPort
)

:: Search for Chrome in common installation locations
set "chrome_exe="
for %%p in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
    if exist "%%p" (
        set "chrome_exe=%%p"
        goto :found_chrome
    )
)

:found_chrome
if defined chrome_exe (
    start "" "%chrome_exe%" --incognito "http://localhost:8080"
) else (
    echo Chrome not found in common locations. Trying direct command...
    start "" chrome --incognito "http://localhost:8080"
)

echo Server is running. Press Ctrl+C to stop.
:: Wait indefinitely
:loop
timeout /t 3600 >nul
goto :loop