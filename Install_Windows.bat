@echo off
pushd "%~dp0"
title ColorLab Forma Setup Pro - 1-Click Installer
color 0A

echo ==========================================================
echo  ColorLab Forma Setup Pro - 1-Click Installer (Windows)
echo  Developed by Yahia Bin Zaman ^| https://github.com/yahiabinzaman
echo ==========================================================
echo.

:: 1. Enable PlayerDebugMode for all CSXS versions
echo [1/4] Configuring Adobe CEP PlayerDebugMode in Registry...
for %%V in (9 10 11 12 13 14 15 16 17 18 19 20) do (
    reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
)

:: 2. Target Directory
echo [2/4] Preparing Adobe CEP extension folder...
set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\com.colorlab.formasetup"
if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions" >nul 2>&1
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%" >nul 2>&1
mkdir "%TARGET_DIR%" >nul 2>&1

:: 3. Copy files cleanly (excluding .git and .DS_Store)
echo [3/4] Copying extension files...
where robocopy >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    robocopy "%~dp0." "%TARGET_DIR%" /E /XD .git /XF .DS_Store >nul 2>&1
) else (
    xcopy /E /I /H /Y /Q "%~dp0*" "%TARGET_DIR%\" >nul 2>&1
    if exist "%TARGET_DIR%\.git" rmdir /s /q "%TARGET_DIR%\.git" >nul 2>&1
)

if not exist "%TARGET_DIR%\CSXS\manifest.xml" (
    echo [ERROR] Extension files could not be copied to: %TARGET_DIR%
    pause
    popd
    exit /b 1
)

:: 4. Copy standalone scripts to Documents\Adobe Scripts (no admin needed) and Illustrator Presets (if admin)
echo [4/4] Registering QuickRun scripts...
set "USER_SCRIPTS=%USERPROFILE%\Documents\Adobe Scripts"
if not exist "%USER_SCRIPTS%" mkdir "%USER_SCRIPTS%" >nul 2>&1
for %%S in ("Forma_Setup_Pro_QuickRun.jsx" "Ready_File_Generator_QuickRun.jsx" "Print_Demo_BackToBack.jsx") do (
    if exist "%~dp0%%~S" (
        copy /Y "%~dp0%%~S" "%USER_SCRIPTS%\" >nul 2>&1
        for /d %%D in ("%PROGRAMFILES%\Adobe\Adobe Illustrator*") do (
            if exist "%%D\Presets" (
                for /d %%P in ("%%D\Presets\*") do (
                    if exist "%%P\Scripts" (
                        copy /Y "%~dp0%%~S" "%%P\Scripts\" >nul 2>&1
                    )
                )
            )
        )
    )
)

echo.
echo ==========================================================
echo  [SUCCESS] ColorLab Forma Setup Pro installed successfully!
echo  Restart Adobe Illustrator and open:
echo  Window ^> Extensions ^> ColorLab Forma Setup Pro
echo  (Or File ^> Scripts ^> Forma_Setup_Pro_QuickRun / Ready_File_Generator_QuickRun)
echo ==========================================================
echo.
pause
popd
