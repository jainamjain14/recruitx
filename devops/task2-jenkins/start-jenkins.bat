@echo off
REM ==============================================================================
REM Jenkins Windows Startup Script
REM Starts Jenkins using installed war file on httpPort 8080
REM ==============================================================================

echo ========================================================
echo Starting Jenkins Automation Server on Windows...
echo Jenkins Home: %ProgramData%\Jenkins\.jenkins
echo URL: http://localhost:8080
echo ========================================================

java -DJENKINS_HOME="%ProgramData%\Jenkins\.jenkins" -jar "C:\Program Files\Jenkins\jenkins.war" --httpPort=8080 --webroot="%ProgramData%\Jenkins\war"
pause
