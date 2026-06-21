function getVideoUrl() { return window.location.href; }
function getTitle() { return document.title.replace(' - YouTube','').replace(/[\\/:*?"<>|]/g,'_').trim(); }

let progressBox = null;

function makeDraggable(el, handle) {
  let x = 0, y = 0;
  handle.style.cursor = 'move';
  handle.onmousedown = e => {
    e.preventDefault();
    x = e.clientX; y = e.clientY;
    document.onmousemove = e => {
      const dx = e.clientX - x; const dy = e.clientY - y;
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
        <div style="display:flex;gap:8px;align-items:center">
          <span id="nf-drag-hint" style="font-size:11px;color:#888;cursor:move">✥ גרור</span>
          <span id="nf-stop-btn" style="font-size:12px;color:#ff5555;cursor:pointer;font-weight:600">✕ עצור</span>
        </div>
      </div>
      <div style="background:#444;border-radius:6px;height:8px;overflow:hidden;margin-bottom:6px">
        <div id="nf-bar" style="height:100%;background:#1a7a1a;width:0%;transition:width 0.3s"></div>
      </div>
      <div id="nf-info" style="font-size:12px;color:#aaa"></div>
    `;
    const dragHandle = progressBox.querySelector('#nf-drag-hint');
    makeDraggable(progressBox, dragHandle);
    document.body.appendChild(progressBox);
    progressBox.querySelector('#nf-stop-btn').addEventListener('click', () => {
      if (progressBox._stopFn) progressBox._stopFn();
    });
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
  const stopFn = async () => {
    await fetch(`http://127.0.0.1:9797/stop?id=${job_id}`);
    hideProgress(false);
    showNotification('ההורדה בוטלה', '#888');
  };
  if (progressBox) progressBox._stopFn = stopFn;
  else setTimeout(() => { if (progressBox) progressBox._stopFn = stopFn; }, 200);

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
        chrome.runtime.sendMessage({ type: 'notify', title: '✓ ההורדה הסתיימה', message: 'הקובץ נשמר בתיקיית Downloads' });
      } else if (data.percent > 0) {
        showProgress(data.percent, data.speed, data.eta);
      }
    } catch (e) {
      clearInterval(interval);
    }
  }, 1000);
}

async function startDownload(url, format, quality) {
  showProgress(0, '', '');
  const res = await new Promise(resolve =>
    chrome.runtime.sendMessage({ type: 'download', url, format, quality, title: getTitle() }, resolve)
  );
  if (res?.ok) {
    showNotification('ההורדה החלה...', '#555');
    pollProgress(res.job_id);
  } else {
    hideProgress(false);
    const msg = res?.error || '';
    if (msg.includes('host') || msg.includes('connect') || msg.includes('native')) {
      showNotification('⚠ צריך להריץ את קובץ ההתקנה קודם', '#e65100');
    } else {
      showNotification('שגיאה: ' + msg, '#cc0000');
    }
  }
}

function createBtn(label, color, format) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:inline-block;margin-left:6px;';

  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    background: color, color: '#fff', border: 'none', borderRadius: '20px',
    padding: '7px 16px', cursor: 'pointer', fontSize: '13px',
    fontWeight: '600', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: '5px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
  });

  const menu = document.createElement('div');
  Object.assign(menu.style, {
    display: 'none', position: 'absolute', top: '110%', left: '0',
    background: '#222', borderRadius: '10px', zIndex: 99999,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: '110px'
  });

  const options = format === 'mp4'
    ? [['🏆 הכי טוב', 'best'], ['🖥 1080p', '1080'], ['📺 720p', '720'], ['📱 480p', '480']]
    : format === '3gp'
    ? [['📱 3GP לפלאפון', 'best']]
    : [['🎵 MP3', 'best']];

  options.forEach(([lbl, quality]) => {
    const item = document.createElement('div');
    item.textContent = lbl;
    Object.assign(item.style, {
      padding: '8px 14px', cursor: 'pointer', color: '#fff',
      fontSize: '13px', fontFamily: 'Arial', direction: 'rtl'
    });
    item.onmouseenter = () => item.style.background = '#444';
    item.onmouseleave = () => item.style.background = '';
    item.onclick = e => {
      e.stopPropagation();
      menu.style.display = 'none';
      startDownload(getVideoUrl(), format, quality);
    };
    menu.appendChild(item);
  });

  btn.onclick = e => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  };

  document.addEventListener('click', () => menu.style.display = 'none');

  wrap.appendChild(btn);
  wrap.appendChild(menu);
  return wrap;
}

