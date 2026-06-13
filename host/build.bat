@echo off
chcp 65001 >nul
echo בונה קבצים...

pip install pyinstaller >nul 2>&1

pyinstaller --onefile --noconsole --name yt_server --distpath "%~dp0dist" --workpath "%~dp0build_tmp" --specpath "%~dp0build_tmp" "%~dp0..\..\..\YTDownloader\yt_server.py"
if not exist "%~dp0dist\yt_server.exe" (
    echo שגיאה בבניית yt_server.exe
    pause & exit /b 1
)

pyinstaller --onefile --noconsole --name התקן --distpath "%~dp0dist" --workpath "%~dp0build_tmp" --specpath "%~dp0build_tmp" "%~dp0install.py"
if not exist "%~dp0dist\התקן.exe" (
    echo שגיאה בבניית התקן.exe
    pause & exit /b 1
)

rmdir /s /q "%~dp0build_tmp" >nul 2>&1

echo.
echo הבנייה הושלמה! הקבצים בתיקיית dist\
echo.
echo שלח לחברים:
echo   1. תיקיית yt-downloader-extension  (גוררים לכרום)
echo   2. dist\yt_server.exe + dist\התקן.exe  (בתיקייה אחת, מריצים התקן.exe פעם אחת)
pause
