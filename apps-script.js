// ── העתיקי את הקוד הזה ל-Apps Script ──

const SHEET_ID = '1lDnpOmrZx4dL2ydVZIHQFvQaisdLE469tYeYIOX84iI';
const CAL_NAME = 'Lian Rebekah Nails 💅';

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('תורים');
  if (!sheet) {
    sheet = ss.insertSheet('תורים');
    sheet.appendRow(['ID','שירות','תאריך','שעה','שם לקוחה','טלפון','הערות','סטטוס','נוצר ב']);
    sheet.getRange(1,1,1,9).setFontWeight('bold').setBackground('#c97a96').setFontColor('#fff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateCalendar() {
  const cals = CalendarApp.getCalendarsByName(CAL_NAME);
  if (cals.length > 0) return cals[0];
  return CalendarApp.createCalendar(CAL_NAME, { color: CalendarApp.Color.GRAPE });
}

function doGet(e) {
  const action = e.parameter.action || 'load';

  if (action === 'save') {
    try {
      const data = JSON.parse(decodeURIComponent(e.parameter.data));
      saveAppointment(data);
      return ContentService.createTextOutput(JSON.stringify({success:true}))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({success:false, error:err.message}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // action === 'load'
  try {
    const sheet = getSheet();
    if (sheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const result = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    saveAppointment(data);
    return ContentService.createTextOutput(JSON.stringify({success:true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success:false, error:err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveAppointment(data) {
  const sheet = getSheet();

  // בדוק אם כבר קיים
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow()-1,1), 1).getValues().flat();
  if (ids.includes(data.id)) return;

  sheet.appendRow([
    data.id,
    data.serviceName,
    data.date,
    data.time,
    data.clientName,
    data.clientPhone,
    data.notes || '',
    data.status || 'pending',
    new Date().toLocaleString('he-IL')
  ]);

  // הוסף ל-Google Calendar
  try {
    const cal = getOrCreateCalendar();
    const [y,m,d] = data.date.split('-').map(Number);
    const [h,min] = data.time.split(':').map(Number);
    const start = new Date(y, m-1, d, h, min);
    const end   = new Date(y, m-1, d, h, min + (Number(data.duration) || 60));
    cal.createEvent(
      `💅 ${data.serviceName} - ${data.clientName}`,
      start, end,
      { description: `📞 ${data.clientPhone}\n📝 ${data.notes || '-'}` }
    );
  } catch(calErr) {
    console.warn('Calendar error:', calErr);
  }
}
