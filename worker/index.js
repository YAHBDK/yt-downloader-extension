const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let videoId;
    try {
      const body = await request.json();
      videoId = body.videoId;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS });
    }

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Missing videoId' }), { status: 400, headers: CORS });
    }

    try {
      const ytRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11)',
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '19.09.37',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '19.09.37',
              androidSdkVersion: 30,
              hl: 'he',
            },
          },
        }),
      });

      const data = await ytRes.json();

      const title = (data.videoDetails?.title || 'video').replace(/[\\/:*?"<>|]/g, '_');
      const formats = data.streamingData?.formats || [];
      const adaptive = data.streamingData?.adaptiveFormats || [];

      const video = formats
        .filter(f => f.url && f.mimeType?.includes('video/mp4'))
        .sort((a, b) => (b.height || 0) - (a.height || 0))[0];

      const audio = adaptive
        .filter(f => f.url && f.mimeType?.includes('audio/mp4'))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

      if (!video && !audio) {
        return new Response(JSON.stringify({ error: 'No streams found' }), { status: 404, headers: CORS });
      }

      return new Response(JSON.stringify({
        title,
        video: video ? { url: video.url, quality: video.qualityLabel } : null,
        audio: audio ? { url: audio.url, bitrate: audio.bitrate } : null,
      }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  },
};
