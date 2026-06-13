"""
מתקין שקט — מריץ פעם אחת, לא פותח שום חלון
"""
import os, sys, winreg, urllib.request, subprocess, shutil, zipfile

INSTALL_DIR = r'C:\YTDownloader'
YTDLP_URL   = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
FFMPEG_URL  = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
STARTUP_KEY = r'Software\Microsoft\Windows\CurrentVersion\Run'

def download(url, dest):
    urllib.request.urlretrieve(url, dest)

def main():
    os.makedirs(INSTALL_DIR, exist_ok=True)

    # העתקת yt_server.exe
    src = os.path.join(os.path.dirname(sys.argv[0]), 'yt_server.exe')
    dst = os.path.join(INSTALL_DIR, 'yt_server.exe')
    if os.path.exists(src):
        shutil.copy2(src, dst)

    # הורדת yt-dlp אם חסר
    ytdlp = os.path.join(INSTALL_DIR, 'yt-dlp.exe')
    if not os.path.exists(ytdlp):
        download(YTDLP_URL, ytdlp)

    # הורדת ffmpeg אם חסר
    ffmpeg = os.path.join(INSTALL_DIR, 'ffmpeg.exe')
    if not os.path.exists(ffmpeg):
        zp = os.path.join(INSTALL_DIR, 'ffmpeg.zip')
        tmp = os.path.join(INSTALL_DIR, 'ffmpeg_tmp')
        download(FFMPEG_URL, zp)
        with zipfile.ZipFile(zp, 'r') as z:
            z.extractall(tmp)
        for root, _, files in os.walk(tmp):
            for f in files:
                if f == 'ffmpeg.exe':
                    shutil.copy2(os.path.join(root, f), ffmpeg)
                    break
        shutil.rmtree(tmp, ignore_errors=True)
        os.remove(zp)

    # הוספה להפעלה אוטומטית
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, STARTUP_KEY, 0, winreg.KEY_SET_VALUE) as k:
        winreg.SetValueEx(k, 'YTDownloader', 0, winreg.REG_SZ, dst)

    # הרצה מיידית
    subprocess.Popen([dst], creationflags=0x08000000)

if __name__ == '__main__':
    main()
