@echo off
pushd "%~dp0"
title ColorLab Forma Setup Pro v1.3 - 1-Click Installer
color 0A

echo ==========================================================
echo  ColorLab Forma Setup Pro v1.3 - Installer (Windows)
echo  Developed by Yahia Bin Zaman ^| https://github.com/yahiabinzaman
echo ==========================================================
echo.

tasklist /FI "IMAGENAME eq Illustrator.exe" 2>nul | find /I "Illustrator.exe" >nul
if errorlevel 1 goto csxs_reg
echo [WARNING] Adobe Illustrator is currently running!
echo Close Adobe Illustrator completely before installing/updating, then re-open it.
echo.

:csxs_reg
:: 1. Enable PlayerDebugMode for all CSXS versions
echo [1/4] Configuring Adobe CEP PlayerDebugMode in Registry...
for %%V in (8 9 10 11 12 13 14 15 16 17 18 19 20) do (
    reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
)

:: 2. Target Directory
echo [2/4] Preparing Adobe CEP extension folder...
set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\com.colorlab.formasetup"
if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions" >nul 2>&1
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%" >nul 2>&1
if exist "%TARGET_DIR%" (
    echo [ERROR] Existing folder could not be removed (files locked by Adobe Illustrator).
    echo Folder: %TARGET_DIR%
    echo Close Adobe Illustrator and run this installer again.
    pause
    popd
    exit /b 1
)
mkdir "%TARGET_DIR%" >nul 2>&1

:: 3. Copy files cleanly outside parenthesized blocks so errorlevel is evaluated reliably
echo [3/4] Copying extension files...
where robocopy >nul 2>&1
if errorlevel 1 goto use_xcopy

robocopy "%~dp0." "%TARGET_DIR%" /E /XD .git /XF .DS_Store >nul 2>&1
if errorlevel 8 goto copy_failed
goto verify_files

:use_xcopy
xcopy /E /I /H /Y /Q "%~dp0*" "%TARGET_DIR%\" >nul 2>&1
if errorlevel 1 goto copy_failed
if exist "%TARGET_DIR%\.git" rmdir /s /q "%TARGET_DIR%\.git" >nul 2>&1
if exist "%TARGET_DIR%\.DS_Store" del /f /q "%TARGET_DIR%\.DS_Store" >nul 2>&1
goto verify_files

:copy_failed
echo [ERROR] Failed to copy extension files. Close Adobe Illustrator and try again.
pause
popd
exit /b 1

:verify_files
for %%F in (
    "CSXS\manifest.xml"
    "index.html"
    "js\CSInterface.js"
    "js\main.js"
    "jsx\hostscript.jsx"
    "Forma_Setup_Pro_QuickRun.jsx"
    "Ready_File_Generator_QuickRun.jsx"
    "Print_Demo_BackToBack.jsx"
) do (
    if not exist "%TARGET_DIR%\%%~F" (
        echo [ERROR] Missing required file in extension folder: %%~F
        pause
        popd
        exit /b 1
    )
)

:: 4. Copy standalone scripts to Documents\Adobe Scripts (no admin needed) and Illustrator Presets (if writable)
echo [4/4] Registering QuickRun scripts...
set "USER_SCRIPTS=%USERPROFILE%\Documents\Adobe Scripts"
if not exist "%USER_SCRIPTS%" mkdir "%USER_SCRIPTS%" >nul 2>&1
for %%S in ("Forma_Setup_Pro_QuickRun.jsx" "Ready_File_Generator_QuickRun.jsx" "Print_Demo_BackToBack.jsx") do (
    if exist "%~dp0%%~S" (
        copy /Y "%~dp0%%~S" "%USER_SCRIPTS%\" >nul 2>&1
        for /d %%D in ("%PROGRAMFILES%\Adobe\Adobe Illustrator*" "%PROGRAMFILES(X86)%\Adobe\Adobe Illustrator*") do (
            if exist "%%~D\Presets" (
                for /d %%P in ("%%~D\Presets\*") do (
                    if exist "%%~P\Scripts" (
                        copy /Y "%~dp0%%~S" "%%~P\Scripts\" >nul 2>&1
                    )
                )
            )
        )
    )
)

echo.
echo ==========================================================
echo  [SUCCESS] ColorLab Forma Setup Pro v1.3 installed!
echo  Extension: %TARGET_DIR%
echo  Scripts:   %USER_SCRIPTS%
echo.
echo  Restart Adobe Illustrator and open:
echo  Window ^> Extensions ^> ColorLab Forma Setup Pro
echo  (Or File ^> Scripts ^> Other Script... from %USER_SCRIPTS%)
echo ==========================================================
echo.
pause
popd
