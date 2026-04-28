// ── STATE ──
let selected = { service: null, date: null, time: null };
let calYear, calMonth;
let currentClient = null; // לקוחה מחוברת

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
  initCalendar();
  bindSteps();
  bindMobileMenu();
  // טען הגדרות ושירותים מ-Sheets לפני הצגת הדף
  loadSettingsFromSheets().then(() => {
    renderServices();
    initClientLogin();
  });
});

// ── CLIENT LOGIN ──
function initClientLogin() {
  // בדוק אם יש לקוחה שמורה ב-localStorage
  const saved = localStorage.getItem('clientSession');
  if (saved) {
    try {
      currentClient = JSON.parse(saved);
      showClientGreeting(currentClient);
      showStep(1);
      prefillClientDetails();
      return;
    } catch(e) {}
  }
  // הצג שלב כניסה
  document.querySelectorAll('.booking-step').forEach(s => s.classList.add('hidden'));
  document.getElementById('stepLogin').classList.remove('hidden');
  document.getElementById('loginBtn').addEventListener('click', handleClientLogin);
  document.getElementById('loginPhone').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleClientLogin();
  });
}

function handleClientLogin() {
  const phone = document.getElementById('loginPhone').value.trim();
  if (!phone || !/^[0-9+\-\s]{9,15}$/.test(phone)) {
    document.getElementById('loginPhone').style.borderColor = '#e05';
    return;
  }
  document.getElementById('loginPhone').style.borderColor = '';
  // חפש לקוחה קיימת
  lookupClient(phone);
}

function lookupClient(phone) {
  const btn = document.getElementById('loginBtn');
  btn.textContent = 'מחפש...';
  btn.disabled = true;
  const cb = 'lc' + Date.now();
  const url = WEBAPP_URL + '?action=lookupClient&callback=' + cb + '&phone=' + encodeURIComponent(phone);
  window[cb] = (data) => {
    delete window[cb]; document.getElementById(cb)?.remove();
    btn.textContent = 'המשך ←';
    btn.disabled = false;
    if (data && data.name) {
      // לקוחה קיימת
      currentClient = { name: data.name, phone };
    } else {
      // לקוחה חדשה
      currentClient = { name: null, phone };
    }
    localStorage.setItem('clientSession', JSON.stringify(currentClient));
    showClientGreeting(currentClient);
    showStep(1);
    prefillClientDetails();
  };
  const s = document.createElement('script');
  s.id = cb; s.src = url;
  s.onerror = () => {
    delete window[cb];
    btn.textContent = 'המשך ←';
    btn.disabled = false;
    currentClient = { name: null, phone };
    localStorage.setItem('clientSession', JSON.stringify(currentClient));
    showStep(1);
    prefillClientDetails();
  };
  document.body.appendChild(s);
}

function showClientGreeting(client) {
  const greeting = document.getElementById('clientGreeting');
  const nameEl = document.getElementById('greetingName');
  const avatarEl = document.getElementById('greetingAvatar');
  if (client && client.name) {
    nameEl.textContent = 'שלום, ' + client.name + '! 💅';
    avatarEl.textContent = client.name.charAt(0);
    greeting.classList.remove('hidden');
  } else {
    greeting.classList.add('hidden');
  }
}

function prefillClientDetails() {
  if (!currentClient) return;
  const nameInput = document.getElementById('clientName');
  const phoneInput = document.getElementById('clientPhone');
  if (currentClient.name) nameInput.value = currentClient.name;
  if (currentClient.phone) phoneInput.value = currentClient.phone;
}

function skipLogin() {
  currentClient = null;
  showStep(1);
}

function logoutClient() {
  currentClient = null;
  localStorage.removeItem('clientSession');
  document.getElementById('clientGreeting').classList.add('hidden');
  document.querySelectorAll('.booking-step').forEach(s => s.classList.add('hidden'));
  document.getElementById('stepLogin').classList.remove('hidden');
  document.getElementById('loginPhone').value = '';
}

