// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, settings:', JSON.stringify(getSettings()));
  document.getElementById('loginBtn').addEventListener('click', tryLogin);
  document.getElementById('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  document.getElementById('logoutBtn').addEventListener('click', doLogout);
  document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));
  document.getElementById('filterStatus').addEventListener('change', renderAllAppointments);
  document.getElementById('filterDate').addEventListener('change', renderAllAppointments);
  document.getElementById('clearFilter').addEventListener('click', clearFilters);
  document.getElementById('saveSettings').addEventListener('click', saveSettingsHandler);
  document.getElementById('addServiceBtn').addEventListener('click', addService);
  document.getElementById('saveServices').addEventListener('click', saveServicesHandler);
});

// ── LOGIN ──
function tryLogin() {
  const pass = document.getElementById('passInput').value.trim();
  const settings = getSettings();
  const correctPass = settings.adminPass || '12341234';
  console.log('pass entered:', pass);
  console.log('correctPass:', correctPass);
  console.log('settings:', JSON.stringify(settings));
  if (pass === correctPass) {
    console.log('login success');
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminWrap').style.display = 'flex';
    initAdmin();
  } else {
    document.getElementById('loginErr').classList.remove('hidden');
    document.getElementById('passInput').value = '';
  }
}

function doLogout() {
  document.getElementById('adminWrap').style.display = 'none';
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('passInput').value = '';
  document.getElementById('loginErr').style.display = 'none';
}

function initAdmin() {
  requestNotificationPermission();
  renderDashboard();
  document.getElementById('sidebarToggle')?.addEventListener('click', () =>
    document.querySelector('.admin-sidebar').classList.toggle('open'));
}

