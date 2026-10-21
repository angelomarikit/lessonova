# Regenerate transparent WebM + poster from public/videos/lessonova-mascot-original.mp4
# Requires FFmpeg (Gyan.FFmpeg via winget).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Error "ffmpeg not found on PATH. Install with: winget install Gyan.FFmpeg"
}

$src = Join-Path $root "public\videos\lessonova-mascot-original.mp4"
$webm = Join-Path $root "public\videos\lessonova-mascot-transparent.webm"
$poster = Join-Path $root "public\images\lessonova-mascot-poster.png"
$vf = "colorkey=0xFFFFFF:0.03:0.02,format=rgba"

if (-not (Test-Path $src)) {
  Write-Error "Missing source: $src"
}

& ffmpeg -y -i $src -an -vf $vf -frames:v 1 -update 1 $poster
& ffmpeg -y -i $src -an -vf $vf -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 33 -b:v 0 -row-mt 1 $webm

Write-Host "Wrote $webm and $poster"
