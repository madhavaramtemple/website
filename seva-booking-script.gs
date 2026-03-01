// ============================================================
// SEVA BOOKING BACKEND — Google Apps Script
// Deploy as a Web App: Execute as "Me", Access "Anyone"
// Then paste the deployment URL into script.js SEVA_SCRIPT_URL
// ============================================================

var SPREADSHEET_ID = 'REPLACE_WITH_YOUR_SPREADSHEET_ID';
var BOOKINGS_SHEET = 'Bookings';
var CONFIG_SHEET = 'Config';

// ---- CONFIG READER ----
function getConfig(key) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var data = ss.getSheetByName(CONFIG_SHEET).getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

// ---- HEALTH CHECK ----
function doGet(e) {
  return _jsonResponse({ status: 'ok', message: 'Seva booking service is running' });
}

// ---- RECEIVE BOOKING FROM FRONTEND ----
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Verify API secret
    var expectedSecret = getConfig('API_SECRET');
    if (data.apiSecret !== expectedSecret) {
      return _jsonResponse({ success: false, error: 'Unauthorized' });
    }

    // Validate required fields
    if (!data.name || !data.phone || !data.occasion || !data.poojaMonth || !data.poojaDay || !data.paymentId) {
      return _jsonResponse({ success: false, error: 'Missing required fields' });
    }

    var month = parseInt(data.poojaMonth);
    var day = parseInt(data.poojaDay);
    var maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > maxDays[month - 1]) {
      return _jsonResponse({ success: false, error: 'Invalid month/day' });
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(BOOKINGS_SHEET);

    // Generate booking ID: SEVA-YYYYMMDD-NNN
    var istNow = _toIST(new Date());
    var dateStr = Utilities.formatDate(istNow, 'Asia/Kolkata', 'yyyyMMdd');
    var lastRow = sheet.getLastRow();
    var seqNum = 1;
    if (lastRow > 1) {
      var lastId = sheet.getRange(lastRow, 1).getValue().toString();
      var match = lastId.match(/SEVA-(\d{8})-(\d{3})/);
      if (match && match[1] === dateStr) seqNum = parseInt(match[2]) + 1;
    }
    var bookingId = 'SEVA-' + dateStr + '-' + ('00' + seqNum).slice(-3);

    // Calculate next pooja date
    var nextDate = calculateNextPoojaDate(month, day);
    var nextDateFormatted = Utilities.formatDate(nextDate, 'Asia/Kolkata', 'yyyy-MM-dd');

    // Sanitize inputs
    var s = _sanitize;

    // Append row (columns A through U)
    sheet.appendRow([
      bookingId,                                                    // A: BookingID
      Utilities.formatDate(istNow, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'), // B: Timestamp
      s(data.name),                                                 // C: DevoteeName
      s(data.phone),                                                // D: Phone
      s(data.occasion),                                             // E: Occasion
      month,                                                        // F: PoojaMonth
      day,                                                          // G: PoojaDay
      s(data.gotra || ''),                                          // H: Gotra
      s(data.nakshatra || ''),                                      // I: Nakshatra
      s(data.mode || 'inperson'),                                   // J: Mode
      s(data.address || ''),                                        // K: Address
      s(data.specialRequests || ''),                                // L: SpecialRequests
      s(data.paymentId),                                            // M: RazorpayPaymentID
      516,                                                          // N: AmountPaid
      nextDateFormatted,                                            // O: NextPoojaDate
      'Active',                                                     // P: Status
      '', '', '', '',                                               // Q-T: Reminder timestamps
      ''                                                            // U: LastReminderError
    ]);

    return _jsonResponse({ success: true, bookingId: bookingId, nextPoojaDate: nextDateFormatted });
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return _jsonResponse({ success: false, error: err.toString() });
  }
}

// ---- DATE CALCULATIONS ----

function calculateNextPoojaDate(month, day) {
  var ist = _toIST(new Date());
  var year = ist.getFullYear();
  var curMonth = ist.getMonth() + 1;
  var curDay = ist.getDate();

  var target = _resolveDate(year, month, day);
  // If the date has already passed this year, use next year
  if (target.getMonth() + 1 < curMonth ||
      (target.getMonth() + 1 === curMonth && target.getDate() < curDay)) {
    target = _resolveDate(year + 1, month, day);
  }
  return target;
}