// ── PANEL NAVIGATION ──
function switchPanel(panel) {
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-panel="${panel}"]`).classList.add('active');
  document.getElementById('panel-' + panel).classList.add('active');
  // update mobile title + close sidebar
  const btn = document.querySelector(`[data-panel="${panel}"]`);
  const titleEl = document.getElementById('sidebarTitle');
  if (titleEl && btn) titleEl.textContent = btn.textContent;
  document.querySelector('.admin-sidebar')?.classList.remove('open');
  if (panel === 'dashboard') renderDashboard();
  if (panel === 'calendar') renderAdminCalendar();
  if (panel === 'appointments') renderAllAppointments();
  if (panel === 'settings') renderSettings();
  if (panel === 'services') renderServicesEditor();
}

// ── TOAST ──
function showToast(msg, color = '#25D366') {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);background:#1e1118;color:#fff;padding:14px 28px;border-radius:50px;font-size:14px;font-weight:600;font-family:Heebo,sans-serif;z-index:9999;transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;white-space:nowrap;';
    document.body.appendChild(t);
  }
  t.style.borderLeft = `4px solid ${color}`;
  t.textContent = msg;
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; }, 2500);
}

// ── CONFIRM DIALOG ──
function showConfirmDialog(msg, onConfirm) {
  let overlay = document.getElementById('confirmDialog');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirmDialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:32px 28px;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <p id="confirmDialogMsg" style="font-size:16px;color:#1e1118;margin-bottom:24px;line-height:1.6;"></p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="confirmDialogNo" style="padding:10px 24px;border:2px solid #e0e0e0;border-radius:20px;background:none;cursor:pointer;font-family:Heebo,sans-serif;font-size:14px;color:#888;">בטל</button>
          <button id="confirmDialogYes" style="padding:10px 24px;border:none;border-radius:20px;background:#e05;color:#fff;cursor:pointer;font-family:Heebo,sans-serif;font-size:14px;font-weight:700;">מחק</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  document.getElementById('confirmDialogMsg').textContent = msg;
  overlay.style.display = 'flex';
  document.getElementById('confirmDialogYes').onclick = () => { overlay.style.display = 'none'; onConfirm(); };
  document.getElementById('confirmDialogNo').onclick = () => { overlay.style.display = 'none'; };
}

// ── HELPERS ──
function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
function weekEnd() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }

const STATUS_LABELS = { pending: 'ממתין', confirmed: 'מאושר', completed: 'הושלם', cancelled: 'בוטל' };
const STATUS_COLORS = { pending: '#f0a500', confirmed: '#25D366', completed: '#888', cancelled: '#e05' };

function emptyMsg(txt) { return `<p class="empty-msg">${txt}</p>`; }

function apptCard(appt, showDate = false) {
  const dateLabel = showDate ? `<span class="appt-date">${sanitize(formatDate(appt.date))}</span>` : '';
  return `
    <div class="appt-card status-${sanitize(appt.status)}" data-id="${sanitize(appt.id)}">
      <div class="appt-card-top">
        <span class="appt-service">${sanitize(appt.serviceIcon)} ${sanitize(appt.serviceName)}</span>
        <span class="appt-status" style="color:${STATUS_COLORS[appt.status]}">${STATUS_LABELS[appt.status]}</span>
      </div>
      ${dateLabel}
      <div class="appt-card-info">
        <span>🕐 ${sanitize(appt.time)} (${sanitize(String(appt.duration))} דק')</span>
        <span>👤 ${sanitize(appt.clientName)}</span>
        <span>📞 <a href="tel:${sanitize(appt.clientPhone)}">${sanitize(appt.clientPhone)}</a></span>
        ${appt.notes ? `<span>📝 ${sanitize(appt.notes)}</span>` : ''}
      </div>
      <div class="appt-card-actions">
        ${appt.status === 'pending' ? `<button onclick="updateStatus('${sanitize(appt.id)}','confirmed')" class="act-btn confirm">✓ אשר</button>` : ''}
        ${appt.status !== 'completed' && appt.status !== 'cancelled' ? `<button onclick="updateStatus('${sanitize(appt.id)}','completed')" class="act-btn complete">✔ הושלם</button>` : ''}
        ${appt.status !== 'cancelled' ? `<button onclick="updateStatus('${sanitize(appt.id)}','cancelled')" class="act-btn cancel">✕ בטל</button>` : ''}
        <button onclick="sendReminderWA('${sanitize(appt.id)}')" class="act-btn wa">💬 וואטסאפ</button>
        <button onclick="deleteAppt('${sanitize(appt.id)}')" class="act-btn del">🗑</button>
      </div>
    </div>
  `;
}

// ── DASHBOARD ──
function renderDashboard() {
  const all = getAppointments();
  const today = todayStr();
  const tomorrow = tomorrowStr();
  const week = weekEnd();

  const todayAppts = all.filter(a => a.date === today && a.status !== 'cancelled');
  const weekAppts  = all.filter(a => a.date >= today && a.date <= week && a.status !== 'cancelled');
  const pending    = all.filter(a => a.status === 'pending');

  document.getElementById('statToday').textContent   = todayAppts.length;
  document.getElementById('statWeek').textContent    = weekAppts.length;
  document.getElementById('statTotal').textContent   = all.filter(a => a.status !== 'cancelled').length;
  document.getElementById('statPending').textContent = pending.length;

  const todaySorted    = [...todayAppts].sort((a, b) => a.time.localeCompare(b.time));
  const tomorrowSorted = all.filter(a => a.date === tomorrow && a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));

  document.getElementById('todayList').innerHTML    = todaySorted.length    ? todaySorted.map(a => apptCard(a)).join('')    : emptyMsg('אין תורים היום');
  document.getElementById('tomorrowList').innerHTML = tomorrowSorted.length ? tomorrowSorted.map(a => apptCard(a)).join('') : emptyMsg('אין תורים מחר');
}

// ── ADMIN CALENDAR ──
let adminCalYear, adminCalMonth, adminSelectedDate;

function renderAdminCalendar() {
  if (!adminCalYear) { const now = new Date(); adminCalYear = now.getFullYear(); adminCalMonth = now.getMonth(); }
  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  document.getElementById('adminCalTitle').textContent = `${monthNames[adminCalMonth]} ${adminCalYear}`;

  const firstDay    = new Date(adminCalYear, adminCalMonth, 1).getDay();
  const daysInMonth = new Date(adminCalYear, adminCalMonth + 1, 0).getDate();
  const all         = getAppointments();
  const settings    = getSettings();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = `${adminCalYear}-${String(adminCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count     = all.filter(a => a.date === dateStr && a.status !== 'cancelled').length;
    const isBlocked = settings.blockedDates.includes(dateStr);
    const isWork    = isWorkDay(dateStr);
    const isSelected = adminSelectedDate === dateStr;
    let cls = 'cal-cell admin-cal-cell';
    if (isBlocked) cls += ' blocked';
    else if (!isWork) cls += ' disabled';
    if (isSelected) cls += ' selected';
    const dot = count > 0 ? `<span class="cal-dot">${count}</span>` : '';
    html += `<div class="${cls}" onclick="adminSelectDay('${dateStr}')">${d}${dot}</div>`;
  }
  document.getElementById('adminCalGrid').innerHTML = html;

  document.getElementById('adminPrevMonth').onclick = () => { adminCalMonth--; if (adminCalMonth < 0) { adminCalMonth = 11; adminCalYear--; } renderAdminCalendar(); };
  document.getElementById('adminNextMonth').onclick = () => { adminCalMonth++; if (adminCalMonth > 11) { adminCalMonth = 0; adminCalYear++; } renderAdminCalendar(); };
}

function adminSelectDay(dateStr) {
  adminSelectedDate = dateStr;
  renderAdminCalendar();
  const appts = getAppointments().filter(a => a.date === dateStr && a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('adminDayTitle').textContent = formatDate(dateStr);
  document.getElementById('adminDayAppts').innerHTML = appts.length ? appts.map(a => apptCard(a)).join('') : emptyMsg('אין תורים ביום זה');
  const isBlocked = getSettings().blockedDates.includes(dateStr);
  const blockBtn = document.getElementById('blockDayBtn');
  blockBtn.textContent = isBlocked ? '✅ בטל חסימה' : '🚫 חסום יום זה';
  blockBtn.onclick = () => toggleBlockDay(dateStr);
}

function toggleBlockDay(dateStr) {
  const settings = getSettings();
  const idx = settings.blockedDates.indexOf(dateStr);
  if (idx >= 0) settings.blockedDates.splice(idx, 1);
  else settings.blockedDates.push(dateStr);
  saveSettings(settings);
  renderAdminCalendar();
  adminSelectDay(dateStr);
}

// ── ALL APPOINTMENTS ──
function renderAllAppointments() {
  const statusFilter = document.getElementById('filterStatus').value;
  const dateFilter   = document.getElementById('filterDate').value;
  let all = getAppointments();
  if (statusFilter !== 'all') all = all.filter(a => a.status === statusFilter);
  if (dateFilter) all = all.filter(a => a.date === dateFilter);
  all.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  document.getElementById('allApptList').innerHTML = all.length ? all.map(a => apptCard(a, true)).join('') : emptyMsg('אין תורים');
}

function clearFilters() {
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('filterDate').value = '';
  renderAllAppointments();
}

// ── APPOINTMENT ACTIONS ──
function updateStatus(id, status) {
  const appts = getAppointments();
  const appt = appts.find(a => a.id === id);
  if (!appt) return;
  appt.status = status;
  saveAppointments(appts);
  refreshCurrentPanel();
}

function deleteAppt(id) {
  showConfirmDialog('למחוק תור זה לצמיתות?', () => {
    saveAppointments(getAppointments().filter(a => a.id !== id));
    refreshCurrentPanel();
  });
}

function sendReminderWA(id) {
  const appt = getAppointments().find(a => a.id === id);
  if (!appt) return;
  const msg = `היי ${appt.clientName}! 💅\nתזכורת לתור שלך:\n✨ ${appt.serviceName}\n📅 ${formatDate(appt.date)}\n🕐 ${appt.time}\nמחכה לך! 🌸`;
  window.open(`https://wa.me/${appt.clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function refreshCurrentPanel() {
  const active = document.querySelector('.admin-nav-btn.active')?.dataset.panel;
  if (active === 'dashboard') renderDashboard();
  if (active === 'calendar') { renderAdminCalendar(); if (adminSelectedDate) adminSelectDay(adminSelectedDate); }
  if (active === 'appointments') renderAllAppointments();
}

// ── SETTINGS ──
const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

function renderSettings() {
  const settings = getSettings();
  document.getElementById('slotInterval').value = settings.slotInterval;
  document.getElementById('waPhoneInput').value = settings.waPhone;

  const container = document.getElementById('workDaysEditor');
  container.innerHTML = Object.entries(settings.workDays).map(([dow, day]) => `
    <div class="work-day-row">
      <label class="toggle-wrap">
        <input type="checkbox" class="wd-active" data-dow="${dow}" ${day.active ? 'checked' : ''}/>
        <span class="toggle-slider"></span>
      </label>
      <span class="wd-name">${DAY_NAMES[dow]}</span>
      <input type="time" class="wd-start" data-dow="${dow}" value="${day.start}" ${!day.active ? 'disabled' : ''}/>
      <span>עד</span>
      <input type="time" class="wd-end" data-dow="${dow}" value="${day.end}" ${!day.active ? 'disabled' : ''}/>
    </div>
  `).join('');

  container.querySelectorAll('.wd-active').forEach(cb => {
    cb.addEventListener('change', () => {
      const row = cb.closest('.work-day-row');
      row.querySelector('.wd-start').disabled = !cb.checked;
      row.querySelector('.wd-end').disabled   = !cb.checked;
    });
  });

  renderBlockedDates();

  document.getElementById('addBlockDate').onclick = () => {
    const val = document.getElementById('blockDateInput').value;
    if (!val) return;
    const s = getSettings();
    if (!s.blockedDates.includes(val)) { s.blockedDates.push(val); saveSettings(s); }
    document.getElementById('blockDateInput').value = '';
    renderBlockedDates();
  };
}

function renderBlockedDates() {
  const settings = getSettings();
  const list = document.getElementById('blockedDatesList');
  list.innerHTML = settings.blockedDates.length
    ? settings.blockedDates.sort().map(d => `
        <div class="blocked-tag">
          ${formatDate(d)}
          <button onclick="removeBlockDate('${d}')">✕</button>
        </div>`).join('')
    : '<p style="color:#aaa;font-size:13px">אין תאריכים חסומים</p>';
}

function removeBlockDate(dateStr) {
  const s = getSettings();
  s.blockedDates = s.blockedDates.filter(d => d !== dateStr);
  saveSettings(s);
  renderBlockedDates();
}

function saveSettingsHandler() {
  const settings = getSettings();
  settings.slotInterval = +document.getElementById('slotInterval').value;
  settings.waPhone = document.getElementById('waPhoneInput').value.trim();
  const newPass = document.getElementById('newPassInput').value.trim();
  if (newPass) settings.adminPass = newPass;

  document.querySelectorAll('.wd-active').forEach(cb => {
    const dow = cb.dataset.dow;
    const row = cb.closest('.work-day-row');
    settings.workDays[dow] = {
      active: cb.checked,
      start: row.querySelector('.wd-start').value,
      end:   row.querySelector('.wd-end').value,
    };
  });

  saveSettings(settings);
  showToast('✅ הגדרות נשמרו בהצלחה!');
  document.getElementById('newPassInput').value = '';
}

// ── SERVICES EDITOR ──
function renderServicesEditor() {
  const services = getServices();
  document.getElementById('servicesEditor').innerHTML = services.map((s, i) => `
    <div class="svc-edit-row" data-idx="${i}">
      <input class="svc-icon"     type="text"   value="${s.icon}"     placeholder="💅" maxlength="2"/>
      <input class="svc-name"     type="text"   value="${s.name}"     placeholder="שם שירות"/>
      <div class="svc-num-wrap">
        <label>דקות</label>
        <input class="svc-duration" type="number" value="${s.duration}" min="15" step="15"/>
      </div>
      <div class="svc-num-wrap">
        <label>מחיר ₪</label>
        <input class="svc-price" type="number" value="${s.price}" min="0" placeholder="0"/>
      </div>
      <button class="act-btn del" onclick="removeService(${i})">🗑</button>
    </div>
  `).join('');
}

function removeService(idx) {
  const services = getServices();
  services.splice(idx, 1);
  saveServices(services);
  renderServicesEditor();
}

function addService() {
  const services = getServices();
  services.push({ id: generateId(), name: 'שירות חדש', icon: '💅', duration: 60, price: '' });
  saveServices(services);
  renderServicesEditor();
}

function saveServicesHandler() {
  const rows     = document.querySelectorAll('.svc-edit-row');
  const services = getServices();
  rows.forEach((row, i) => {
    if (!services[i]) return;
    services[i].icon     = row.querySelector('.svc-icon').value;
    services[i].name     = row.querySelector('.svc-name').value;
    services[i].duration = +row.querySelector('.svc-duration').value;
    services[i].price    = row.querySelector('.svc-price').value;
  });
  saveServices(services);
  showToast('✅ שירותים נשמרו בהצלחה!');
}
