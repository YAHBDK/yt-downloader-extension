import sys, json, struct, subprocess, os, threading

BASE = os.path.dirname(os.path.abspath(sys.argv[0]))
YTDLP = os.path.join(BASE, 'yt-dlp.exe')
DOWNLOADS = os.path.join(os.path.expanduser('~'), 'Downloads')
PROXY = 'http://8.8.8.8:80'

def read_msg():
    raw = sys.stdin.buffer.read(4)
    if not raw or len(raw) < 4: return None
    return json.loads(sys.stdin.buffer.read(struct.unpack('<I', raw)[0]))

def send_msg(obj):
    data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('<I', len(data)) + data)
    sys.stdout.buffer.flush()

def download(url, fmt):
    try:
        if fmt == 'mp3':
            cmd = [YTDLP, '--proxy', PROXY, '--no-check-certificates',
                   '-x', '--audio-format', 'mp3', '--audio-quality', '0',
                   '--ffmpeg-location', BASE,
                   '-o', os.path.join(DOWNLOADS, '%(title)s.%(ext)s'), url]
        else:
            cmd = [YTDLP, '--proxy', PROXY, '--no-check-certificates',
                   '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                   '--merge-output-format', 'mp4',
                   '--ffmpeg-location', BASE,
                   '-o', os.path.join(DOWNLOADS, '%(title)s.%(ext)s'), url]

        r = subprocess.run(cmd, capture_output=True, text=True,
                           creationflags=0x08000000, timeout=300)
        if r.returncode == 0:
            send_msg({'ok': True})
        else:
            send_msg({'ok': False, 'error': r.stderr[-500:] if r.stderr else 'שגיאה לא ידועה'})
    except subprocess.TimeoutExpired:
        send_msg({'ok': False, 'error': 'פג זמן ההורדה'})
    except Exception as e:
        send_msg({'ok': False, 'error': str(e)})

msg = read_msg()
if msg:
    download(msg.get('url', ''), msg.get('format', 'mp4'))