function _resolveDate(year, month, day) {
  // Feb 29 in non-leap year → March 1
  if (month === 2 && day === 29 && !_isLeapYear(year)) {
    return new Date(year, 2, 1); // March 1 (month is 0-indexed)
  }
  return new Date(year, month - 1, day);
}

function _isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// ---- DAILY REMINDER TRIGGER ----
// Runs at ~4:50 AM IST daily. Checks all active bookings.

function sendDailyReminders() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(BOOKINGS_SHEET);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // Only header row

  var today = _toIST(new Date());
  var todayStr = Utilities.formatDate(today, 'Asia/Kolkata', 'yyyy-MM-dd');
  var in7Str = Utilities.formatDate(_addDays(today, 7), 'Asia/Kolkata', 'yyyy-MM-dd');
  var in3Str = Utilities.formatDate(_addDays(today, 3), 'Asia/Kolkata', 'yyyy-MM-dd');

  var priestBookings = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[15] !== 'Active') continue; // Column P: Status

    var nextPooja = row[14]; // Column O: NextPoojaDate
    var poojaStr = (nextPooja instanceof Date)
      ? Utilities.formatDate(nextPooja, 'Asia/Kolkata', 'yyyy-MM-dd')
      : nextPooja.toString();

    var phone = row[3].toString();
    var name = row[2];
    var occasion = row[4];
    var poojaMonth = row[5];
    var poojaDay = row[6];
    var mode = row[9];
    var rowIdx = i + 1; // 1-based sheet row

    // Column indices (1-based for sheet.getRange)
    var COL_R7 = 17, COL_R3 = 18, COL_RD = 19, COL_PR = 20, COL_ERR = 21;

    // 7-day reminder
    if (poojaStr === in7Str && !row[16]) {
      var res = sendWhatsAppReminder(phone, name, occasion, poojaStr, mode, '7day');
      if (res.success) sheet.getRange(rowIdx, COL_R7).setValue(_nowIST());
      else sheet.getRange(rowIdx, COL_ERR).setValue('7day: ' + res.error);
    }

    // 3-day reminder
    if (poojaStr === in3Str && !row[17]) {
      var res = sendWhatsAppReminder(phone, name, occasion, poojaStr, mode, '3day');
      if (res.success) sheet.getRange(rowIdx, COL_R3).setValue(_nowIST());
      else sheet.getRange(rowIdx, COL_ERR).setValue('3day: ' + res.error);
    }

    // Same-day donor reminder
    if (poojaStr === todayStr && !row[18]) {
      var res = sendWhatsAppReminder(phone, name, occasion, poojaStr, mode, 'sameday');
      if (res.success) sheet.getRange(rowIdx, COL_RD).setValue(_nowIST());
      else sheet.getRange(rowIdx, COL_ERR).setValue('sameday: ' + res.error);

      priestBookings.push({
        name: name, phone: phone, occasion: occasion, mode: mode,
        gotra: row[7], nakshatra: row[8], address: row[10],
        requests: row[11], rowIndex: rowIdx
      });
    }

    // Annual rollover: after pooja day, advance NextPoojaDate to next year
    if (poojaStr === todayStr) {
      var nextYear = _resolveDate(_toIST(new Date()).getFullYear() + 1, poojaMonth, poojaDay);
      sheet.getRange(rowIdx, 15).setValue(Utilities.formatDate(nextYear, 'Asia/Kolkata', 'yyyy-MM-dd'));
      // Clear reminder timestamps for next cycle
      sheet.getRange(rowIdx, COL_R7).setValue('');
      sheet.getRange(rowIdx, COL_R3).setValue('');
      sheet.getRange(rowIdx, COL_RD).setValue('');
      sheet.getRange(rowIdx, COL_PR).setValue('');
    }
  }

  // Batch priest notification for all today's poojas
  if (priestBookings.length > 0) {
    var res = sendPriestNotification(priestBookings);
    var ts = _nowIST();
    for (var j = 0; j < priestBookings.length; j++) {
      if (res.success) sheet.getRange(priestBookings[j].rowIndex, 20).setValue(ts);
      else sheet.getRange(priestBookings[j].rowIndex, 21).setValue('priest: ' + res.error);
    }
  }

  Logger.log('Daily reminders completed. Processed ' + (data.length - 1) + ' bookings.');
}

// ---- WHATSAPP CLOUD API ----

