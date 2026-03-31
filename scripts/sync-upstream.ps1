param(
    [string]$BaseBranch = "main",
    [switch]$Push
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Repo: $repoRoot"
Write-Host "Base branch: $BaseBranch"

git -C $repoRoot fetch upstream
git -C $repoRoot checkout $BaseBranch
git -C $repoRoot merge --ff-only ("upstream/" + $BaseBranch)

if ($Push) {
    git -C $repoRoot push origin $BaseBranch
}

Write-Host "Upstream sync complete."
