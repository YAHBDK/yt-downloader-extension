@echo off
chcp 65001 >nul
echo ================================
echo    מתקין YouTube Downloader
echo ================================
echo.

set HOSTDIR=%~dp0
set HOSTDIR=%HOSTDIR:~0,-1%

:: הורדת yt-dlp אם חסר
if not exist "%HOSTDIR%\yt-dlp.exe" (
    echo מוריד yt-dlp...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile '%HOSTDIR%\yt-dlp.exe'"
    if not exist "%HOSTDIR%\yt-dlp.exe" (
        echo שגיאה: לא הצלחתי להוריד yt-dlp
        pause
        exit /b 1
    )
    echo yt-dlp הורד בהצלחה
) else (
    echo yt-dlp קיים
)

:: הורדת ffmpeg אם חסר
if not exist "%HOSTDIR%\ffmpeg.exe" (
    echo מוריד ffmpeg... זה יקח כמה דקות
    powershell -Command "$url='https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'; $zip='%HOSTDIR%\ffmpeg.zip'; Invoke-WebRequest -Uri $url -OutFile $zip; Expand-Archive -Path $zip -DestinationPath '%HOSTDIR%\ffmpeg_tmp' -Force; Copy-Item (Get-ChildItem '%HOSTDIR%\ffmpeg_tmp' -Recurse -Filter 'ffmpeg.exe')[0].FullName '%HOSTDIR%\ffmpeg.exe'; Remove-Item $zip -Force; Remove-Item '%HOSTDIR%\ffmpeg_tmp' -Recurse -Force"
    if not exist "%HOSTDIR%\ffmpeg.exe" (
        echo שגיאה: לא הצלחתי להוריד ffmpeg
        pause
        exit /b 1
    )
    echo ffmpeg הורד בהצלחה
) else (
    echo ffmpeg קיים
)

:: בניית nf_host.exe עם pyinstaller
if not exist "%HOSTDIR%\nf_host.exe" (
    echo בונה את קובץ ההרצה...
    pip install pyinstaller >nul 2>&1
    pyinstaller --onefile --noconsole --distpath "%HOSTDIR%" --workpath "%HOSTDIR%\build_tmp" --specpath "%HOSTDIR%\build_tmp" "%HOSTDIR%\nf_host.py"
    if exist "%HOSTDIR%\build_tmp" rmdir /s /q "%HOSTDIR%\build_tmp"
    if not exist "%HOSTDIR%\nf_host.exe" (
        echo שגיאה: לא הצלחתי לבנות את הקובץ
        echo האם Python מותקן?
        pause
        exit /b 1
    )
    echo נבנה בהצלחה
) else (
    echo nf_host.exe קיים
)

:: כתיבת manifest עם הנתיב הנכון
set EXEPATH=%HOSTDIR%\nf_host.exe
set EXEPATH=%EXEPATH:\=\\%
set MANIFESTPATH=%HOSTDIR%\com.nfdownloader.json

:: קבלת Extension ID מהמשתמש
echo.
echo ====================================================
echo כדי לסיים את ההתקנה צריך את ה-ID של התוסף:
echo 1. פתח Chrome
echo 2. לך ל-chrome://extensions
echo 3. העתק את ה-ID של "YouTube Downloader - NFmp3"
echo ====================================================
set /p EXTID=הדבק כאן את ה-ID של התוסף:

:: יצירת manifest מעודכן
powershell -Command "$m=@{name='com.nfdownloader';description='YouTube Downloader Native Host';path='%EXEPATH%';type='stdio';allowed_origins=@('chrome-extension://%EXTID%/','chrome-extension://%EXTID%/')};$m|ConvertTo-Json|Set-Content -Encoding UTF8 '%MANIFESTPATH%'"

:: רישום ברגיסטרי
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.nfdownloader" /ve /d "%MANIFESTPATH%" /f >nul
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.nfdownloader" /ve /d "%MANIFESTPATH%" /f >nul

echo.
echo ====================================================
echo         ההתקנה הושלמה בהצלחה!
echo ====================================================
echo כעת תוכל להשתמש בכפתורי ההורדה ביוטיוב
echo הקבצים יישמרו בתיקיית Downloads שלך
echo ====================================================
pause
