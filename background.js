const SERVER = 'http://127.0.0.1:9797';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'download') return;

  fetch(SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: msg.url, format: msg.format }),
  })
    .then(r => r.json())
    .then(data => sendResponse(data))
    .catch(e => sendResponse({ ok: false, error: e.message }));

  return true;
});