// ── MOBILE MENU ──
function bindMobileMenu() {
  document.getElementById('hamburger')?.addEventListener('click', () =>
    document.getElementById('mobileMenu').classList.add('open'));
  document.getElementById('closeMenu')?.addEventListener('click', () =>
    document.getElementById('mobileMenu').classList.remove('open'));
  document.querySelectorAll('.mob-link').forEach(l =>
    l.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open')));
}

// ── CUSTOM TOAST / DIALOG ──
function showFormError(msg) {
  let el = document.getElementById('formError');
  if (!el) {
    el = document.createElement('p');
    el.id = 'formError';
    el.style.cssText = 'color:#e05;font-size:13px;font-weight:600;margin-top:-8px;margin-bottom:8px;';
    document.getElementById('bookingForm').prepend(el);
  }
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ── STEP NAVIGATION ──
function showStep(n) {
  document.querySelectorAll('.booking-step').forEach(s => s.classList.add('hidden'));
  document.getElementById('step' + n).classList.remove('hidden');
  document.querySelectorAll('.step').forEach(s => {
    const sn = +s.dataset.step;
    s.classList.toggle('active', sn === n);
    s.classList.toggle('done', sn < n);
  });
  setTimeout(() => {
    document.getElementById('step' + n).scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 50);
}

function bindSteps() {
  document.getElementById('toStep2').addEventListener('click', () => { showStep(2); renderCalendar(); });
  document.getElementById('toStep1Back').addEventListener('click', () => showStep(1));
  document.getElementById('toStep3').addEventListener('click', () => { showStep(3); renderSlots(); });
  document.getElementById('toStep2Back').addEventListener('click', () => showStep(2));
  document.getElementById('toStep4').addEventListener('click', () => { showStep(4); renderSummaryMini(); });
  document.getElementById('toStep3Back').addEventListener('click', () => showStep(3));
  document.getElementById('bookingForm').addEventListener('submit', submitBooking);
}

// ── STEP 1: SERVICES ──
function renderServices() {
  const services = getServices();
  const container = document.getElementById('servicesList');
  container.innerHTML = services.map(s => `
    <div class="service-pick-card" data-id="${s.id}" onclick="selectService('${s.id}')">
      <div class="spc-icon">${s.icon}</div>
      <div class="spc-info">
        <h3>${s.name}</h3>
        <p>${s.duration} דקות${s.price ? ' · ₪' + s.price : ''}</p>
      </div>
    </div>
  `).join('');
}

function selectService(id) {
  selected.service = getServices().find(s => s.id === id);
  document.querySelectorAll('.service-pick-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.id === id));
  document.getElementById('toStep2').disabled = false;
  setTimeout(() => {
    document.getElementById('toStep2').scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 50);
}

// ── STEP 2: CALENDAR ──
function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
}

function renderCalendar() {
  const title = document.getElementById('calTitle');
  const grid = document.getElementById('calGrid');
  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  title.textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dateObj = new Date(calYear, calMonth, d);
    const isPast = dateObj < today;
    const isWork = isWorkDay(dateStr);
    const isSelected = selected.date === dateStr;
    let cls = 'cal-cell';
    if (isPast || !isWork) cls += ' disabled';
    else cls += ' available';
    if (isSelected) cls += ' selected';
    const onclick = (!isPast && isWork) ? `onclick="selectDate('${dateStr}')"` : '';
    html += `<div class="${cls}" ${onclick}>${d}</div>`;
  }
  grid.innerHTML = html;

  document.getElementById('prevMonth').onclick = () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick = () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  };
}

function selectDate(dateStr) {
  selected.date = dateStr;
  selected.time = null;
  document.getElementById('toStep3').disabled = false;
  renderCalendar();
}

// ── STEP 3: SLOTS ──
function renderSlots() {
  const label = document.getElementById('selectedDateLabel');
  const grid = document.getElementById('slotsGrid');
  const noSlots = document.getElementById('noSlots');
  label.textContent = formatDate(selected.date);

  const slots = getAvailableSlots(selected.date, selected.service.duration);
  if (slots.length === 0) {
    grid.innerHTML = '';
    noSlots.classList.remove('hidden');
    document.getElementById('toStep4').disabled = true;
    return;
  }
  noSlots.classList.add('hidden');
  grid.innerHTML = slots.map(t => `
    <button class="slot-btn" onclick="selectSlot('${t}', this)">${t}</button>
  `).join('');
}

function selectSlot(time, el) {
  selected.time = time;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('toStep4').disabled = false;
}

// ── STEP 4: SUMMARY + FORM ──
function renderSummaryMini() {
  document.getElementById('summaryMini').innerHTML = `
    <div class="summary-row"><span>${sanitize(selected.service.icon)} ${sanitize(selected.service.name)}</span></div>
    <div class="summary-row"><span>📅 ${sanitize(formatDate(selected.date))}</span></div>
    <div class="summary-row"><span>🕐 ${sanitize(selected.time)}</span></div>
  `;
}

function submitBooking(e) {
  e.preventDefault();
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const notes = document.getElementById('clientNotes').value.trim();

  if (!name) { showFormError('אנא הכניסי שם מלא'); return; }
  if (!phone) { showFormError('אנא הכניסי מספר טלפון'); return; }
  if (!/^[0-9+\-\s]{9,15}$/.test(phone)) { showFormError('מספר טלפון לא תקין'); return; }

  const appt = {
    id: generateId(),
    serviceId: selected.service.id,
    serviceName: selected.service.name,
    serviceIcon: selected.service.icon,
    duration: selected.service.duration,
    date: selected.date,
    time: selected.time,
    clientName: name,
    clientPhone: phone,
    notes,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const appointments = getAppointments();
  appointments.push(appt);
  saveAppointments(appointments);
  saveToSheets(appt);
  saveClientToSheets(name, phone); // שמור לקוחה
  // עדכן סשנת לקוחה ב-localStorage
  currentClient = { name, phone };
  localStorage.setItem('clientSession', JSON.stringify(currentClient));
  showClientGreeting(currentClient);
  scheduleAppointmentReminders(appt);
  showConfirmation(appt);
}

// ── STEP 5: CONFIRMATION ──
function showConfirmation(appt) {
  showStep(5);
  document.getElementById('confirmDetails').innerHTML = `
    <div class="confirm-row">${sanitize(appt.serviceIcon)} <strong>${sanitize(appt.serviceName)}</strong></div>
    <div class="confirm-row">📅 <strong>${sanitize(formatDate(appt.date))}</strong></div>
    <div class="confirm-row">🕐 <strong>${sanitize(appt.time)}</strong></div>
    <div class="confirm-row">👤 <strong>${sanitize(appt.clientName)}</strong></div>
  `;

  const settings = getSettings();
  const msg = `היי ליאן! 💅\nקבעתי תור:\n✨ ${appt.serviceName}\n📅 ${formatDate(appt.date)}\n🕐 ${appt.time}\n👤 ${appt.clientName}\n📞 ${appt.clientPhone}${appt.notes ? '\n📝 ' + appt.notes : ''}`;
  document.getElementById('confirmWA').href = `https://wa.me/${settings.waPhone}?text=${encodeURIComponent(msg)}`;

  // show whatsapp button - don't auto-open (blocked on mobile)
}
