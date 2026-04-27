// ── LOGIN ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', tryLogin);
  document.getElementById('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
});

function tryLogin() {
  const pass = document.getElementById('passInput').value;
  const settings = getSettings();
  if (pass === settings.adminPass) {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('adminWrap').classList.remove('hidden');
    initAdmin();
  } else {
    document.getElementById('loginErr').classList.remove('hidden');
    document.getElementById('passInput').value = '';
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('adminWrap').classList.add('hidden');
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('passInput').value = '';
});

// ── PANEL NAVIGATION ──
document.querySelectorAll('.admin-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
    if (btn.dataset.panel === 'dashboard') renderDashboard();
    if (btn.dataset.panel === 'calendar') renderAdminCalendar();
    if (btn.dataset.panel === 'appointments') renderAllAppointments();
    if (btn.dataset.panel === 'settings') renderSettings();
    if (btn.dataset.panel === 'services') renderServicesEditor();
  });
});

function initAdmin() {
  requestNotificationPermission();
  renderDashboard();
}

// ── HELPERS ──
function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function weekEnd() {
  const d = new Date(); d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABELS = { pending: 'ממתין', confirmed: 'מאושר', completed: 'הושלם', cancelled: 'בוטל' };
const STATUS_COLORS = { pending: '#f0a500', confirmed: '#25D366', completed: '#888', cancelled: '#e05' };

function apptCard(appt, showDate = false) {
  const dateLabel = showDate ? `<span class="appt-date">${formatDate(appt.date)}</span>` : '';
  return `
    <div class="appt-card status-${appt.status}" data-id="${appt.id}">
      <div class="appt-card-top">
        <span class="appt-service">${appt.serviceIcon} ${appt.serviceName}</span>
        <span class="appt-status" style="color:${STATUS_COLORS[appt.status]}">${STATUS_LABELS[appt.status]}</span>
      </div>
      ${dateLabel}
      <div class="appt-card-info">
        <span>🕐 ${appt.time} (${appt.duration} דק')</span>
        <span>👤 ${appt.clientName}</span>
        <span>📞 <a href="tel:${appt.clientPhone}">${appt.clientPhone}</a></span>
        ${appt.notes ? `<span>📝 ${appt.notes}</span>` : ''}
      </div>
      <div class="appt-card-actions">
        ${appt.status === 'pending' ? `<button onclick="updateStatus('${appt.id}','confirmed')" class="act-btn confirm">✓ אשר</button>` : ''}
        ${appt.status !== 'completed' && appt.status !== 'cancelled' ? `<button onclick="updateStatus('${appt.id}','completed')" class="act-btn complete">✔ הושלם</button>` : ''}
        ${appt.status !== 'cancelled' ? `<button onclick="updateStatus('${appt.id}','cancelled')" class="act-btn cancel">✕ בטל</button>` : ''}
        <button onclick="sendReminderWA('${appt.id}')" class="act-btn wa">💬 וואטסאפ</button>
        <button onclick="deleteAppt('${appt.id}')" class="act-btn del">🗑</button>
      </div>
    </div>
  `;
}

function emptyMsg(txt) { return `<p class="empty-msg">${txt}</p>`; }

// ── DASHBOARD ──
function renderDashboard() {
  const all = getAppointments();
  const today = todayStr();
  const tomorrow = tomorrowStr();
  const week = weekEnd();

  const todayAppts = all.filter(a => a.date === today && a.status !== 'cancelled');
  const weekAppts = all.filter(a => a.date >= today && a.date <= week && a.status !== 'cancelled');
  const pending = all.filter(a => a.status === 'pending');

  document.getElementById('statToday').textContent = todayAppts.length;
  document.getElementById('statWeek').textContent = weekAppts.length;
  document.getElementById('statTotal').textContent = all.filter(a => a.status !== 'cancelled').length;
  document.getElementById('statPending').textContent = pending.length;

  const todayList = document.getElementById('todayList');
  const tomorrowList = document.getElementById('tomorrowList');

  const todaySorted = todayAppts.sort((a, b) => a.time.localeCompare(b.time));
  const tomorrowSorted = all.filter(a => a.date === tomorrow && a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));

  todayList.innerHTML = todaySorted.length ? todaySorted.map(a => apptCard(a)).join('') : emptyMsg('אין תורים היום');
  tomorrowList.innerHTML = tomorrowSorted.length ? tomorrowSorted.map(a => apptCard(a)).join('') : emptyMsg('אין תורים מחר');
}

// ── ADMIN CALENDAR ──
let adminCalYear, adminCalMonth, adminSelectedDate;

