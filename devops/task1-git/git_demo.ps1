# ==============================================================================
# Task 1: Git Operations Demonstration Script (Push & Pop)
# Project: RecruitX (https://github.com/jainamjain14/recruitx.git)
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "TASK 1: GIT OPERATIONS - DEMONSTRATING PUSH & POP" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n[STEP 1] Current Git Status & Branch" -ForegroundColor Yellow
git status -s
$currentBranch = git branch --show-current
Write-Host "Active Branch: $currentBranch" -ForegroundColor Green

Write-Host "`n[STEP 2] Check Remote Configuration" -ForegroundColor Yellow
git remote -v

Write-Host "`n[STEP 3] Executing 'git stash push' to temporarily shelve changes" -ForegroundColor Yellow
$stashOutput = git stash push -m "DevOps_Lab_Test_Stash_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host $stashOutput -ForegroundColor Green

Write-Host "`n[STEP 4] Listing Active Stashes (git stash list)" -ForegroundColor Yellow
git stash list

Write-Host "`n[STEP 5] Restoring Stashed Changes via 'git stash pop'" -ForegroundColor Yellow
$popOutput = git stash pop
Write-Host $popOutput -ForegroundColor Green

Write-Host "`n[STEP 6] Git Remote Push Protocol Explanation" -ForegroundColor Yellow
Write-Host "To push staged and committed work to the GitHub remote repository:"
Write-Host "  1. git add ." -ForegroundColor White
Write-Host "  2. git commit -m 'feat: complete devops mini-project tasks'" -ForegroundColor White
Write-Host "  3. git push origin main" -ForegroundColor White

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "✅ TASK 1 DEMONSTRATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
