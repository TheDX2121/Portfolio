import { DATA, uid, loadData, saveData, loginAdmin, logoutAdmin, watchAuth, uploadMedia } from "./data.js";
import { esc, mediaTag, platformIcon, detectPlatform } from "./render-public.js";
import { renderPublicSite } from "./render-public.js";

let DRAFT = null;

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------- auth wiring ---------------- */
export function initAdmin() {
  watchAuth(async (user) => {
    if (user) {
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-app').style.display = 'block';
      DRAFT = JSON.parse(JSON.stringify(DATA));
      renderAllAdminPanels();
      switchPanel('dashboard');
    } else {
      document.getElementById('admin-login').style.display = 'flex';
      document.getElementById('admin-app').style.display = 'none';
    }
  });

  document.getElementById('admin-login-btn').addEventListener('click', doLogin);
  document.getElementById('admin-pass-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('admin-email-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  document.querySelectorAll('#admin-sidebar .nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });
}

async function doLogin() {
  const email = document.getElementById('admin-email-input').value.trim();
  const pass = document.getElementById('admin-pass-input').value;
  const errEl = document.getElementById('admin-login-err');
  errEl.classList.add('hidden');
  try {
    await loginAdmin(email, pass);
  } catch (e) {
    errEl.textContent = 'Sign-in failed — check the email/password, or that this user exists in Firebase Authentication.';
    errEl.classList.remove('hidden');
  }
}
window.adminLogout = () => { logoutAdmin(); window.location.hash = ''; };
window.previewSite = () => { window.location.hash = ''; toast('Previewing live site'); };

async function reloadData() {
  await loadData();
  DRAFT = JSON.parse(JSON.stringify(DATA));
  renderAllAdminPanels();
  toast('Draft reset to last published version');
}
async function publishData() {
  try {
    await saveData(JSON.parse(JSON.stringify(DRAFT)));
    renderPublicSite();
    toast('Published — live site updated');
  } catch (e) {
    toast('Publish failed — check Firestore rules / connection');
    console.error(e);
  }
}
window.reloadData = reloadData;
window.publishData = publishData;

function switchPanel(name) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelectorAll('#admin-sidebar .nav-item[data-panel]').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
  const titles = {
    dashboard: 'Dashboard', hero: 'Hero', info: 'My Info', work: 'Work', workinfo: 'Work Info', collabs: 'Collaborations',
    launch: 'New Launch', current: 'Currently Working On', music: 'Music', media: 'Media Library', contact: 'Email', social: 'Social Links',
    nav: 'Navigation', settings: 'Settings'
  };
  document.getElementById('admin-panel-title').textContent = titles[name] || name;
  document.getElementById('admin-sidebar').classList.remove('open');
  renderPanel(name);
}
window.switchPanel = switchPanel;

function renderAllAdminPanels() { renderPanel('dashboard'); }

/* ---------------- media helpers ---------------- */
window._mediaSetters = {};
window._pendingPickField = null;

function mediaPickerHtml(fieldId, currentUrl) {
  return `
    <div class="field">
      <label>Media</label>
      ${currentUrl ? mediaTag(currentUrl, { controls: true, autoplay: false }) : '<p class="empty-note">No media selected</p>'}
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="file" accept="image/*,video/*" id="${fieldId}-file" style="display:none" onchange="handleMediaUpload('${fieldId}')">
        <button class="btn ghost small" onclick="document.getElementById('${fieldId}-file').click()">Upload</button>
        <button class="btn ghost small" onclick="openLibraryPicker('${fieldId}')">Choose from Library</button>
        ${currentUrl ? `<button class="btn ghost small" onclick="clearField('${fieldId}')">Remove</button>` : ''}
      </div>
    </div>`;
}
async function handleMediaUpload(fieldId) {
  const input = document.getElementById(fieldId + '-file');
  const file = input.files[0]; if (!file) return;
  if (file.size > 25 * 1024 * 1024) { toast('File too large — keep under 25MB'); return; }
  toast('Uploading…');
  try {
    const url = await uploadMedia(file);
    DRAFT.media.unshift({ id: uid(), name: file.name, url, type: file.type.startsWith('video') ? 'video' : 'image', createdAt: Date.now() });
    applyMediaSelection(fieldId, url);
    toast('Uploaded');
  } catch (e) {
    toast('Upload failed — check js/cloudinary-config.js and your Cloudinary upload preset');
    console.error(e);
  }
}
function openLibraryPicker(fieldId) {
  window._pendingPickField = fieldId;
  switchPanel('media');
  toast('Click a media item to select it');
}
function applyMediaSelection(fieldId, url) {
  const setters = window._mediaSetters || {};
  if (setters[fieldId]) setters[fieldId](url);
}
function clearField(fieldId) { applyMediaSelection(fieldId, ''); }
window.handleMediaUpload = handleMediaUpload;
window.openLibraryPicker = openLibraryPicker;
window.clearField = clearField;

/* ---------------- shared list helpers ---------------- */
function updateItem(coll, id, key, val) { const it = DRAFT[coll].find(x => x.id === id); if (it) it[key] = val; }
function deleteItem(coll, id) { DRAFT[coll] = DRAFT[coll].filter(x => x.id !== id); renderPanel(panelForColl(coll)); }
function moveItem(coll, id, dir) {
  const arr = DRAFT[coll]; const i = arr.findIndex(x => x.id === id);
  const j = i + dir; if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  arr.forEach((x, idx) => x.order = idx);
  renderPanel(panelForColl(coll));
}
function panelForColl(coll) { return coll === 'experiences' ? 'workinfo' : coll; }
window.updateItem = updateItem;
window.deleteItem = deleteItem;
window.moveItem = moveItem;

/* ---------------- DASHBOARD ---------------- */
function renderDashboard() {
  const d = DRAFT;
  document.getElementById('panel-dashboard').innerHTML = `
    <div class="dash-grid">
      <div class="dash-stat"><div class="n">${d.work.length}</div><div class="l">Projects</div></div>
      <div class="dash-stat"><div class="n">${d.experiences.length}</div><div class="l">Experiences</div></div>
      <div class="dash-stat"><div class="n">${d.collabs.length}</div><div class="l">Collaborations</div></div>
      <div class="dash-stat"><div class="n">${d.currentProject.visible && d.currentProject.name ? 'Active' : 'None'}</div><div class="l">Current Project</div></div>
      <div class="dash-stat"><div class="n">${d.launch.enabled ? 'Scheduled' : 'Off'}</div><div class="l">New Launch</div></div>
      <div class="dash-stat"><div class="n">${d.social.length}</div><div class="l">Social Links</div></div>
      <div class="dash-stat"><div class="n">${d.music.enabled && d.music.url ? 'On' : 'Off'}</div><div class="l">Background Music</div></div>
    </div>
    <div class="card"><p style="color:var(--text2);font-size:14px;line-height:1.7">Changes you make here are saved to your <strong style="color:var(--text)">draft</strong>. Nothing goes live until you press <strong style="color:var(--text)">Publish</strong> in the top bar. Use <strong style="color:var(--text)">Discard changes</strong> to reset the draft back to the last published version.</p></div>`;
}

/* ---------------- HERO ---------------- */
function renderHeroPanel() {
  const h = DRAFT.hero;
  window._mediaSetters['hero-media'] = (url) => { h.mediaUrl = url; h.mediaType = url ? (/video|\.mp4|\.webm/.test(url) ? 'video' : 'image') : 'none'; renderPanel('hero'); };
  document.getElementById('panel-hero').innerHTML = `
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Name</label><input value="${esc(h.name)}" oninput="DRAFT_hero('name',this.value)"></div>
        <div class="field"><label>SamuelLabel</label><input value="${esc(h.samuelLabel || '')}" oninput="DRAFT_hero('samuelLabel',this.value)"></div>

      </div>
      <div class="field"><label>Profession</label><input value="${esc(h.profession)}" oninput="DRAFT_hero('profession',this.value)"></div>
      <div class="field"><label>Description</label><textarea rows="3" oninput="DRAFT_hero('description',this.value)">${esc(h.description)}</textarea></div>
      ${mediaPickerHtml('hero-media', h.mediaUrl)}
      <div class="field-row">
        <div class="checkbox-row"><input type="checkbox" ${h.autoplay ? 'checked' : ''} onchange="DRAFT_hero('autoplay',this.checked)"><label style="margin:0">Autoplay</label></div>
        <div class="checkbox-row"><input type="checkbox" ${h.muted ? 'checked' : ''} onchange="DRAFT_hero('muted',this.checked)"><label style="margin:0">Muted</label></div>
        <div class="checkbox-row"><input type="checkbox" ${h.loop ? 'checked' : ''} onchange="DRAFT_hero('loop',this.checked)"><label style="margin:0">Loop</label></div>
        <div class="checkbox-row"><input type="checkbox" ${h.visible !== false ? 'checked' : ''} onchange="DRAFT_hero('visible',this.checked)"><label style="margin:0">Visible</label></div>
      </div>
    </div>`;
}
window.DRAFT_hero = (k, v) => { DRAFT.hero[k] = v; };

/* ---------------- INFO ---------------- */
function renderInfoPanel() {
  const info = DRAFT.info;
  window._mediaSetters['info-photo'] = (url) => { info.photo = url; renderPanel('info'); };
  document.getElementById('panel-info').innerHTML = `
    <div class="card">
      <div class="field"><label>About text</label><textarea rows="5" oninput="DRAFT_info('text',this.value)">${esc(info.text)}</textarea></div>
      <div class="field"><label>Skills (comma separated)</label><input value="${esc(info.skills.join(', '))}" oninput="DRAFT_infoSkills(this.value)"></div>
      ${mediaPickerHtml('info-photo', info.photo)}
      <p class="empty-note">This photo/video appears next to your About text, with a cinematic reveal animation on scroll.</p>
    </div>`;
}
window.DRAFT_info = (k, v) => { DRAFT.info[k] = v; };
window.DRAFT_infoSkills = (v) => { DRAFT.info.skills = v.split(',').map(s => s.trim()).filter(Boolean); };

/* ---------------- WORK ---------------- */
function renderWorkPanel() {
  const items = DRAFT.work;
  document.getElementById('panel-work').innerHTML = `
    <button class="btn" onclick="addWork()"><i data-lucide="plus" style="width:14px;height:14px"></i> Add Project</button>
    <div style="margin-top:20px">${items.length ? items.map(w => workCardHtml(w)).join('') : '<p class="empty-note">No projects yet.</p>'}</div>`;
  items.forEach(w => {
    window._mediaSetters['work-cover-' + w.id] = (url) => { w.cover = url; renderPanel('work'); };
    window._mediaSetters['work-video-' + w.id] = (url) => { w.video = url; renderPanel('work'); };
  });
  window.lucide && window.lucide.createIcons();
}
function workCardHtml(w) {
  return `<div class="card">
    <div class="card-head"><strong>${esc(w.title) || 'Untitled project'}</strong>
      <div class="item-actions">
        <button title="Move up" onclick="moveItem('work','${w.id}',-1)"><i data-lucide="arrow-up" style="width:16px;height:16px"></i></button>
        <button title="Move down" onclick="moveItem('work','${w.id}',1)"><i data-lucide="arrow-down" style="width:16px;height:16px"></i></button>
        <button title="Delete" onclick="deleteItem('work','${w.id}')"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Title</label><input value="${esc(w.title)}" oninput="updateItem('work','${w.id}','title',this.value)"></div>
      <div class="field"><label>Category</label><input value="${esc(w.category)}" oninput="updateItem('work','${w.id}','category',this.value)" placeholder="VIDEO / VERTICAL / HORIZONTAL / POSTERS / AI / THUMBNAILS"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Year</label><input value="${esc(w.year)}" oninput="updateItem('work','${w.id}','year',this.value)"></div>
      <div class="field"><label>External Link</label><input value="${esc(w.link)}" oninput="updateItem('work','${w.id}','link',this.value)"></div>
    </div>
    <div class="field"><label>Description</label><textarea rows="2" oninput="updateItem('work','${w.id}','description',this.value)">${esc(w.description)}</textarea></div>
    ${mediaPickerHtml('work-cover-' + w.id, w.cover)}
    ${mediaPickerHtml('work-video-' + w.id, w.video)}
    <div class="field-row" style="margin-top:6px">
      <div class="checkbox-row"><input type="checkbox" ${w.featured ? 'checked' : ''} onchange="updateItem('work','${w.id}','featured',this.checked)"><label style="margin:0">Featured</label></div>
      <div class="checkbox-row"><input type="checkbox" ${w.visible !== false ? 'checked' : ''} onchange="updateItem('work','${w.id}','visible',this.checked)"><label style="margin:0">Visible</label></div>
    </div>
  </div>`;
}
window.addWork = () => {
  DRAFT.work.unshift({ id: uid(), title: 'New Project', category: 'VIDEO', year: '2026', description: '', cover: '', video: '', gallery: [], link: '', featured: false, visible: true, order: DRAFT.work.length });
  renderPanel('work');
};

/* ---------------- WORK INFO / EXPERIENCES ---------------- */
function renderWorkInfoPanel() {
  const items = DRAFT.experiences;
  document.getElementById('panel-workinfo').innerHTML = `
    <button class="btn" onclick="addExperience()"><i data-lucide="plus" style="width:14px;height:14px"></i> Add Experience</button>
    <div style="margin-top:20px">${items.length ? items.map(e => expCardHtml(e)).join('') : '<p class="empty-note">No experiences yet.</p>'}</div>`;
  window.lucide && window.lucide.createIcons();
}
function expCardHtml(e) {
  return `<div class="card">
    <div class="card-head"><strong>${esc(e.company) || 'Untitled'}</strong>
      <div class="item-actions">
        <button onclick="moveItem('experiences','${e.id}',-1)"><i data-lucide="arrow-up" style="width:16px;height:16px"></i></button>
        <button onclick="moveItem('experiences','${e.id}',1)"><i data-lucide="arrow-down" style="width:16px;height:16px"></i></button>
        <button onclick="deleteItem('experiences','${e.id}')"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Company / Client</label><input value="${esc(e.company)}" oninput="updateItem('experiences','${e.id}','company',this.value)"></div>
      <div class="field"><label>Role</label><input value="${esc(e.role)}" oninput="updateItem('experiences','${e.id}','role',this.value)"></div>
    </div>
    <div class="field"><label>Experience</label><textarea rows="2" oninput="updateItem('experiences','${e.id}','experience',this.value)">${esc(e.experience)}</textarea></div>
    <div class="field"><label>About The Work</label><textarea rows="2" oninput="updateItem('experiences','${e.id}','about',this.value)">${esc(e.about)}</textarea></div>
    <div class="field"><label>My Role</label><textarea rows="2" oninput="updateItem('experiences','${e.id}','myRole',this.value)">${esc(e.myRole)}</textarea></div>
    <div class="field"><label>What I Worked On</label><textarea rows="2" oninput="updateItem('experiences','${e.id}','workedOn',this.value)">${esc(e.workedOn)}</textarea></div>
    <div class="field"><label>Creative Process</label><textarea rows="2" oninput="updateItem('experiences','${e.id}','process',this.value)">${esc(e.process)}</textarea></div>
    <div class="field"><label>Tools</label><input value="${esc(e.tools)}" oninput="updateItem('experiences','${e.id}','tools',this.value)"></div>
    <div class="checkbox-row"><input type="checkbox" ${e.visible !== false ? 'checked' : ''} onchange="updateItem('experiences','${e.id}','visible',this.checked)"><label style="margin:0">Visible</label></div>
  </div>`;
}
window.addExperience = () => {
  DRAFT.experiences.unshift({ id: uid(), company: 'New Client', role: 'Video Editor', experience: '', about: '', myRole: '', workedOn: '', process: '', tools: '', gallery: [], visible: true, order: DRAFT.experiences.length });
  renderPanel('workinfo');
};

/* ---------------- COLLABS ---------------- */
function renderCollabsPanel() {
  const items = DRAFT.collabs;
  document.getElementById('panel-collabs').innerHTML = `
    <button class="btn" onclick="addCollab()"><i data-lucide="plus" style="width:14px;height:14px"></i> Add Collaboration</button>
    <div style="margin-top:20px">${items.length ? items.map(c => collabCardHtml(c)).join('') : '<p class="empty-note">No collaborations yet.</p>'}</div>`;
  items.forEach(c => { window._mediaSetters['collab-logo-' + c.id] = (url) => { c.logo = url; renderPanel('collabs'); }; });
  window.lucide && window.lucide.createIcons();
}
function collabCardHtml(c) {
  return `<div class="card">
    <div class="card-head"><strong>${esc(c.name) || 'Untitled'}</strong>
      <div class="item-actions">
        <button onclick="moveItem('collabs','${c.id}',-1)"><i data-lucide="arrow-up" style="width:16px;height:16px"></i></button>
        <button onclick="moveItem('collabs','${c.id}',1)"><i data-lucide="arrow-down" style="width:16px;height:16px"></i></button>
        <button onclick="deleteItem('collabs','${c.id}')"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Name</label><input value="${esc(c.name)}" oninput="updateItem('collabs','${c.id}','name',this.value)"></div>
      <div class="field"><label>Role</label><input value="${esc(c.role)}" oninput="updateItem('collabs','${c.id}','role',this.value)"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Year</label><input value="${esc(c.year)}" oninput="updateItem('collabs','${c.id}','year',this.value)"></div>
      <div class="field"><label>Link</label><input value="${esc(c.link)}" oninput="updateItem('collabs','${c.id}','link',this.value)"></div>
    </div>
    <div class="field"><label>Description</label><textarea rows="2" oninput="updateItem('collabs','${c.id}','description',this.value)">${esc(c.description)}</textarea></div>
    ${mediaPickerHtml('collab-logo-' + c.id, c.logo)}
    <div class="checkbox-row"><input type="checkbox" ${c.visible !== false ? 'checked' : ''} onchange="updateItem('collabs','${c.id}','visible',this.checked)"><label style="margin:0">Visible</label></div>
  </div>`;
}
window.addCollab = () => {
  DRAFT.collabs.unshift({ id: uid(), name: 'New Collaborator', role: '', description: '', logo: '', images: [], videos: [], link: '', year: '', visible: true, featured: false, order: DRAFT.collabs.length });
  renderPanel('collabs');
};

/* ---------------- LAUNCH ---------------- */
function renderLaunchPanel() {
  const l = DRAFT.launch;
  window._mediaSetters['launch-cover'] = (url) => { l.cover = url; renderPanel('launch'); };
  const dtLocal = l.launchDate ? new Date(l.launchDate).toISOString().slice(0, 16) : '';
  document.getElementById('panel-launch').innerHTML = `
    <div class="card">
      <div class="checkbox-row" style="margin-bottom:16px"><input type="checkbox" ${l.enabled ? 'checked' : ''} onchange="DRAFT_launch('enabled',this.checked)"><label style="margin:0">Enable countdown section</label></div>
      <div class="field-row">
        <div class="field"><label>Project Name</label><input value="${esc(l.projectName)}" oninput="DRAFT_launch('projectName',this.value)"></div>
        <div class="field"><label>Launch Date &amp; Time</label><input type="datetime-local" value="${dtLocal}" onchange="DRAFT_launchDate(this.value)"></div>
      </div>
      <div class="field"><label>Timezone</label><input value="${esc(l.timezone)}" oninput="DRAFT_launch('timezone',this.value)"></div>
      <div class="field"><label>Description</label><textarea rows="2" oninput="DRAFT_launch('description',this.value)">${esc(l.description)}</textarea></div>
      ${mediaPickerHtml('launch-cover', l.cover)}
      <div class="field-row">
        <div class="checkbox-row"><input type="checkbox" ${l.fireworks ? 'checked' : ''} onchange="DRAFT_launch('fireworks',this.checked)"><label style="margin:0">Fireworks on completion</label></div>
        <div class="field"><label>Fireworks Duration (sec)</label><input type="number" value="${l.fireworksDuration}" oninput="DRAFT_launch('fireworksDuration',parseInt(this.value)||6)"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Button Text</label><input value="${esc(l.buttonText)}" oninput="DRAFT_launch('buttonText',this.value)"></div>
        <div class="field"><label>Project Destination URL</label><input value="${esc(l.destination)}" oninput="DRAFT_launch('destination',this.value)"></div>
      </div>
    </div>`;
}
window.DRAFT_launch = (k, v) => { DRAFT.launch[k] = v; };
window.DRAFT_launchDate = (v) => { DRAFT.launch.launchDate = new Date(v).toISOString(); DRAFT.launch.launchedFlagShown = false; };

/* ---------------- CURRENT PROJECT ---------------- */
function renderCurrentPanel() {
  const c = DRAFT.currentProject;
  window._mediaSetters['current-media'] = (url) => { c.cover = url; renderPanel('current'); };
  document.getElementById('panel-current').innerHTML = `
    <div class="card">
      <div class="checkbox-row" style="margin-bottom:16px"><input type="checkbox" ${c.visible ? 'checked' : ''} onchange="DRAFT_current('visible',this.checked)"><label style="margin:0">Visible on site</label></div>
      <div class="field"><label>Project Name</label><input value="${esc(c.name)}" oninput="DRAFT_current('name',this.value)"></div>
      <div class="field"><label>Description</label><textarea rows="2" oninput="DRAFT_current('description',this.value)">${esc(c.description)}</textarea></div>
      ${mediaPickerHtml('current-media', c.cover)}
      <div class="field-row">
        <div class="field"><label>Status</label>
          <select onchange="DRAFT_current('status',this.value)">
            ${['PLANNING', 'IN PROGRESS', 'EDITING', 'FINALIZING', 'COMING SOON'].map(s => `<option ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Progress (%)</label><input type="number" min="0" max="100" value="${c.progress || 0}" oninput="DRAFT_current('progress',Math.max(0,Math.min(100,parseInt(this.value)||0)))"></div>
      </div>
      <div class="field"><label>Expected Launch</label><input value="${esc(c.expectedLaunch)}" oninput="DRAFT_current('expectedLaunch',this.value)"></div>
    </div>`;
}
window.DRAFT_current = (k, v) => { DRAFT.currentProject[k] = v; };

/* ---------------- MUSIC ---------------- */
function renderMusicPanel() {
  const m = DRAFT.music;
  document.getElementById('panel-music').innerHTML = `
    <div class="card">
      <div class="checkbox-row" style="margin-bottom:16px"><input type="checkbox" ${m.enabled ? 'checked' : ''} onchange="DRAFT_music('enabled',this.checked)"><label style="margin:0">Enable background music</label></div>
      <div class="field">
        <label>Music file</label>
        ${m.url ? `<audio controls src="${esc(m.url)}" style="width:100%"></audio>` : '<p class="empty-note">No music uploaded yet</p>'}
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="file" accept="audio/*" id="music-file" style="display:none" onchange="handleMusicUpload()">
          <button class="btn ghost small" onclick="document.getElementById('music-file').click()">Upload</button>
          ${m.url ? `<button class="btn ghost small" onclick="DRAFT_music('url',''); renderPanel('music')">Remove</button>` : ''}
        </div>
      </div>
      <div class="field"><label>Volume (${Math.round((m.volume ?? 0.5) * 100)}%)</label><input type="range" min="0" max="1" step="0.05" value="${m.volume ?? 0.5}" oninput="DRAFT_musicVolume(this.value); renderPanel('music')"></div>
      <p class="empty-note">When enabled, music fades in over 4 seconds when a visitor opens the site, and a mute/unmute button appears in the bottom-left corner. Turn this off and the button disappears entirely — no trace of music on the site. (Note: most browsers block autoplaying sound until the visitor's first click/tap — the fade-in will start then instead, automatically.)</p>
    </div>`;
}
window.DRAFT_music = (k, v) => { DRAFT.music[k] = v; };
window.DRAFT_musicVolume = (v) => { DRAFT.music.volume = parseFloat(v); };
window.handleMusicUpload = async () => {
  const input = document.getElementById('music-file');
  const file = input.files[0]; if (!file) return;
  if (file.size > 25 * 1024 * 1024) { toast('File too large — keep under 25MB'); return; }
  toast('Uploading music…');
  try {
    const url = await uploadMedia(file);
    DRAFT.music.url = url;
    DRAFT.media.unshift({ id: uid(), name: file.name, url, type: 'audio', createdAt: Date.now() });
    renderPanel('music');
    toast('Music uploaded');
  } catch (e) {
    toast('Upload failed — check js/cloudinary-config.js / .env');
    console.error(e);
  }
};

/* ---------------- MEDIA LIBRARY ---------------- */
function renderMediaPanel() {
  const m = DRAFT.media;
  document.getElementById('panel-media').innerHTML = `
    <input type="file" id="lib-upload" accept="image/*,video/*" multiple style="display:none" onchange="libUpload()">
    <button class="btn" onclick="document.getElementById('lib-upload').click()"><i data-lucide="upload" style="width:14px;height:14px"></i> Upload files</button>
    <p style="color:var(--text2);font-size:12px;margin:14px 0">${m.length} item(s) · stored on Cloudinary (free plan). Click an item to select it${window._pendingPickField ? ' for the field you opened this from' : ''}.</p>
    <div class="media-grid">${m.map(item => `
      <div class="media-item">
        ${item.type === 'video' ? `<video class="media-thumb" src="${esc(item.url)}" muted></video>` : `<img class="media-thumb" src="${esc(item.url)}">`}
        <button class="del" onclick="event.stopPropagation();deleteMedia('${item.id}')"><i data-lucide="x" style="width:12px;height:12px"></i></button>
        <div style="position:absolute;inset:0;cursor:pointer" onclick="pickFromLibrary('${item.id}')"></div>
      </div>`).join('')}</div>`;
  window.lucide && window.lucide.createIcons();
}
window.libUpload = async () => {
  const input = document.getElementById('lib-upload');
  for (const file of input.files) {
    if (file.size > 25 * 1024 * 1024) { toast('Skipped ' + file.name + ' — over 25MB'); continue; }
    toast('Uploading ' + file.name + '…');
    try {
      const url = await uploadMedia(file);
      DRAFT.media.unshift({ id: uid(), name: file.name, url, type: file.type.startsWith('video') ? 'video' : 'image', createdAt: Date.now() });
    } catch (e) { toast('Upload failed for ' + file.name); console.error(e); }
  }
  renderPanel('media');
};
window.deleteMedia = (id) => { DRAFT.media = DRAFT.media.filter(m => m.id !== id); renderPanel('media'); };
window.pickFromLibrary = (id) => {
  const item = DRAFT.media.find(m => m.id === id); if (!item) return;
  if (window._pendingPickField) {
    applyMediaSelection(window._pendingPickField, item.url);
    const field = window._pendingPickField;
    window._pendingPickField = null;
    if (field.startsWith('work-')) switchPanel('work');
    else if (field.startsWith('collab-')) switchPanel('collabs');
    else if (field.startsWith('hero-')) switchPanel('hero');
    else if (field.startsWith('launch-')) switchPanel('launch');
    else if (field.startsWith('current-')) switchPanel('current');
    toast('Media applied');
  } else {
    toast('Open a media field elsewhere first, then choose from library');
  }
};

/* ---------------- CONTACT / EMAIL ---------------- */
function renderContactPanel() {
  document.getElementById('panel-contact').innerHTML = `
    <div class="card">
      <div class="field"><label>Contact Email</label><input type="email" value="${esc(DRAFT.email)}" oninput="DRAFT_email(this.value)" placeholder="hello@example.com"></div>
      <p class="empty-note">Clicking the email on the public site opens the visitor's mail client via mailto:.</p>
    </div>`;
}
window.DRAFT_email = (v) => { DRAFT.email = v; };

/* ---------------- SOCIAL ---------------- */
function renderSocialPanel() {
  const items = DRAFT.social;
  document.getElementById('panel-social').innerHTML = `
    <button class="btn" onclick="addSocial()"><i data-lucide="plus" style="width:14px;height:14px"></i> Add Social</button>
    <div style="margin-top:20px">${items.length ? items.map(s => socialCardHtml(s)).join('') : '<p class="empty-note">No social links yet.</p>'}</div>`;
  items.forEach(s => { window._mediaSetters['social-icon-' + s.id] = (url) => { s.icon = url; renderPanel('social'); }; });
  window.lucide && window.lucide.createIcons();
}
function socialCardHtml(s) {
  return `<div class="card">
    <div class="card-head"><strong>${esc(s.platform) || 'New Link'}</strong>
      <div class="item-actions">
        <button onclick="moveItem('social','${s.id}',-1)"><i data-lucide="arrow-up" style="width:16px;height:16px"></i></button>
        <button onclick="moveItem('social','${s.id}',1)"><i data-lucide="arrow-down" style="width:16px;height:16px"></i></button>
        <button onclick="deleteItem('social','${s.id}')"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
      </div>
    </div>
    <div class="field"><label>URL</label><input value="${esc(s.url)}" oninput="onSocialUrlInput('${s.id}',this.value)" placeholder="https://instagram.com/yourhandle"></div>
    <div class="field"><label>Platform (auto-detected, editable)</label><input value="${esc(s.platform)}" oninput="updateItem('social','${s.id}','platform',this.value)"></div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:6px">
      <div class="icon-preview">${s.icon ? `<img src="${esc(s.icon)}" style="width:18px;height:18px;object-fit:contain">` : `<i data-lucide="${platformIcon(s.platform)}" style="width:16px;height:16px"></i>`}</div>
      <input type="file" accept="image/*,.svg" id="social-icon-${s.id}-file" style="display:none" onchange="handleMediaUpload('social-icon-${s.id}')">
      <button class="btn ghost small" onclick="document.getElementById('social-icon-${s.id}-file').click()">Upload custom icon</button>
      ${s.icon ? `<button class="btn ghost small" onclick="updateItem('social','${s.id}','icon',''); renderPanel('social')">Use auto icon</button>` : ''}
    </div>
    <div class="checkbox-row" style="margin-top:12px"><input type="checkbox" ${s.visible !== false ? 'checked' : ''} onchange="updateItem('social','${s.id}','visible',this.checked)"><label style="margin:0">Visible</label></div>
  </div>`;
}
window.onSocialUrlInput = (id, val) => {
  const s = DRAFT.social.find(x => x.id === id); if (!s) return;
  s.url = val;
  if (!s.platformManuallySet) { s.platform = detectPlatform(val); }
  renderPanel('social');
};
window.addSocial = () => {
  DRAFT.social.unshift({ id: uid(), platform: '', url: '', icon: '', visible: true, order: DRAFT.social.length });
  renderPanel('social');
};

/* ---------------- NAVIGATION ---------------- */
function renderNavPanel() {
  const items = DRAFT.nav;
  document.getElementById('panel-nav').innerHTML = `
    <div class="card">${items.map((n, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <input style="flex:1" value="${esc(n.label)}" oninput="DRAFT_navLabel(${i},this.value)">
        <div class="checkbox-row"><input type="checkbox" ${n.visible ? 'checked' : ''} onchange="DRAFT_navVisible(${i},this.checked)"><label style="margin:0">Show</label></div>
        <button onclick="moveNav(${i},-1)"><i data-lucide="arrow-up" style="width:16px;height:16px"></i></button>
        <button onclick="moveNav(${i},1)"><i data-lucide="arrow-down" style="width:16px;height:16px"></i></button>
      </div>`).join('')}
    </div>`;
  window.lucide && window.lucide.createIcons();
}
window.DRAFT_navLabel = (i, v) => { DRAFT.nav[i].label = v; };
window.DRAFT_navVisible = (i, v) => { DRAFT.nav[i].visible = v; };
window.moveNav = (i, dir) => {
  const j = i + dir; if (j < 0 || j >= DRAFT.nav.length) return;
  [DRAFT.nav[i], DRAFT.nav[j]] = [DRAFT.nav[j], DRAFT.nav[i]];
  DRAFT.nav.forEach((n, idx) => n.order = idx);
  renderPanel('nav');
};

/* ---------------- SETTINGS ---------------- */
function renderSettingsPanel() {
  const s = DRAFT.settings;
  document.getElementById('panel-settings').innerHTML = `
    <div class="card">
      <div class="field"><label>Website Title</label><input value="${esc(s.title)}" oninput="DRAFT_settings('title',this.value)"></div>
      <div class="field-row">
        <div class="checkbox-row"><input type="checkbox" ${s.animations ? 'checked' : ''} onchange="DRAFT_settings('animations',this.checked)"><label style="margin:0">Animations</label></div>
        <div class="checkbox-row"><input type="checkbox" ${s.cursor ? 'checked' : ''} onchange="DRAFT_settings('cursor',this.checked)"><label style="margin:0">Custom cursor</label></div>
        <div class="checkbox-row"><input type="checkbox" ${s.grain ? 'checked' : ''} onchange="DRAFT_settings('grain',this.checked)"><label style="margin:0">Grain / noise</label></div>
        <div class="checkbox-row"><input type="checkbox" ${s.loadingScreen ? 'checked' : ''} onchange="DRAFT_settings('loadingScreen',this.checked)"><label style="margin:0">Loading screen</label></div>
      </div>
    </div>
    <div class="card">
      <p style="color:var(--text2);font-size:13px;line-height:1.7">To change the admin password, go to <strong style="color:var(--text)">Firebase Console → Authentication → Users</strong>, select your admin user, and reset the password there. There's no in-app password field because the admin account is managed by Firebase Auth, not by this site.</p>
    </div>`;
}
window.DRAFT_settings = (k, v) => { DRAFT.settings[k] = v; };

function renderPanel(name) {
  ({
    dashboard: renderDashboard, hero: renderHeroPanel, info: renderInfoPanel, work: renderWorkPanel,
    workinfo: renderWorkInfoPanel, collabs: renderCollabsPanel, launch: renderLaunchPanel, current: renderCurrentPanel,
    music: renderMusicPanel,
    media: renderMediaPanel, contact: renderContactPanel, social: renderSocialPanel, nav: renderNavPanel, settings: renderSettingsPanel
  }[name] || function () { })();
  window.lucide && window.lucide.createIcons();
}
