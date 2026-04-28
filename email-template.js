function sendNewAppointmentEmail(data) {
  const subject = '💅 תור חדש - ' + data.clientName + ' | ' + data.date + ' ' + data.time;
  const htmlBody = '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">'
    + '<div style="background:linear-gradient(135deg,#1a0810,#4a1528);padding:28px;border-radius:16px 16px 0 0;text-align:center;">'
    + '<h1 style="color:#fff;margin:0;font-size:24px;">💅 Lian Rebekah Nails</h1>'
    + '<p style="color:#e8a4b8;margin:8px 0 0;">תור חדש נקבע!</p>'
    + '</div>'
    + '<div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">'
    + '<table style="width:100%;border-collapse:collapse;">'
    + '<tr><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;"><strong>👤 שם</strong></td><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;">' + data.clientName + '</td></tr>'
    + '<tr><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;"><strong>📞 טלפון</strong></td><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;"><a href="tel:' + data.clientPhone + '">' + data.clientPhone + '</a></td></tr>'
    + '<tr><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;"><strong>✨ שירות</strong></td><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;">' + data.serviceName + '</td></tr>'
    + '<tr><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;"><strong>📅 תאריך</strong></td><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;">' + data.date + '</td></tr>'
    + '<tr><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;"><strong>🕐 שעה</strong></td><td style="padding:10px 0;border-bottom:1px solid #f0e0e8;">' + data.time + '</td></tr>'
    + (data.notes ? '<tr><td style="padding:10px 0;"><strong>📝 הערות</strong></td><td style="padding:10px 0;">' + data.notes + '</td></tr>' : '')
    + '</table>'
    + '<div style="text-align:center;margin-top:24px;">'
    + '<a href="' + ADMIN_URL + '" style="display:inline-block;background:#c97a96;color:#fff;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:16px;">כניסה לממשק ניהול ←</a>'
    + '</div>'
    + '</div>'
    + '</div>';

  GmailApp.sendEmail(ADMIN_EMAIL, subject, '', { htmlBody: htmlBody, name: 'Lian Rebekah Nails 💅' });
}
