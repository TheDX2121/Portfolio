import { DATA } from "./data.js";
import { saveData } from "./data.js";

export function esc(s) {
  return (s || '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function mediaTag(url, { muted = true, loop = true, autoplay = true, controls = false, poster = '' } = {}) {
  if (!url) return '';
  const isVideo = /\.(mp4|webm|mov)($|\?)/i.test(url) || url.startsWith('data:video') || url.includes('/video/upload/');
  if (isVideo) {
    return `<video ${autoplay ? 'autoplay' : ''} ${muted ? 'muted' : ''} ${loop ? 'loop' : ''} ${controls ? 'controls' : ''} playsinline ${poster ? `poster="${esc(poster)}"` : ''}><source src="${esc(url)}"></video>`;
  }
  return `<img src="${esc(url)}" alt="">`;
}

export function platformIcon(platform) {
  const map = {
    instagram: 'instagram', x: 'twitter', twitter: 'twitter', facebook: 'facebook', youtube: 'youtube', linkedin: 'linkedin',
    github: 'github', pinterest: 'link', tiktok: 'music', discord: 'message-circle', telegram: 'send', website: 'globe',
    behance: 'link', dribbble: 'link', vimeo: 'link', snapchat: 'link', threads: 'link'
  };
  return map[(platform || '').toLowerCase()] || 'link';
}

export function detectPlatform(url) {
  url = (url || '').toLowerCase();
  const pairs = [
    ['instagram.com', 'Instagram'], ['snapchat.com', 'Snapchat'], ['x.com', 'X'], ['twitter.com', 'X'],
    ['facebook.com', 'Facebook'], ['threads.net', 'Threads'], ['youtube.com', 'YouTube'], ['youtu.be', 'YouTube'],
    ['linkedin.com', 'LinkedIn'], ['behance.net', 'Behance'], ['dribbble.com', 'Dribbble'], ['vimeo.com', 'Vimeo'],
    ['tiktok.com', 'TikTok'], ['discord.gg', 'Discord'], ['discord.com', 'Discord'], ['t.me', 'Telegram'], ['telegram.me', 'Telegram'],
    ['pinterest.com', 'Pinterest'], ['github.com', 'GitHub']
  ];
  for (const [k, v] of pairs) if (url.includes(k)) return v;
  return url ? 'Website' : '';
}

function closeMobileNav() {
  document.getElementById('main-nav').classList.remove('open');
  document.getElementById('menu-label').textContent = 'MENU';
}

function renderNav() {
  const items = [...DATA.nav].filter(n => n.visible).sort((a, b) => a.order - b.order);
  document.getElementById('main-nav').innerHTML = items.map(i => `<a href="#${i.id}" onclick="closeMobileNav()">${esc(i.label)}</a>`).join('');
}

function renderHero() {
  const h = DATA.hero;
  document.getElementById('hero-label').textContent = h.ariesLabel || '𝚂𝚊𝚖𝚞𝚎𝚕~';
  document.getElementById('hero-name').textContent = h.name || '';
  document.getElementById('hero-profession').textContent = h.profession || '';
  document.getElementById('hero-desc').textContent = h.description || '';
  document.getElementById('hero').classList.toggle('hidden', h.visible === false);
  const mediaEl = document.getElementById('hero-media');
  if (h.mediaType === 'video' && h.mediaUrl) {
    mediaEl.innerHTML = `<video autoplay muted loop playsinline ${h.poster ? `poster="${esc(h.poster)}"` : ''}><source src="${esc(h.mediaUrl)}"></video>`;
  } else if (h.mediaType === 'image' && h.mediaUrl) {
    mediaEl.innerHTML = `<img src="${esc(h.mediaUrl)}" alt="">`;
  } else { mediaEl.innerHTML = ''; }

  const cur = DATA.currentProject;
  const wrap = document.getElementById('hero-working');
  if (cur && cur.visible && cur.name) {
    wrap.classList.remove('hidden');
    document.getElementById('hero-working-val').textContent = cur.name;
  } else wrap.classList.add('hidden');
}

function renderInfo() {
  document.getElementById('info-text').innerHTML = `<p>${esc(DATA.info.text).replace(/\n\n/g, '</p><p>')}</p>`;
  document.getElementById('skills-list').innerHTML = (DATA.info.skills || []).map(s => `<span>${esc(s)}</span>`).join('');
  const photoWrap = document.getElementById('info-photo-wrap');
  const photoUrl = DATA.info.photo;
  if (photoUrl) {
    document.getElementById('info-photo').innerHTML = mediaTag(photoUrl, { controls: false, autoplay: true });
    photoWrap.classList.remove('hidden');
  } else {
    photoWrap.classList.add('hidden');
    document.getElementById('info-photo').innerHTML = '';
  }
}

let activeFilter = 'ALL';
function renderWork() {
  const visible = DATA.work.filter(w => w.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const cats = ['ALL', ...new Set(visible.map(w => w.category).filter(Boolean))];
  document.getElementById('work-filters').innerHTML = cats.map(c => `<button data-cat="${esc(c)}" class="${c === activeFilter ? 'active' : ''}">${esc(c)}</button>`).join('');
  document.querySelectorAll('#work-filters button').forEach(b => b.onclick = () => { activeFilter = b.dataset.cat; renderWork(); });

  const filtered = activeFilter === 'ALL' ? visible : visible.filter(w => w.category === activeFilter);
  const grid = document.getElementById('work-grid');
  document.getElementById('work').classList.toggle('hidden', DATA.work.length === 0);
  if (!filtered.length) { grid.innerHTML = `<p class="empty-note">No projects published yet.</p>`; return; }
  grid.innerHTML = filtered.map(w => `
    <div class="work-card ${w.featured ? 'featured' : ''}" onclick="openProject('${w.id}')">
      ${mediaTag(w.cover || w.video)}
      <div class="overlay"><div class="cat">${esc(w.category || '')}</div><div class="ttl">${esc(w.title)}</div><div class="yr">${esc(w.year || '')}</div></div>
    </div>`).join('');
}

function openProject(id) {
  const w = DATA.work.find(x => x.id === id); if (!w) return;
  document.getElementById('pm-hero').innerHTML = mediaTag(w.video || w.cover, { controls: !!w.video });
  document.getElementById('pm-cat').textContent = w.category || '';
  document.getElementById('pm-title').textContent = w.title || '';
  document.getElementById('pm-year').textContent = w.year || '';
  document.getElementById('pm-desc').textContent = w.description || '';
  document.getElementById('pm-gallery').innerHTML = (w.gallery || []).map(g => mediaTag(g)).join('');
  const linkEl = document.getElementById('pm-link');
  if (w.link) { linkEl.classList.remove('hidden'); linkEl.href = w.link; } else linkEl.classList.add('hidden');
  document.getElementById('project-modal').classList.add('open');
  document.body.classList.add('no-scroll');
}
function closeProject() {
  document.getElementById('project-modal').classList.remove('open');
  document.body.classList.remove('no-scroll');
  document.querySelectorAll('#pm-hero video').forEach(v => v.pause());
}

function renderCollabs() {
  const visible = DATA.collabs.filter(c => c.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  document.getElementById('collabs').classList.toggle('hidden', visible.length === 0);
  document.getElementById('collab-list').innerHTML = visible.map(c => `
    <div class="collab-row">
      ${c.logo ? `<img class="logo" src="${esc(c.logo)}" alt="">` : '<div></div>'}
      <div><div class="name">${esc(c.name)}</div><div class="role">${esc(c.role || '')} ${c.year ? '· ' + esc(c.year) : ''}</div></div>
      <div class="desc">${esc(c.description || '')}</div>
    </div>`).join('');
}

let expOpenId = null;
function renderExperiences() {
  const visible = DATA.experiences.filter(e => e.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  document.getElementById('workinfo').classList.toggle('hidden', visible.length === 0);
  document.getElementById('exp-list').innerHTML = visible.map(e => `
    <div class="exp-item ${expOpenId === e.id ? 'open' : ''}" id="exp-${e.id}">
      <div class="exp-head" onclick="toggleExp('${e.id}')">
        <div><h3>${esc(e.company)}</h3><div class="role">${esc(e.role || '')}</div></div>
        <i data-lucide="plus"></i>
      </div>
      <div class="exp-body"><div class="exp-body-inner">
        ${e.experience ? `<div class="exp-block"><h4>Experience</h4><p>${esc(e.experience)}</p></div>` : ''}
        ${e.about ? `<div class="exp-block"><h4>About The Work</h4><p>${esc(e.about)}</p></div>` : ''}
        ${e.myRole ? `<div class="exp-block"><h4>My Role</h4><p>${esc(e.myRole)}</p></div>` : ''}
        ${e.workedOn ? `<div class="exp-block"><h4>What I Worked On</h4><p>${esc(e.workedOn)}</p></div>` : ''}
        ${e.process ? `<div class="exp-block"><h4>Creative Process</h4><p>${esc(e.process)}</p></div>` : ''}
        ${e.tools ? `<div class="exp-block"><h4>Tools</h4><p>${esc(e.tools)}</p></div>` : ''}
        ${(e.gallery && e.gallery.length) ? `<div class="exp-gallery">${e.gallery.map(g => mediaTag(g)).join('')}</div>` : ''}
      </div></div>
    </div>`).join('');
  window.lucide && window.lucide.createIcons();
}
function toggleExp(id) { expOpenId = expOpenId === id ? null : id; renderExperiences(); }

/* ---- launch / countdown / fireworks ---- */
let countdownInterval = null;
function renderLaunch() {
  const l = DATA.launch;
  const section = document.getElementById('launch');
  if (!l.enabled || !l.launchDate) { section.classList.add('hidden'); if (countdownInterval) clearInterval(countdownInterval); return; }
  section.classList.remove('hidden');
  document.getElementById('launch-project-name').textContent = l.projectName || '';
  document.getElementById('launch-cover').innerHTML = mediaTag(l.video || l.cover);
  const target = new Date(l.launchDate).getTime();

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      clearInterval(countdownInterval);
      document.getElementById('countdown-wrap').style.display = 'none';
      showLaunchComplete();
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('cd-d').textContent = String(d).padStart(2, '0');
    document.getElementById('cd-h').textContent = String(h).padStart(2, '0');
    document.getElementById('cd-m').textContent = String(m).padStart(2, '0');
    document.getElementById('cd-s').textContent = String(s).padStart(2, '0');
  }
  document.getElementById('countdown-wrap').style.display = '';
  document.getElementById('launch-complete').style.display = 'none';
  if (countdownInterval) clearInterval(countdownInterval);
  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function showLaunchComplete() {
  const l = DATA.launch;
  document.getElementById('launch-complete').style.display = 'block';
  document.getElementById('lc-name').textContent = l.projectName || '';
  const btn = document.getElementById('lc-link');
  if (l.destination) { btn.href = l.destination; btn.classList.remove('hidden'); } else btn.classList.add('hidden');
  btn.innerHTML = `${esc(l.buttonText || 'View Project')} <span>→</span>`;
  if (l.fireworks && !l.launchedFlagShown) {
    runFireworks(l.fireworksDuration || 6);
    DATA.launch.launchedFlagShown = true;
    if (!window.__inAdmin) {
      try { await saveData(DATA); } catch (e) { /* non-fatal — visitor may lack write access, which is expected */ }
    }
  }
}

function runFireworks(durationSec) {
  const canvas = document.getElementById('fireworks-canvas');
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  let particles = [];
  const colors = ['#D8CBB0', '#F2F0EB', '#9A9A9A', '#ffffff'];
  function burst(x, y) {
    for (let i = 0; i < 46; i++) {
      const a = (Math.PI * 2 * i) / 46, sp = 2 + Math.random() * 4;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: colors[Math.floor(Math.random() * colors.length)] });
    }
  }
  let running = true;
  const spawner = setInterval(() => { if (running) burst(canvas.width * (0.2 + Math.random() * 0.6), canvas.height * (0.2 + Math.random() * 0.4)); }, 550);
  function frame() {
    ctx.fillStyle = 'rgba(8,8,8,0.18)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life -= 0.012;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    });
    particles = particles.filter(p => p.life > 0);
    ctx.globalAlpha = 1;
    if (running || particles.length) requestAnimationFrame(frame);
    else { canvas.style.display = 'none'; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  frame();
  setTimeout(() => { running = false; clearInterval(spawner); }, durationSec * 1000);
}

function renderCurrent() {
  const c = DATA.currentProject;
  const section = document.getElementById('current');
  if (!c.visible || !c.name) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  document.getElementById('current-media').innerHTML = mediaTag(c.video || c.cover);
  document.getElementById('current-status').textContent = c.status || 'IN PROGRESS';
  document.getElementById('current-title').textContent = c.name;
  document.getElementById('current-desc').textContent = c.description || '';
  document.getElementById('current-progress').style.width = (c.progress || 0) + '%';
  document.getElementById('current-progress-val').textContent = (c.progress || 0) + '%';
  document.getElementById('current-expected').textContent = c.expectedLaunch ? ('Expected — ' + c.expectedLaunch) : '';
}

function renderContactFooter() {
  document.getElementById('email-link').textContent = DATA.email || 'hello@example.com';
  document.getElementById('email-link').href = DATA.email ? `mailto:${DATA.email}` : '#';
  document.getElementById('contact').classList.toggle('hidden', !DATA.email);
  const visible = DATA.social.filter(s => s.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  document.getElementById('footer-social').innerHTML = visible.map(s => {
    if (s.icon) return `<a href="${esc(s.url)}" target="_blank" title="${esc(s.platform)}"><img src="${esc(s.icon)}" alt=""></a>`;
    return `<a href="${esc(s.url)}" target="_blank" title="${esc(s.platform)}"><i data-lucide="${platformIcon(s.platform)}" style="width:16px;height:16px"></i></a>`;
  }).join('');
  window.lucide && window.lucide.createIcons();
}

// A single, persistent scroll observer for all '.reveal' elements
// (used by section fade-ins and the Info photo's ink reveal). It isn't
// activated until the loading screen has actually finished hiding
// (see activateReveals(), called from main.js) — otherwise elements
// that are already on-screen at boot would finish their transition
// behind the loader and never be visibly seen. New elements from later
// re-renders (e.g. live Firestore updates) are picked up automatically.
let revealObserver = null;
let pendingRevealEls = [];

function setupReveals() {
  const els = Array.from(document.querySelectorAll('.reveal:not(.reveal-observed)'));
  if (!els.length) return;
  els.forEach(el => el.classList.add('reveal-observed'));
  if (revealObserver) {
    els.forEach(el => revealObserver.observe(el));
  } else {
    pendingRevealEls.push(...els);
  }
}

/** Call once, after the loading screen has fully hidden. */
export function activateReveals() {
  if (revealObserver) return;
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
  }, { threshold: .15 });
  pendingRevealEls.forEach(el => revealObserver.observe(el));
  pendingRevealEls = [];
}

/* ---- background music ---- */
const MUSIC_MUTE_KEY = 'aries-music-muted';
let musicFadeTimer = null;
let musicListenersAttached = false;

function isMusicMuted() {
  return localStorage.getItem(MUSIC_MUTE_KEY) === '1';
}
function setMusicMuted(muted) {
  localStorage.setItem(MUSIC_MUTE_KEY, muted ? '1' : '0');
}
function updateMusicIcon(muted) {
  const icon = document.getElementById('music-icon');
  if (!icon) return;
  icon.setAttribute('data-lucide', muted ? 'volume-x' : 'volume-2');
  window.lucide && window.lucide.createIcons();
}
function fadeMusicIn(audio, targetVolume) {
  clearInterval(musicFadeTimer);
  const steps = 40, durationMs = 4000, stepTime = durationMs / steps;
  let i = 0;
  audio.volume = 0;
  musicFadeTimer = setInterval(() => {
    i++;
    audio.volume = Math.min(targetVolume, (targetVolume * i) / steps);
    if (i >= steps) clearInterval(musicFadeTimer);
  }, stepTime);
}
function attemptMusicPlay(audio, targetVolume) {
  audio.play().then(() => fadeMusicIn(audio, targetVolume)).catch(() => {
    // Most browsers block audio-with-sound autoplay until the visitor
    // interacts with the page at least once — start it on their first
    // click/tap/keypress instead, still with the same fade-in.
    if (musicListenersAttached) return;
    musicListenersAttached = true;
    const resume = () => {
      if (isMusicMuted()) return;
      audio.play().then(() => fadeMusicIn(audio, targetVolume)).catch(() => {});
    };
    ['click', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, resume, { once: true }));
  });
}
function renderMusic() {
  const m = DATA.music;
  const audio = document.getElementById('bg-music');
  const toggle = document.getElementById('music-toggle');
  if (!m || !m.enabled || !m.url) {
    // Admin has music off — no player, no button, no trace of it.
    toggle.classList.add('hidden');
    audio.pause();
    audio.removeAttribute('src');
    audio.dataset.src = '';
    return;
  }
  toggle.classList.remove('hidden');
  const targetVolume = typeof m.volume === 'number' ? m.volume : 0.5;
  const muted = isMusicMuted();
  updateMusicIcon(muted);
  if (audio.dataset.src !== m.url) {
    audio.src = m.url;
    audio.dataset.src = m.url;
    audio.volume = 0;
  }
  if (muted) { audio.pause(); return; }
  if (audio.paused) attemptMusicPlay(audio, targetVolume);
}
function toggleMusic() {
  const audio = document.getElementById('bg-music');
  const newMuted = !isMusicMuted();
  setMusicMuted(newMuted);
  updateMusicIcon(newMuted);
  if (newMuted) {
    audio.pause();
  } else {
    const targetVolume = DATA.music && typeof DATA.music.volume === 'number' ? DATA.music.volume : 0.5;
    attemptMusicPlay(audio, targetVolume);
  }
}
window.toggleMusic = toggleMusic;

export function renderPublicSite() {
  renderNav(); renderHero(); renderInfo(); renderWork(); renderCollabs();
  renderExperiences(); renderLaunch(); renderCurrent(); renderContactFooter();
  renderMusic();
  document.title = DATA.settings.title || 'ARIES';
  const grainEl = document.querySelector('.grain');
  if (grainEl) grainEl.style.display = DATA.settings.grain === false ? 'none' : 'block';
  setupReveals();
  window.lucide && window.lucide.createIcons();
}

// Expose handlers referenced by inline onclick="" in generated markup.
window.openProject = openProject;
window.closeProject = closeProject;
window.toggleExp = toggleExp;
window.closeMobileNav = closeMobileNav;
