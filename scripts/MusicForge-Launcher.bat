@echo off
setlocal
rem ================================================================
rem  MusicForge-Launcher.bat  -  one-click start for MusicForge
rem  (AI Lyrics Generator & Multi-Agent Songwriting Studio)
rem
rem  Double-click for the menu, or run with an action argument:
rem      MusicForge-Launcher.bat start | rebuild | stop | status
rem
rem  Start   = installs deps if missing, builds if needed, then starts the
rem            PRODUCTION server on :3005 (built UI + API, no vite at
rem            runtime), waits until ready, opens the browser.
rem  Rebuild = rebuilds the client (dist/) + server bundle (dist-server/),
rem            restarts the production server.
rem  Stop    = stops the server (kills the process on :3005).
rem  Status = shows whether MusicForge is running.
rem
rem  FIXED PATHS: if the project moves, edit MFORGE below.
rem  This project uses pnpm (node_modules is a pnpm layout - do NOT run
rem  `npm install` in it; the npm arborist chokes on the .pnpm tree).
rem ================================================================

rem Project root is derived from this script's location (scripts\..\), so the
rem launcher keeps working no matter where the repo is placed.
set "MFORGE=%~dp0.."
set "URL=http://localhost:3005"
set "HEALTH=http://localhost:3005/api/health"
set "PORT=3005"

title MusicForge Launcher

rem ---------- optional direct action from the command line ----------
if /i "%~1"=="start"   goto start_mforge
if /i "%~1"=="rebuild" goto rebuild_mforge
if /i "%~1"=="stop"    goto stop_mforge
if /i "%~1"=="status"  goto status

:menu
cls
echo.
echo  ==================================================
echo    MusicForge Launcher
echo  ==================================================
echo    [1] Start   - production server on :%PORT% (builds if needed)
echo    [2] Rebuild - rebuild client + server, then start
echo    [3] Stop    - stop the production server
echo    [4] Status
echo    [0] Exit
echo  ==================================================
set choice=
set /p choice="  Choose: "
if "%choice%"=="1" goto start_mforge
if "%choice%"=="2" goto rebuild_mforge
if "%choice%"=="3" goto stop_mforge
if "%choice%"=="4" goto status
if "%choice%"=="0" exit /b
echo   Invalid choice.
ping -n 2 127.0.0.1 >nul
goto menu

rem ================================================================
:start_mforge
rem ================================================================
call :ensure_project
if errorlevel 1 goto :end
call :mforge_up
if not errorlevel 1 (
  echo MusicForge is already running on %URL%.
) else (
  call :ensure_deps
  if errorlevel 1 goto :end
  call :build_if_needed
  if errorlevel 1 goto :end
  echo Starting MusicForge production server on :%PORT%...
  start "MusicForge Production Server (port %PORT%)" /min cmd /k "cd /d "%MFORGE%" && pnpm start"
  call :wait_mforge
)
rem warm the first request, then open the browser
curl -s -o nul --max-time 60 %URL%/ >nul 2>&1
start "" "%URL%"
echo.
echo   MusicForge is ready: %URL%
echo   API:                 %HEALTH%
echo   Keep the minimized server window open.  API keys: edit %MFORGE%\.env.local
goto :end

rem ================================================================
:rebuild_mforge
rem ================================================================
call :ensure_project
if errorlevel 1 goto :end
call :mforge_up
if not errorlevel 1 call :stop_mforge
call :ensure_deps
if errorlevel 1 goto :end
call :build_mforge
if errorlevel 1 goto :end
echo Starting MusicForge production server on :%PORT%...
start "MusicForge Production Server (port %PORT%)" /min cmd /k "cd /d "%MFORGE%" && pnpm start"
call :wait_mforge
curl -s -o nul --max-time 60 %URL%/ >nul 2>&1
start "" "%URL%"
echo.
echo   MusicForge rebuilt and restarted: %URL%
echo   API:                 %HEALTH%
goto :end

rem ================================================================
:stop_mforge
rem ================================================================
echo Stopping MusicForge (server on :%PORT%)...
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { $p | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Output ('Stopped PID(s): ' + ($p -join ',')) } else { Write-Output ('Nothing running on :%PORT%') }"
goto :end

rem ================================================================
:status
rem ================================================================
echo.
echo  === MusicForge status ===
echo.
curl -s -o nul --max-time 3 %HEALTH% >nul 2>&1 && (echo   Server :%PORT%        : UP) || (echo   Server :%PORT%        : DOWN)
echo   App   : %URL%
echo   API   : %HEALTH%
echo   Proj  : %MFORGE%
goto :end

rem ================================================================
rem  helpers
rem ================================================================

:ensure_project
if exist "%MFORGE%\package.json" exit /b 0
echo ERROR: project not found: %MFORGE%
echo Edit the MFORGE path at the top of this script.
exit /b 1

:mforge_up
curl -s -o nul --max-time 3 %HEALTH% >nul 2>&1
if errorlevel 1 exit /b 1
exit /b 0

:ensure_deps
if exist "%MFORGE%\node_modules" exit /b 0
echo Installing dependencies (first run only)...
pushd "%MFORGE%"
call pnpm install
set "ec=%errorlevel%"
popd
if not "%ec%"=="0" (
  echo ERROR: pnpm install failed.
  exit /b 1
)
exit /b 0

:build_if_needed
if exist "%MFORGE%\dist\index.html" if exist "%MFORGE%\dist-server\index.cjs" exit /b 0
echo Build outputs missing - building first...
call :build_mforge
exit /b %errorlevel%

:build_mforge
pushd "%MFORGE%"
echo Building client (vite -> dist/)...
call pnpm build
if errorlevel 1 (
  popd
  echo ERROR: vite build failed.
  exit /b 1
)
echo Building server bundle (esbuild -> dist-server/index.cjs)...
call pnpm build:server
if errorlevel 1 (
  popd
  echo ERROR: server bundle failed.
  exit /b 1
)
popd
exit /b 0

:wait_mforge
set tries=0
:wm_loop
set /a tries+=1
if %tries% gtr 60 goto wm_done
curl -s -o nul --max-time 2 %HEALTH% >nul 2>&1
if not errorlevel 1 goto wm_done
ping -n 2 127.0.0.1 >nul
goto wm_loop
:wm_done
call :mforge_up
if errorlevel 1 echo WARNING: MusicForge did not come up in time.
exit /b 0

:end
echo.
if "%~1"=="" pause
exit /b
