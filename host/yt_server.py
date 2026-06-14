"""
שרת הורדות מקומי — רץ בשקט ברקע
מאזין על localhost:9797
"""
import http.server, json, subprocess, os, sys, threading, socket, uuid, re

PORT = 9797
BASE = os.path.dirname(os.path.abspath(sys.argv[0]))
YTDLP = os.path.join(BASE, 'yt-dlp.exe')
FFMPEG = BASE
DOWNLOADS = os.path.join(os.path.expanduser('~'), 'Downloads')

jobs = {}  # job_id -> {percent, speed, eta, done, error}

def already_running():
    try:
        s = socket.socket()
        s.bind(('127.0.0.1', PORT))
        s.close()
        return False
    except:
        return True

def run_download(job_id, url, fmt):
    is_playlist = 'list=' in url and 'watch?v=' not in url
    if is_playlist:
        out = os.path.join(DOWNLOADS, '%(playlist_title)s', '%(playlist_index)s - %(title)s.%(ext)s')
    else:
        out = os.path.join(DOWNLOADS, '%(title)s.%(ext)s')

    if fmt == 'mp3':
        cmd = [YTDLP, '--no-check-certificates', '--newline',
               '-x', '--audio-format', 'mp3', '--audio-quality', '0',
               '--ffmpeg-location', FFMPEG,
               '-o', out, url]
    else:
        cmd = [YTDLP, '--no-check-certificates', '--newline',
               '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
               '--merge-output-format', 'mp4',
               '--ffmpeg-location', FFMPEG,
               '-o', out, url]

    if is_playlist:
        cmd += ['--yes-playlist']

    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, creationflags=0x08000000)
        for line in proc.stdout:
            m = re.search(r'\[download\]\s+([\d.]+)%.*?at\s+([\d.]+\w+/s).*?ETA\s+(\S+)', line)
            if m:
                jobs[job_id]['percent'] = float(m.group(1))
                jobs[job_id]['speed'] = m.group(2)
                jobs[job_id]['eta'] = m.group(3)
        proc.wait()
        if proc.returncode == 0:
            jobs[job_id]['done'] = True
        else:
            jobs[job_id]['error'] = 'שגיאה בהורדה'
    except Exception as e:
        jobs[job_id]['error'] = str(e)

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def send_cors(self, code=200):
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_cors()

    def do_GET(self):
        if self.path.startswith('/progress'):
            job_id = self.path.split('?id=')[-1]
            job = jobs.get(job_id, {})
            self.send_cors()
            self.wfile.write(json.dumps(job).encode())
        else:
            self.send_cors(404)
            self.wfile.write(b'{}')

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            url = body.get('url', '')
            fmt = body.get('format', 'mp4')
            job_id = str(uuid.uuid4())
            jobs[job_id] = {'percent': 0, 'speed': '', 'eta': '', 'done': False, 'error': None}
            threading.Thread(target=run_download, args=(job_id, url, fmt), daemon=True).start()
            self.send_cors()
            self.wfile.write(json.dumps({'ok': True, 'job_id': job_id}).encode())
        except Exception as e:
            self.send_cors(500)
            self.wfile.write(json.dumps({'ok': False, 'error': str(e)}).encode())

if __name__ == '__main__':
    if already_running():
        sys.exit(0)
    server = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
    server.serve_forever()
