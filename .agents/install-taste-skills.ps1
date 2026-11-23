# Taste Skill Installer for Antigravity AI Agent
# Usage:
#   .\.agents\install-taste-skills.ps1 -Scope Workspace  (Installs into current project .agents/skills)
#   .\.agents\install-taste-skills.ps1 -Scope Global     (Installs globally into C:\Users\merce\.gemini\config\skills)

param(
    [ValidateSet("Workspace", "Global")]
    [string]$Scope = "Workspace"
)

$RepoUrl = "https://github.com/Leonxlnx/taste-skill/archive/refs/heads/main.zip"

if ($Scope -eq "Global") {
    $TargetDir = "$env:USERPROFILE\.gemini\config\skills"
} else {
    $TargetDir = "$(Get-Location)\.agents\skills"
}

Write-Host "Installing Taste Skill set into: $TargetDir" -ForegroundColor Cyan

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$TempZip = [System.IO.Path]::GetTempFileName() + ".zip"
$TempExtract = Join-Path ([System.IO.Path]::GetTempPath()) "taste-skill-main"

Write-Host "Downloading latest Taste Skill bundle..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $RepoUrl -OutFile $TempZip

Write-Host "Extracting skills..." -ForegroundColor Yellow
if (Test-Path $TempExtract) { Remove-Item -Path $TempExtract -Recurse -Force }
Expand-Archive -Path $TempZip -DestinationPath ([System.IO.Path]::GetTempPath()) -Force

$SourceSkillsDir = Join-Path ([System.IO.Path]::GetTempPath()) "taste-skill-main\skills"

if (Test-Path $SourceSkillsDir) {
    Get-ChildItem -Path $SourceSkillsDir -Directory | ForEach-Object {
        $SkillName = $_.Name
        $DestSkillDir = Join-Path $TargetDir $SkillName
        Write-Host "  -> Installing skill: $SkillName" -ForegroundColor Green
        if (Test-Path $DestSkillDir) { Remove-Item -Path $DestSkillDir -Recurse -Force }
        Copy-Item -Path $_.FullName -Destination $DestSkillDir -Recurse -Force
    }
    Write-Host "`nSuccessfully installed Taste Skill collection to $Scope configuration!" -ForegroundColor Green
} else {
    Write-Host "Error: Could not locate skills directory in downloaded archive." -ForegroundColor Red
}

# Cleanup
Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
