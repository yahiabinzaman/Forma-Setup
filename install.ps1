# ==============================================================================
# ColorLab Forma Setup Pro v1.3 - Automated Installer for Windows (PowerShell)
# Developed by Yahia Bin Zaman | https://github.com/yahiabinzaman
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ColorLab Forma Setup Pro v1.3 - Windows Installer        " -ForegroundColor Green
Write-Host " Developed by Yahia Bin Zaman                             " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Warn if Adobe Illustrator is currently open (locked files prevent clean overwrite)
$aiRunning = Get-Process -Name "Illustrator" -ErrorAction SilentlyContinue
if ($aiRunning) {
    Write-Host "[WARNING] Adobe Illustrator is currently running!" -ForegroundColor Yellow
    Write-Host "Please close Adobe Illustrator first so all extension files update cleanly." -ForegroundColor Yellow
    Write-Host ""
}

# 1. Enable PlayerDebugMode in Windows Registry for Adobe CEP
Write-Host "[1/4] Configuring Adobe CEP PlayerDebugMode in Registry..." -ForegroundColor Gray
$csxsVersions = @(8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
foreach ($ver in $csxsVersions) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$ver"
    if (!(Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -Type String -Force | Out-Null
}

# 2. Target Directory
$targetDir = "$env:APPDATA\Adobe\CEP\extensions\com.colorlab.formasetup"
$parentDir = "$env:APPDATA\Adobe\CEP\extensions"
if (!(Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

if (Test-Path $targetDir) {
    try {
        Remove-Item -Path $targetDir -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Host "[ERROR] Could not remove existing extension folder: $targetDir" -ForegroundColor Red
        Write-Host "Close Adobe Illustrator completely and re-run this installer." -ForegroundColor Yellow
        return
    }
}
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

# 3. Install from local repository folder or download latest ZIP from GitHub
$scriptDir = $null
if ($MyInvocation.MyCommand.Path) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ($scriptDir -and (Test-Path "$scriptDir\CSXS\manifest.xml")) {
    Write-Host "[2/4] Installing from local source files..." -ForegroundColor Gray
    Get-ChildItem -Path $scriptDir -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -ne ".DS_Store" } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $targetDir -Recurse -Force
    }
} else {
    Write-Host "[2/4] Downloading ColorLab Forma Setup Pro from GitHub..." -ForegroundColor Cyan
    $tempZip = "$env:TEMP\Forma-Setup-main.zip"
    $tempExtract = "$env:TEMP\Forma-Setup-extract"
    if (Test-Path $tempZip) { Remove-Item -Force $tempZip -ErrorAction SilentlyContinue }
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue }

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    } catch {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    }
    $url = "https://github.com/yahiabinzaman/Forma-Setup/archive/refs/heads/main.zip"
    Invoke-WebRequest -Uri $url -OutFile $tempZip -UseBasicParsing

    Write-Host "[3/4] Extracting and deploying extension..." -ForegroundColor Gray
    Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

    $extractedFolder = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
    if (!$extractedFolder -or !(Test-Path "$($extractedFolder.FullName)\CSXS\manifest.xml")) {
        Write-Host "[ERROR] Downloaded archive did not contain extension files." -ForegroundColor Red
        return
    }

    Get-ChildItem -Path $extractedFolder.FullName -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -ne ".DS_Store" } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $targetDir -Recurse -Force
    }

    Remove-Item -Force $tempZip -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue
}

# Verify deployed files
$requiredFiles = @(
    "CSXS\manifest.xml",
    "index.html",
    "js\CSInterface.js",
    "js\main.js",
    "jsx\hostscript.jsx",
    "Forma_Setup_Pro_QuickRun.jsx",
    "Ready_File_Generator_QuickRun.jsx",
    "Print_Demo_BackToBack.jsx"
)
foreach ($req in $requiredFiles) {
    if (!(Test-Path "$targetDir\$req")) {
        Write-Host "[ERROR] Installation verification failed. Missing: $targetDir\$req" -ForegroundColor Red
        return
    }
}

# 4. Copy standalone JSX scripts to Documents\Adobe Scripts and Illustrator Presets (if writable)
Write-Host "[4/4] Registering standalone menu scripts..." -ForegroundColor Gray
$userScripts = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Adobe Scripts"
if (!(Test-Path $userScripts)) {
    New-Item -ItemType Directory -Path $userScripts -Force -ErrorAction SilentlyContinue | Out-Null
}
$jsxNames = @("Forma_Setup_Pro_QuickRun.jsx", "Ready_File_Generator_QuickRun.jsx", "Print_Demo_BackToBack.jsx")
$aiRoots = @("C:\Program Files\Adobe", "C:\Program Files (x86)\Adobe")
$aiPaths = foreach ($root in $aiRoots) {
    if (Test-Path $root) {
        Get-ChildItem -Path $root -Filter "Adobe Illustrator*" -Directory -ErrorAction SilentlyContinue
    }
}
foreach ($jsxName in $jsxNames) {
    $jsxSource = "$targetDir\$jsxName"
    if (Test-Path $jsxSource) {
        Copy-Item -Path $jsxSource -Destination $userScripts -Force -ErrorAction SilentlyContinue
        foreach ($ai in $aiPaths) {
            $presetScripts = Get-ChildItem -Path "$($ai.FullName)\Presets" -Recurse -Filter "Scripts" -Directory -ErrorAction SilentlyContinue
            foreach ($sDir in $presetScripts) {
                Copy-Item -Path $jsxSource -Destination $sDir.FullName -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] ColorLab Forma Setup Pro v1.3 installed!" -ForegroundColor Green
Write-Host " Extension: $targetDir" -ForegroundColor Gray
Write-Host " Scripts:   $userScripts" -ForegroundColor Gray
Write-Host " Restart Adobe Illustrator and open:" -ForegroundColor Yellow
Write-Host " Window > Extensions > ColorLab Forma Setup Pro" -ForegroundColor White
Write-Host " (Or File > Scripts > Other Script... from $userScripts)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
