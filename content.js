function getVideoUrl() { return window.location.href; }
function getTitle() { return document.title.replace(' - YouTube','').replace(/[\\/:*?"<>|]/g,'_').trim(); }

function showNotification(msg, color) {
  document.querySelectorAll('.nf-notif').forEach(n => n.remove());
  const n = document.createElement('div');
  n.className = 'nf-notif';
  n.textContent = msg;
  Object.assign(n.style, {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    background: color || '#222', color: '#fff', padding: '10px 22px',
    borderRadius: '8px', zIndex: 99999, fontSize: '14px',
    fontFamily: 'Arial, sans-serif', direction: 'rtl',
    boxShadow: '0 2px 12px rgba(0,0,0,0.5)', whiteSpace: 'nowrap'
  });
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 5000);
}

function createBtn(label, color, format) {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    background: color, color: '#fff', border: 'none', borderRadius: '18px',
    padding: '6px 14px', cursor: 'pointer', fontSize: '13px',
    fontWeight: '600', marginLeft: '6px', fontFamily: 'inherit'
  });
  btn.onclick = async () => {
    const orig = btn.textContent;
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.textContent = '⏳...';
    showNotification('מוריד... זה יכול לקחת כמה שניות', '#555');

    const res = await new Promise(resolve =>
      chrome.runtime.sendMessage({
        type: 'download',
        url: getVideoUrl(),
        format,
        title: getTitle()
      }, resolve)
    );

    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = orig;

    if (res?.ok) {
      showNotification('✓ ההורדה הושלמה — בתיקיית Downloads', '#1a7a1a');
    } else {
      const msg = res?.error || '';
      if (msg.includes('host') || msg.includes('connect') || msg.includes('native')) {
        showNotification('⚠ צריך להריץ את קובץ ההתקנה קודם', '#e65100');
      } else {
        showNotification('שגיאה: ' + msg, '#cc0000');
      }
    }
  };
  return btn;
}

function addButtons() {
  if (document.getElementById('nf-dl-wrap')) return;
  const bar = document.querySelector('#actions-inner #menu');
  if (!bar) return;

  const wrap = document.createElement('div');
  wrap.id = 'nf-dl-wrap';
  wrap.style.cssText = 'display:flex;align-items:center;margin-left:8px;';
  wrap.appendChild(createBtn('⬇ MP4', '#cc0000', 'mp4'));
  wrap.appendChild(createBtn('⬇ MP3', '#1a73e8', 'mp3'));
  bar.prepend(wrap);
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    document.getElementById('nf-dl-wrap')?.remove();
    setTimeout(addButtons, 2000);
  }
}).observe(document.body, { childList: true, subtree: true });

setTimeout(addButtons, 2000);