function renderAdminCalendar() {
  if (!adminCalYear) {
    const now = new Date();
    adminCalYear = now.getFullYear();
    adminCalMonth = now.getMonth();
  }
  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  document.getElementById('adminCalTitle').textContent = `${monthNames[adminCalMonth]} ${adminCalYear}`;

  const firstDay = new Date(adminCalYear, adminCalMonth, 1).getDay();
  const daysInMonth = new Date(adminCalYear, adminCalMonth + 1, 0).getDate();
  const all = getAppointments();
  const settings = getSettings();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${adminCalYear}-${String(adminCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count = all.filter(a => a.date === dateStr && a.status !== 'cancelled').length;
    const isBlocked = settings.blockedDates.includes(dateStr);
    const isWork = isWorkDay(dateStr);
    const isSelected = adminSelectedDate === dateStr;
    let cls = 'cal-cell admin-cal-cell';
    if (isBlocked) cls += ' blocked';
    else if (!isWork) cls += ' disabled';
    if (isSelected) cls += ' selected';
    const dot = count > 0 ? `<span class="cal-dot">${count}</span>` : '';
    html += `<div class="${cls}" onclick="adminSelectDay('${dateStr}')">${d}${dot}</div>`;
  }
  document.getElementById('adminCalGrid').innerHTML = html;

  document.getElementById('adminPrevMonth').onclick = () => {
    adminCalMonth--; if (adminCalMonth < 0) { adminCalMonth = 11; adminCalYear--; }
    renderAdminCalendar();
  };
  document.getElementById('adminNextMonth').onclick = () => {
    adminCalMonth++; if (adminCalMonth > 11) { adminCalMonth = 0; adminCalYear++; }
    renderAdminCalendar();
  };
}

function adminSelectDay(dateStr) {
  adminSelectedDate = dateStr;
  renderAdminCalendar();
  const appts = getAppointments().filter(a => a.date === dateStr && a.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('adminDayTitle').textContent = formatDate(dateStr);
  document.getElementById('adminDayAppts').innerHTML = appts.length
    ? appts.map(a => apptCard(a)).join('')
    : emptyMsg('אין תורים ביום זה');

  const settings = getSettings();
  const isBlocked = settings.blockedDates.includes(dateStr);
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
  const dateFilter = document.getElementById('filterDate').value;
  let all = getAppointments();
  if (statusFilter !== 'all') all = all.filter(a => a.status === statusFilter);
  if (dateFilter) all = all.filter(a => a.date === dateFilter);
  all.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  document.getElementById('allApptList').innerHTML = all.length
    ? all.map(a => apptCard(a, true)).join('')
    : emptyMsg('אין תורים');
}

document.getElementById('filterStatus').addEventListener('change', renderAllAppointments);
document.getElementById('filterDate').addEventListener('change', renderAllAppointments);
document.getElementById('clearFilter').addEventListener('click', () => {
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('filterDate').value = '';
  renderAllAppointments();
});

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
  if (!confirm('למחוק תור זה לצמיתות?')) return;
  saveAppointments(getAppointments().filter(a => a.id !== id));
  refreshCurrentPanel();
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

  // work days
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
      row.querySelector('.wd-end').disabled = !cb.checked;
    });
  });

  // blocked dates
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
        </div>
      `).join('')
    : '<p style="color:#aaa;font-size:13px">אין תאריכים חסומים</p>';
}

function removeBlockDate(dateStr) {
  const s = getSettings();
  s.blockedDates = s.blockedDates.filter(d => d !== dateStr);
  saveSettings(s);
  renderBlockedDates();
}

document.getElementById('saveSettings').addEventListener('click', () => {
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
      end: row.querySelector('.wd-end').value,
    };
  });

  saveSettings(settings);
  const msg = document.getElementById('saveMsg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2500);
});

// ── SERVICES EDITOR ──
function renderServicesEditor() {
  const services = getServices();
  document.getElementById('servicesEditor').innerHTML = services.map((s, i) => `
    <div class="svc-edit-row" data-idx="${i}">
      <input class="svc-icon" type="text" value="${s.icon}" placeholder="💅" maxlength="2"/>
      <input class="svc-name" type="text" value="${s.name}" placeholder="שם שירות"/>
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

document.getElementById('addServiceBtn').addEventListener('click', () => {
  const services = getServices();
  services.push({ id: generateId(), name: 'שירות חדש', icon: '💅', duration: 60, price: '' });
  saveServices(services);
  renderServicesEditor();
});

document.getElementById('saveServices').addEventListener('click', () => {
  const rows = document.querySelectorAll('.svc-edit-row');
  const services = getServices();
  rows.forEach((row, i) => {
    services[i].icon = row.querySelector('.svc-icon').value;
    services[i].name = row.querySelector('.svc-name').value;
    services[i].duration = +row.querySelector('.svc-duration').value;
    services[i].price = row.querySelector('.svc-price').value;
  });
  saveServices(services);
  const msg = document.getElementById('saveSvcMsg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2500);
});
