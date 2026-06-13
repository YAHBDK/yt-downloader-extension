"""
שרת הורדות מקומי — רץ בשקט ברקע
מאזין על localhost:9797
"""
import http.server, json, subprocess, os, sys, threading, socket

PORT = 9797
BASE = os.path.dirname(os.path.abspath(sys.argv[0]))
YTDLP = os.path.join(BASE, 'yt-dlp.exe')
FFMPEG = BASE
DOWNLOADS = os.path.join(os.path.expanduser('~'), 'Downloads')
PROXY = 'http://8.8.8.8:80'

def already_running():
    try:
        s = socket.socket()
        s.bind(('127.0.0.1', PORT))
        s.close()
        return False
    except:
        return True

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args): pass  # ללא לוגים

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            url = body.get('url', '')
            fmt = body.get('format', 'mp4')

            is_playlist = 'list=' in url and 'watch?v=' not in url
            if is_playlist:
                out = os.path.join(DOWNLOADS, '%(playlist_title)s', '%(playlist_index)s - %(title)s.%(ext)s')
            else:
                out = os.path.join(DOWNLOADS, '%(title)s.%(ext)s')

            if fmt == 'mp3':
                cmd = [YTDLP, '--proxy', PROXY, '--no-check-certificates',
                       '-x', '--audio-format', 'mp3', '--audio-quality', '0',
                       '--ffmpeg-location', FFMPEG,
                       '-o', out, url]
            else:
                cmd = [YTDLP, '--proxy', PROXY, '--no-check-certificates',
                       '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                       '--merge-output-format', 'mp4',
                       '--ffmpeg-location', FFMPEG,
                       '-o', out, url]

            if is_playlist:
                cmd += ['--yes-playlist']

            def run():
                subprocess.run(cmd, creationflags=0x08000000, timeout=600)

            threading.Thread(target=run, daemon=True).start()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': False, 'error': str(e)}).encode())

if __name__ == '__main__':
    if already_running():
        sys.exit(0)
    server = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
    server.serve_forever()
