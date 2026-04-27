// ── GOOGLE SHEETS + CALENDAR SYNC ──
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxAAZ1qzvkid1XkZJBH2dbIPUcJB5kraQZ1-UrgBoO48CHNEwN6thQAsrjNXa9g4Y1u1A/exec';

function saveToSheets(appt) {
  const slim = {
    id: appt.id, serviceName: appt.serviceName, duration: appt.duration,
    date: appt.date, time: appt.time, clientName: appt.clientName,
    clientPhone: appt.clientPhone, notes: appt.notes || '', status: appt.status,
  };
  // no-cors - לא נקבל תשובה אבל הבקשה עוברת
  fetch(WEBAPP_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(slim),
  }).catch(e => console.warn('Sheets sync failed:', e));
}

async function loadFromSheets() {
  return new Promise((resolve) => {
    const callbackName = 'sheetsCallback_' + Date.now();
    const url = WEBAPP_URL + '?action=load&callback=' + callbackName;
    window[callbackName] = (rows) => {
      delete window[callbackName];
      document.getElementById('jsonpScript')?.remove();
      if (!Array.isArray(rows) || rows.length === 0) { resolve(null); return; }
      const appts = rows.map(r => ({
        id:          String(r['ID'] || ''),
        serviceName: String(r['שירות'] || ''),
        serviceIcon: '💅',
        date:        String(r['תאריך'] || ''),
        time:        String(r['שעה'] || ''),
        clientName:  String(r['שם לקוחה'] || ''),
        clientPhone: String(r['טלפון'] || ''),
        notes:       String(r['הערות'] || ''),
        status:      String(r['סטטוס'] || 'pending'),
        duration:    60,
      })).filter(a => a.id && a.date);
      saveAppointments(appts);
      resolve(appts);
    };
    const script = document.createElement('script');
    script.id = 'jsonpScript';
    script.src = url;
    script.onerror = () => { resolve(null); };
    document.body.appendChild(script);
    setTimeout(() => { delete window[callbackName]; resolve(null); }, 8000);
  });
}

// ── SANITIZE ──
function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── DATA STORE ──
const DB = {
  get: (key, def) => { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

// ── DEFAULTS ──
const DEFAULT_SERVICES = [
  { id: 's1', name: 'לק ג\'ל קלאסי',       icon: '💅', duration: 60,  price: '' },
  { id: 's2', name: 'נייל ארט ועיצובים',   icon: '✨', duration: 90,  price: '' },
  { id: 's3', name: 'תוספות ואבנים',        icon: '💎', duration: 30,  price: '' },
  { id: 's4', name: 'טיפול ידיים',          icon: '🌸', duration: 45,  price: '' },
];

const DEFAULT_SETTINGS = {
  workDays: {
    0: { active: false, start: '10:00', end: '20:00' }, // ראשון
    1: { active: true,  start: '10:00', end: '20:00' },
    2: { active: true,  start: '10:00', end: '20:00' },
    3: { active: true,  start: '10:00', end: '20:00' },
    4: { active: true,  start: '10:00', end: '20:00' },
    5: { active: true,  start: '10:00', end: '20:00' },
    6: { active: false, start: '10:00', end: '14:00' }, // שבת
  },
  slotInterval: 15, // דקות בין slots
  waPhone: '972523937950',
  adminPass: '12341234',
  blockedDates: [], // ['2025-07-20', ...]
};

// ── INIT ──
function getServices() { return DB.get('services', DEFAULT_SERVICES); }
function getSettings() {
  const saved = DB.get('settings', null);
  if (!saved) return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    adminPass: saved.adminPass || DEFAULT_SETTINGS.adminPass,
    workDays: { ...DEFAULT_SETTINGS.workDays, ...saved.workDays },
    blockedDates: saved.blockedDates || [],
  };
}
function getAppointments() { return DB.get('appointments', []); }
function saveAppointments(arr) { DB.set('appointments', arr); }
function saveSettings(s) { DB.set('settings', s); }
function saveServices(s) { DB.set('services', s); }

// ── HELPERS ──
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getAvailableSlots(dateStr, durationMins) {
  const settings = getSettings();
  const date = new Date(dateStr);
  const dow = date.getDay();
  const day = settings.workDays[dow];
  if (!day || !day.active) return [];
  if (settings.blockedDates.includes(dateStr)) return [];

  const start = toMinutes(day.start);
  const end = toMinutes(day.end);
  const interval = settings.slotInterval;
  const appointments = getAppointments().filter(a => a.date === dateStr && a.status !== 'cancelled');

  const slots = [];
  for (let t = start; t + durationMins <= end; t += interval) {
    const slotEnd = t + durationMins;
    const conflict = appointments.some(a => {
      const aStart = toMinutes(a.time);
      const aEnd = aStart + a.duration;
      return t < aEnd && slotEnd > aStart;
    });
    if (!conflict) slots.push(fromMinutes(t));
  }
  return slots;
}

function isWorkDay(dateStr) {
  const settings = getSettings();
  const date = new Date(dateStr);
  const dow = date.getDay();
  const day = settings.workDays[dow];
  return day && day.active && !settings.blockedDates.includes(dateStr);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function sendWhatsApp(phone, msg) {
  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
}

// ── NOTIFICATIONS (PWA) ──
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function scheduleLocalNotification(title, body, fireAt) {
  const delay = fireAt - Date.now();
  if (delay <= 0) return;
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'Screenshot 2026-03-27 122808.png' });
    }
  }, delay);
}

function scheduleAppointmentReminders(appt) {
  const apptTime = new Date(`${appt.date}T${appt.time}`).getTime();
  const service = getServices().find(s => s.id === appt.serviceId);
  const svcName = service ? service.name : appt.serviceName;

  // 24 שעות לפני
  scheduleLocalNotification(
    '💅 תור מחר!',
    `${appt.clientName} - ${svcName} בשעה ${appt.time}`,
    apptTime - 24 * 60 * 60 * 1000
  );
  // שעה לפני
  scheduleLocalNotification(
    '💅 תור בעוד שעה!',
    `${appt.clientName} - ${svcName} בשעה ${appt.time}`,
    apptTime - 60 * 60 * 1000
  );
}
