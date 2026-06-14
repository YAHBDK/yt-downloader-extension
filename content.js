function getVideoUrl() { return window.location.href; }
function getTitle() { return document.title.replace(' - YouTube','').replace(/[\\/:*?"<>|]/g,'_').trim(); }

let progressBox = null;

function makeDraggable(el) {
  let dx = 0, dy = 0, x = 0, y = 0;
  el.style.cursor = 'move';
  el.onmousedown = e => {
    e.preventDefault();
    x = e.clientX; y = e.clientY;
    document.onmousemove = e => {
      dx = e.clientX - x; dy = e.clientY - y;
      x = e.clientX; y = e.clientY;
      el.style.left = (el.offsetLeft + dx) + 'px';
      el.style.top = (el.offsetTop + dy) + 'px';
      el.style.transform = 'none';
    };
    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

function showProgress(percent, speed, eta) {
  if (!progressBox) {
    progressBox = document.createElement('div');
    progressBox.id = 'nf-progress-box';
    Object.assign(progressBox.style, {
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#222', color: '#fff', padding: '14px 18px',
      borderRadius: '12px', zIndex: 99999, fontSize: '13px',
      fontFamily: 'Arial, sans-serif', direction: 'rtl',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)', minWidth: '260px'
    });
    progressBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:600">⬇ מוריד...</span>
        <span id="nf-drag-hint" style="font-size:11px;color:#888;cursor:move">✥ גרור</span>
      </div>
      <div style="background:#444;border-radius:6px;height:8px;overflow:hidden;margin-bottom:6px">
        <div id="nf-bar" style="height:100%;background:#1a7a1a;width:0%;transition:width 0.3s"></div>
      </div>
      <div id="nf-info" style="font-size:12px;color:#aaa"></div>
    `;
    makeDraggable(progressBox);
    document.body.appendChild(progressBox);
  }
  const bar = document.getElementById('nf-bar');
  const info = document.getElementById('nf-info');
  if (bar) bar.style.width = percent + '%';
  if (info) info.textContent = `${percent.toFixed(1)}%  •  ${speed}  •  נותר: ${eta}`;
}

function hideProgress(success) {
  if (progressBox) {
    progressBox.remove();
    progressBox = null;
  }
  if (success) {
    showNotification('✓ ההורדה הסתיימה — בתיקיית Downloads', '#1a7a1a');
  }
}

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

function pollProgress(job_id) {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:9797/progress?id=${job_id}`);
      const data = await res.json();
      if (data.error) {
        clearInterval(interval);
        hideProgress(false);
        showNotification('שגיאה: ' + data.error, '#cc0000');
      } else if (data.done) {
        clearInterval(interval);
        hideProgress(true);
      } else if (data.percent > 0) {
        showProgress(data.percent, data.speed, data.eta);
      }
    } catch (e) {
      clearInterval(interval);
    }
  }, 1000);
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
      showNotification('ההורדה החלה...', '#555');
      pollProgress(res.job_id);
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
