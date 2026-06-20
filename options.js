const DEFAULT_SITES = ['youtube.com'];

function loadSites() {
  chrome.storage.sync.get({ sites: DEFAULT_SITES }, ({ sites }) => {
    const list = document.getElementById('sites-list');
    list.innerHTML = '';
    sites.forEach(site => {
      const row = document.createElement('div');
      row.className = 'site-row';
      const span = document.createElement('span');
      span.textContent = site;
      row.appendChild(span);
      if (site !== 'youtube.com') {
        const btn = document.createElement('button');
        btn.className = 'del-btn';
        btn.textContent = 'הסר';
        btn.addEventListener('click', () => removeSite(site));
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
  });
}

function addSite() {
  const input = document.getElementById('new-site');
  let site = input.value.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').replace(/^www\./, '');
  if (!site) return;
  chrome.storage.sync.get({ sites: DEFAULT_SITES }, ({ sites }) => {
    if (!sites.includes(site)) {
      sites.push(site);
      chrome.storage.sync.set({ sites }, () => {
        input.value = '';
        loadSites();
        showSaved();
      });
    }
  });
}

function removeSite(site) {
  chrome.storage.sync.get({ sites: DEFAULT_SITES }, ({ sites }) => {
    chrome.storage.sync.set({ sites: sites.filter(s => s !== site) }, () => {
      loadSites();
      showSaved();
    });
  });
}

function showSaved() {
  const msg = document.getElementById('saved-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2000);
}

document.getElementById('add-btn').addEventListener('click', addSite);
document.getElementById('new-site').addEventListener('keydown', e => {
  if (e.key === 'Enter') addSite();
});

loadSites();