function sendWhatsAppReminder(phone, name, occasion, poojaDate, mode, reminderType) {
  var phoneNumberId = getConfig('WHATSAPP_PHONE_NUMBER_ID');
  var accessToken = getConfig('WHATSAPP_ACCESS_TOKEN');

  var templateMap = {
    '7day': getConfig('TEMPLATE_REMINDER_7DAY') || 'seva_reminder_7day',
    '3day': getConfig('TEMPLATE_REMINDER_3DAY') || 'seva_reminder_3day',
    'sameday': getConfig('TEMPLATE_REMINDER_SAMEDAY') || 'seva_reminder_sameday'
  };
  var templateName = templateMap[reminderType];
  if (!templateName) return { success: false, error: 'Unknown reminder type' };

  var fullPhone = '91' + phone.replace(/^\+?91/, '');
  var dateObj = new Date(poojaDate + 'T00:00:00+05:30');
  var displayDate = Utilities.formatDate(dateObj, 'Asia/Kolkata', 'dd MMMM yyyy');
  var modeText = (mode === 'online') ? 'Online Video Pooja' : 'In-Person at Temple';

  var payload = {
    messaging_product: 'whatsapp',
    to: fullPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: name },
          { type: 'text', text: occasion },
          { type: 'text', text: displayDate },
          { type: 'text', text: modeText }
        ]
      }]
    }
  };

  return _callWhatsAppAPI(phoneNumberId, accessToken, payload);
}

function sendPriestNotification(bookings) {
  var phoneNumberId = getConfig('WHATSAPP_PHONE_NUMBER_ID');
  var accessToken = getConfig('WHATSAPP_ACCESS_TOKEN');
  var priestPhone = getConfig('PRIEST_PHONE') || '919440562447';
  var templateName = getConfig('TEMPLATE_PRIEST_NOTIFY') || 'seva_priest_notification';

  var summary = '';
  for (var i = 0; i < bookings.length; i++) {
    var b = bookings[i];
    summary += (i + 1) + '. ' + b.name + ' | ' + b.occasion
      + ' | ' + (b.mode === 'online' ? 'Online' : 'In-Person')
      + ' | Ph: ' + b.phone;
    if (b.gotra) summary += ' | Gotra: ' + b.gotra;
    if (b.nakshatra) summary += ' | Nakshatra: ' + b.nakshatra;
    summary += '\n';
  }

  var payload = {
    messaging_product: 'whatsapp',
    to: priestPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: bookings.length.toString() },
          { type: 'text', text: summary.trim() }
        ]
      }]
    }
  };

  return _callWhatsAppAPI(phoneNumberId, accessToken, payload);
}

function _callWhatsAppAPI(phoneNumberId, accessToken, payload) {
  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp API not configured (missing phone_number_id or access_token)' };
  }

  var url = 'https://graph.facebook.com/v17.0/' + phoneNumberId + '/messages';
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  // Retry up to 3 times with exponential backoff
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      var body = JSON.parse(response.getContentText());

      if (code >= 200 && code < 300) {
        return { success: true, messageId: body.messages[0].id };
      }
      if (code === 429) { Utilities.sleep(attempt * 2000); continue; }

      Logger.log('WhatsApp API error (attempt ' + attempt + '): ' + JSON.stringify(body));
      if (attempt === 3) {
        return { success: false, error: 'HTTP ' + code + ': ' + (body.error ? body.error.message : 'Unknown') };
      }
    } catch (err) {
      Logger.log('WhatsApp API exception (attempt ' + attempt + '): ' + err.toString());
      if (attempt === 3) return { success: false, error: err.toString() };
      Utilities.sleep(attempt * 2000);
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

// ---- TRIGGER SETUP ----
// Run this ONCE manually: Apps Script Editor → Run → setupDailyTrigger

function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDailyReminders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('sendDailyReminders')
    .timeBased()
    .everyDays(1)
    .atHour(4)
    .nearMinute(50)
    .inTimezone('Asia/Kolkata')
    .create();
  Logger.log('Daily trigger set for ~4:50 AM IST');
}

// ---- UTILITIES ----

function _toIST(date) {
  var utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (5.5 * 3600000));
}

function _addDays(date, days) {
  var result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function _nowIST() {
  return Utilities.formatDate(_toIST(new Date()), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
}

function _sanitize(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/^[=+\-@]/, '');
}

function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
