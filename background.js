const SERVER = 'http://127.0.0.1:9797';

function showNotif(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'notify') {
    showNotif(msg.title, msg.message);
    return;
  }
  if (msg.type !== 'download') return;

  fetch(SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: msg.url, format: msg.format, quality: msg.quality }),
  })
    .then(r => r.json())
    .then(data => sendResponse(data))
    .catch(e => sendResponse({ ok: false, error: e.message }));

  return true;
});
