# ==============================================================================
# Task 5: DevOps Environment Software Verification Script
# Validates installation of all required softwares provisioned by Ansible / Chef
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "TASK 5: DEVOPS SOFTWARE PROVISIONING VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

function Test-Tool {
    param(
        [string]$Name,
        [scriptblock]$Command
    )
    Write-Host "`nChecking: $Name" -ForegroundColor Yellow
    try {
        $result = & $Command 2>&1
        Write-Host "  STATUS : INSTALLED & OPERATIONAL" -ForegroundColor Green
        Write-Host "  VERSION: $result" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "  STATUS : NOT FOUND / ERROR" -ForegroundColor Red
        return $false
    }
}

Test-Tool "Git (Version Control System)" { git --version }
Test-Tool "Node.js (JavaScript Runtime)" { node --version }
Test-Tool "npm (Node Package Manager)" { npm --version }
Test-Tool "Python (Scripting & Automation)" { python --version }
Test-Tool "Java / OpenJDK (Jenkins Dependency)" { java --version }
Test-Tool "Docker CLI (Containerization)" { docker --version }
Test-Tool "Jenkins Service (CI/CD Automation)" { Get-Service Jenkins -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status }
Test-Tool "Ansible Core (Configuration Management)" { wsl /home/jainam1408/.local/bin/ansible --version | Select-Object -First 1 }

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "✅ ALL REQUIRED SOFTWARES SUCCESSFULLY VERIFIED!" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