function addButtons() {
  if (document.getElementById('nf-dl-wrap')) return;
  const bar = document.querySelector('#actions-inner #menu');
  if (!bar) return;

  const wrap = document.createElement('div');
  wrap.id = 'nf-dl-wrap';
  wrap.style.cssText = 'display:flex;align-items:center;margin-left:8px;';
  wrap.appendChild(createBtn('🎬 MP4 הורד', '#cc0000', 'mp4'));
  wrap.appendChild(createBtn('🎵 MP3 הורד', '#1a73e8', 'mp3'));
  wrap.appendChild(createBtn('📱 3GP הורד', '#6a0dad', '3gp'));
  bar.prepend(wrap);
}

function isAllowedSite(sites) {
  const host = location.hostname.replace(/^www\./, '');
  return sites.some(s => {
    const clean = s.replace(/^www\./, '');
    return host === clean || host.endsWith('.' + clean);
  });
}

function addFloatingBtn() {
  if (document.getElementById('nf-float-btn')) return;
  const btn = document.createElement('div');
  btn.id = 'nf-float-btn';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '80px', left: '16px', zIndex: 99999,
    background: '#cc0000', color: '#fff', borderRadius: '50px',
    padding: '10px 16px', cursor: 'pointer', fontSize: '14px',
    fontFamily: 'Arial', fontWeight: '600', direction: 'rtl',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)', userSelect: 'none'
  });
  btn.textContent = '⬇ הורד';
  btn.onclick = () => {
    const menu = document.getElementById('nf-float-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  };

  const menu = document.createElement('div');
  menu.id = 'nf-float-menu';
  Object.assign(menu.style, {
    display: 'none', position: 'fixed', bottom: '130px', left: '16px',
    zIndex: 99999, background: '#222', borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)', overflow: 'hidden'
  });

  [['🎬 MP4', 'mp4', 'best'], ['🎵 MP3', 'mp3', 'best'],
   ['🖥 1080p', 'mp4', '1080'], ['📺 720p', 'mp4', '720'], ['📱 480p', 'mp4', '480']].forEach(([lbl, fmt, quality]) => {
    const item = document.createElement('div');
    item.textContent = lbl;
    Object.assign(item.style, {
      padding: '10px 18px', cursor: 'pointer', color: '#fff',
      fontSize: '13px', fontFamily: 'Arial', direction: 'rtl', whiteSpace: 'nowrap'
    });
    item.onmouseenter = () => item.style.background = '#444';
    item.onmouseleave = () => item.style.background = '';
    item.onclick = () => {
      menu.style.display = 'none';
      startDownload(getVideoUrl(), fmt, quality);
    };
    menu.appendChild(item);
  });

  document.addEventListener('click', e => {
    if (!btn.contains(e.target)) menu.style.display = 'none';
  });

  document.body.appendChild(btn);
  document.body.appendChild(menu);
}

function initExtension(allowed) {
  if (!allowed) return;
  const isYoutube = location.hostname.replace('www.', '') === 'youtube.com';
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById('nf-dl-wrap')?.remove();
      if (isYoutube) setTimeout(tryAddButtons, 500);
    }
  }).observe(document.body, { childList: true, subtree: true });
  if (isYoutube) {
    function tryAddButtons() {
      if (document.getElementById('nf-dl-wrap')) return;
      addButtons();
    }
    // נסה מיד ואחר כך המתן לאלמנט
    tryAddButtons();
    new MutationObserver(() => tryAddButtons())
      .observe(document.body, { childList: true, subtree: true });
  } else {
    setTimeout(addFloatingBtn, 1000);
  }
}

const host = location.hostname.replace('www.', '');
if (host === 'youtube.com') {
  initExtension(true);
} else {
  chrome.storage.sync.get({ sites: ['youtube.com'] }, ({ sites }) => {
    initExtension(isAllowedSite(sites));
  });
}
