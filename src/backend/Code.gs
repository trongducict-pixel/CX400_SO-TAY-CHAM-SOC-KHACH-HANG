/**
 * =========================================================================
 * SỔ TAY QHKH – QUẢN LÝ & CHĂM SÓC KHÁCH HÀNG
 * Backend Google Apps Script (Production Ready)
 * =========================================================================
 * 
 * Hướng dẫn triển khai nhanh:
 * 1. Mở Google Sheets của bạn.
 * 2. Vào Tiện ích mở rộng > Apps Script (Extensions > Apps Script).
 * 3. Xoá hết code cũ và dán toàn bộ nội dung file này vào Code.gs.
 * 4. Chạy hàm: setupDatabase() lần đầu tiên để tự động tạo 6 Sheet chuẩn.
 * 5. Chạy hàm: setupTriggers() để tạo trigger tự động kiểm tra chăm sóc hàng ngày.
 * 6. Bấm Triển khai (Deploy) > Tùy chọn triển khai mới (New deployment):
 *    - Chọn loại: Ứng dụng web (Web app)
 *    - Thực thi dưới dạng: Tôi (Execute as: Me)
 *    - Người có quyền truy cập: Bất kỳ ai (Who has access: Anyone)
 * 7. Copy URL Web App (kết thúc bằng /exec) và dán vào phần Cài đặt của WebApp!
 */

const SHEET_NAMES = {
  KHACH_HANG: 'KHACH_HANG',
  LICH_SU_GAP: 'LICH_SU_GAP',
  CONG_VIEC: 'CONG_VIEC',
  SU_KIEN_CHAM_SOC: 'SU_KIEN_CHAM_SOC',
  EMAIL_CONFIG: 'EMAIL_CONFIG',
  EMAIL_LOG: 'EMAIL_LOG'
};

/**
 * Xử lý yêu cầu HTTP GET từ Frontend WebApp
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Xử lý yêu cầu HTTP POST từ Frontend WebApp
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Bộ định tuyến (Router) xử lý API tập trung, trả về JSON chuẩn
 */
function handleRequest(e, method) {
  var output = {
    success: false,
    message: '',
    data: null,
    error: null
  };

  try {
    var params = {};
    if (method === 'GET') {
      params = (e && e.parameter) ? e.parameter : {};
    } else {
      if (e && e.postData && e.postData.contents) {
        try {
          params = JSON.parse(e.postData.contents);
        } catch (err) {
          params = e.parameter || {};
        }
      } else {
        params = (e && e.parameter) ? e.parameter : {};
      }
    }

    var action = params.action || 'ping';

    switch (action) {
      case 'ping':
      case 'healthCheck':
        output = getSystemHealth();
        break;

      case 'setupDatabase':
        output = setupDatabase();
        break;

      case 'setupTriggers':
        output = setupTriggers();
        break;

      case 'getInitialData':
        output = getInitialData(params.userEmail, params.userRole);
        break;

      case 'getCustomers':
        output = getCustomers(params.userEmail, params.userRole);
        break;

      case 'addCustomer':
        output = addCustomer(params.customer);
        break;

      case 'updateCustomer':
        output = updateCustomer(params.customer);
        break;

      case 'toggleCareMode':
        output = toggleCareMode(params.idKh, params.cheDoChamSoc);
        break;

      case 'recordMeeting':
        output = recordMeeting(params.meeting, params.newTask);
        break;

      case 'createTask':
        output = createTask(params.task);
        break;

      case 'updateTaskStatus':
        output = updateTaskStatus(params.idCongViec, params.trangThai);
        break;

      case 'saveCareEvent':
        output = saveCareEvent(params.careEvent);
        break;

      case 'deleteCareEvent':
        output = deleteCareEvent(params.idSuKien);
        break;

      case 'updateEmailConfig':
        output = updateEmailConfig(params.config);
        break;

      case 'sendTestEmail':
        output = sendTestEmail(params.targetEmail);
        break;

      case 'manualCheckCareReminders':
        output = manualCheckCareReminders();
        break;

      case 'getEmailLogs':
        output = getEmailLogs(params.statusFilter);
        break;

      default:
        output.success = false;
        output.message = 'Hành động (action) không hợp lệ: ' + action;
        break;
    }

  } catch (err) {
    output.success = false;
    output.message = 'Lỗi xử lý máy chủ Apps Script: ' + err.toString();
    output.error = err.stack || err.toString();
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * =========================================================================
 * I. THIẾT LẬP VÀ KIỂM TRA DATABASE (GOOGLE SHEETS)
 * =========================================================================
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return { success: false, message: 'Không thể mở Spreadsheet hiện tại. Vui lòng kiểm tra quyền.' };
  }

  var createdSheets = [];

  // 1. KHACH_HANG
  var khHeaders = [
    'ID_KH', 'HO_TEN', 'SDT', 'NGAY_SINH', 'DIA_CHI', 
    'LATITUDE', 'LONGITUDE', 'GOOGLE_MAP_URL', 'NGANH_NGHE', 
    'NHU_CAU', 'GHI_CHU', 'PHAN_LOAI', 'CHE_DO_CHAM_SOC', 
    'CAN_BO_PHU_TRACH', 'EMAIL_CAN_BO', 'NGAY_TAO', 'NGAY_CAP_NHAT', 'TRANG_THAI'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.KHACH_HANG, khHeaders, createdSheets);

  // 2. LICH_SU_GAP
  var lsgHeaders = [
    'ID_LICH_SU', 'ID_KH', 'THOI_GIAN_GAP', 'HINH_THUC_GAP', 
    'LATITUDE', 'LONGITUDE', 'GOOGLE_MAP_URL', 'NOI_DUNG_TRAO_DOI', 
    'NHU_CAU_KHACH_HANG', 'TINH_TRANG_SAU_GAP', 'CONG_VIEC_TIEP_THEO', 
    'NGAY_HEN_LIEN_HE', 'GHI_CHU', 'CAN_BO_THUC_HIEN', 'THOI_GIAN_CAP_NHAT'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.LICH_SU_GAP, lsgHeaders, createdSheets);

  // 3. CONG_VIEC
  var cvHeaders = [
    'ID_CONG_VIEC', 'ID_KH', 'NOI_DUNG', 'NGAY_HAN', 
    'CAN_BO', 'TRANG_THAI', 'NGAY_TAO', 'NGAY_HOAN_THANH', 'GHI_CHU'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.CONG_VIEC, cvHeaders, createdSheets);

  // 4. SU_KIEN_CHAM_SOC
  var skHeaders = [
    'ID_SU_KIEN', 'TEN_SU_KIEN', 'NGAY', 'LOAI', 'SO_NGAY_NHAC_TRUOC', 'TRANG_THAI'
  ];
  var skSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.SU_KIEN_CHAM_SOC, skHeaders, createdSheets);
  if (skSheet.getLastRow() === 1) {
    // Seed default care events
    var defaultEvents = [
      ['SK_01', 'Sinh nhật', 'SINH_NHAT', 'SinhNhat', 3, 'Bật'],
      ['SK_02', 'Ngày Quốc tế Phụ nữ 8/3', '08/03', 'NgayLe', 3, 'Bật'],
      ['SK_03', 'Ngày Phụ nữ Việt Nam 20/10', '20/10', 'NgayLe', 3, 'Bật'],
      ['SK_04', 'Ngày Thương binh Liệt sĩ 27/7', '27/07', 'NgayLe', 2, 'Bật'],
      ['SK_05', 'Quốc khánh 2/9', '02/09', 'NgayLe', 3, 'Bật'],
      ['SK_06', 'Tết Nguyên Đán', '01/01_AL', 'Tet', 7, 'Bật'],
      ['SK_07', 'Ngày Doanh nhân Việt Nam 13/10', '13/10', 'NgayLe', 3, 'Bật']
    ];
    skSheet.getRange(2, 1, defaultEvents.length, defaultEvents[0].length).setValues(defaultEvents);
  }

  // 5. EMAIL_CONFIG
  var cfgHeaders = ['KEY', 'VALUE'];
  var cfgSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.EMAIL_CONFIG, cfgHeaders, createdSheets);
  if (cfgSheet.getLastRow() === 1) {
    var defaultConfigs = [
      ['ADMIN_EMAIL', Session.getActiveUser().getEmail() || 'admin.crm@bank.com.vn'],
      ['EMAIL_FROM_NAME', 'Sổ Tay QHKH - CRM Bank'],
      ['EMAIL_ENABLED', 'true'],
      ['REMINDER_DAYS', '7,3,1'],
      ['TEST_EMAIL', Session.getActiveUser().getEmail() || 'trongduc.ict@gmail.com'],
      ['APP_URL', 'https://crm-pocket-bank.web.app']
    ];
    cfgSheet.getRange(2, 1, defaultConfigs.length, defaultConfigs[0].length).setValues(defaultConfigs);
  }

  // 6. EMAIL_LOG
  var logHeaders = [
    'ID_LOG', 'THOI_GIAN', 'ID_KH', 'HO_TEN_KH', 'EMAIL_NHAN', 
    'LOAI_SU_KIEN', 'NGAY_SU_KIEN', 'SO_NGAY_TRUOC', 'THOI_GIAN_GUI', 
    'TRANG_THAI', 'LOI_CHI_TIET', 'MESSAGE_ID_NHAP_NEU_CO'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.EMAIL_LOG, logHeaders, createdSheets);

  return {
    success: true,
    message: 'Thiết lập Database thành công! Đã kiểm tra 6 Sheets: KHACH_HANG, LICH_SU_GAP, CONG_VIEC, SU_KIEN_CHAM_SOC, EMAIL_CONFIG, EMAIL_LOG.',
    data: { createdSheets: createdSheets }
  };
}

function ensureSheetWithHeaders(ss, sheetName, headers, createdList) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    sheet.setFrozenRows(1);
    createdList.push(sheetName);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Kiểm tra trạng thái hệ thống (System Health)
 */
function getSystemHealth() {
  var startTime = new Date().getTime();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetOk = false;
  var sheetCount = 0;
  var sheetMsg = '';

  if (ss) {
    var sheets = ss.getSheets();
    sheetCount = sheets.length;
    var missing = [];
    Object.keys(SHEET_NAMES).forEach(function(k) {
      if (!ss.getSheetByName(SHEET_NAMES[k])) {
        missing.push(SHEET_NAMES[k]);
      }
    });
    if (missing.length === 0) {
      sheetOk = true;
      sheetMsg = 'Tất cả 6 bảng dữ liệu Google Sheets hoạt động tốt.';
    } else {
      sheetMsg = 'Thiếu các bảng: ' + missing.join(', ') + '. Vui lòng chạy setupDatabase()!';
    }
  } else {
    sheetMsg = 'Không kết nối được Google Spreadsheet.';
  }

  // Check Email Service
  var emailConfig = getEmailConfigMap();
  var emailQuota = 0;
  try {
    emailQuota = MailApp.getRemainingDailyQuota();
  } catch (e) {}

  var triggers = ScriptApp.getProjectTriggers();
  var careTriggerExists = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkCareReminders') {
      careTriggerExists = true;
      break;
    }
  }

  var responseTime = new Date().getTime() - startTime;

  return {
    success: true,
    message: 'Kiểm tra trạng thái hệ thống hoàn tất.',
    data: {
      googleSheet: {
        status: sheetOk ? 'OK' : 'ERROR',
        details: sheetMsg,
        sheetCount: sheetCount
      },
      appsScriptApi: {
        status: 'OK',
        details: 'API Apps Script Web App phản hồi tốt.',
        responseTimeMs: responseTime
      },
      emailService: {
        status: (emailConfig.EMAIL_ENABLED === 'true' && emailConfig.ADMIN_EMAIL) ? 'OK' : 'WARNING',
        details: 'MailApp Quota còn lại: ' + emailQuota + ' email/ngày.',
        configuredEmail: emailConfig.ADMIN_EMAIL || '',
        enabled: emailConfig.EMAIL_ENABLED === 'true',
        quotaRemaining: emailQuota
      },
      trigger: {
        status: careTriggerExists ? 'OK' : 'WARNING',
        details: careTriggerExists ? 'Trigger tự động hàng ngày (checkCareReminders) đang chạy.' : 'Chưa thiết lập trigger tự động. Hãy chạy setupTriggers()!',
        activeTriggersCount: triggers.length
      },
      config: {
        status: 'OK',
        details: 'Cấu hình hệ thống sẵn sàng.'
      }
    }
  };
}

/**
 * =========================================================================
 * II. CƠ CHẾ TRIGGER TỰ ĐỘNG
 * =========================================================================
 */
function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var removedCount = 0;

  // 1. Xóa các trigger cũ của hàm checkCareReminders
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkCareReminders') {
      ScriptApp.deleteTrigger(triggers[i]);
      removedCount++;
    }
  }

  // 2. Tạo trigger duy nhất chạy mỗi ngày lúc 7 giờ sáng
  ScriptApp.newTrigger('checkCareReminders')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  return {
    success: true,
    message: 'Đã thiết lập Trigger tự động thành công! Đã dọn dẹp ' + removedCount + ' trigger cũ và tạo 1 trigger chạy lúc 07:00 hàng ngày.'
  };
}

/**
 * =========================================================================
 * III. KIỂM TRA CHĂM SÓC & CHỐNG GỬI EMAIL TRÙNG LẶP
 * =========================================================================
 */
function manualCheckCareReminders() {
  var result = checkCareReminders();
  return {
    success: true,
    message: 'Đã hoàn thành kiểm tra chăm sóc khách hàng thủ công.',
    data: result
  };
}

function checkCareReminders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var khSheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  var skSheet = ss.getSheetByName(SHEET_NAMES.SU_KIEN_CHAM_SOC);
  var logSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_LOG);
  var config = getEmailConfigMap();

  if (!khSheet || !skSheet || !logSheet) {
    return { error: 'Thiếu bảng dữ liệu cần thiết.' };
  }

  if (config.EMAIL_ENABLED !== 'true') {
    return { message: 'Chức năng gửi email đang Tắt (EMAIL_ENABLED=false).' };
  }

  var customers = sheetToObjects(khSheet);
  var events = sheetToObjects(skSheet);
  var sentLogs = sheetToObjects(logSheet);

  // Set anti-duplicate lookup: ID_KH + LOAI_SU_KIEN + NGAY_SU_KIEN + SO_NGAY_TRUOC (status: SENT)
  var sentCache = {};
  sentLogs.forEach(function(log) {
    if (String(log.TRANG_THAI).toUpperCase() === 'SENT') {
      var key = String(log.ID_KH) + '|' + String(log.LOAI_SU_KIEN) + '|' + String(log.NGAY_SU_KIEN) + '|' + String(log.SO_NGAY_TRUOC);
      sentCache[key] = true;
    }
  });

  var reminderDays = (config.REMINDER_DAYS || '7,3,1').split(',').map(function(d) {
    return parseInt(d.trim(), 10);
  }).filter(function(n) { return !isNaN(n); });

  var today = new Date();
  var todayDay = today.getDate();
  var todayMonth = today.getMonth() + 1; // 1-12
  var todayYear = today.getFullYear();

  var sendCount = 0;
  var skipCount = 0;
  var failCount = 0;
  var processedDetails = [];

  // Lọc chỉ những khách hàng CHE_DO_CHAM_SOC = 'Bật'
  var activeCustomers = customers.filter(function(c) {
    return String(c.CHE_DO_CHAM_SOC).trim() === 'Bật';
  });

  activeCustomers.forEach(function(cust) {
    var recipientEmail = cust.EMAIL_CAN_BO || config.ADMIN_EMAIL;
    if (!recipientEmail) return;

    // 1. Kiểm tra Sinh nhật
    if (cust.NGAY_SINH) {
      var bday = parseDateStr(cust.NGAY_SINH);
      if (bday) {
        var daysUntil = getDaysUntilNextAnniversary(bday.day, bday.month, today);
        if (reminderDays.indexOf(daysUntil) !== -1 || daysUntil === 0) {
          var eventKey = 'SINH_NHAT';
          var eventDateStr = pad2(bday.day) + '/' + pad2(bday.month) + '/' + todayYear;
          var cacheKey = cust.ID_KH + '|' + eventKey + '|' + eventDateStr + '|' + daysUntil;

          if (sentCache[cacheKey]) {
            skipCount++;
            processedDetails.push({ customer: cust.HO_TEN, event: 'Sinh nhật', days: daysUntil, status: 'SKIPPED (Đã gửi)' });
          } else {
            var sentRes = sendCareReminderEmail(cust, 'Sinh nhật', eventDateStr, daysUntil, recipientEmail, config, logSheet);
            if (sentRes.success) {
              sentCache[cacheKey] = true;
              sendCount++;
            } else {
              failCount++;
            }
            processedDetails.push({ customer: cust.HO_TEN, event: 'Sinh nhật', days: daysUntil, status: sentRes.success ? 'SENT' : 'FAILED', error: sentRes.error });
          }
        }
      }
    }

    // 2. Kiểm tra các sự kiện khác trong SU_KIEN_CHAM_SOC
    events.forEach(function(evt) {
      if (String(evt.TRANG_THAI).trim() !== 'Bật') return;
      if (evt.LOAI === 'SinhNhat') return; // đã kiểm tra ở trên

      var evtDate = parseFixedDayMonth(evt.NGAY);
      if (evtDate) {
        var daysUntil = getDaysUntilNextAnniversary(evtDate.day, evtDate.month, today);
        var noticeDays = parseInt(evt.SO_NGAY_NHAC_TRUOC, 10) || 3;
        
        // Nhắc vào các mốc: noticeDays, hoặc 1 ngày trước, hoặc đúng ngày
        var eligibleDays = [noticeDays, 1, 0];
        if (eligibleDays.indexOf(daysUntil) !== -1) {
          var eventKey = evt.TEN_SU_KIEN;
          var eventDateStr = pad2(evtDate.day) + '/' + pad2(evtDate.month) + '/' + todayYear;
          var cacheKey = cust.ID_KH + '|' + eventKey + '|' + eventDateStr + '|' + daysUntil;

          if (sentCache[cacheKey]) {
            skipCount++;
            processedDetails.push({ customer: cust.HO_TEN, event: evt.TEN_SU_KIEN, days: daysUntil, status: 'SKIPPED (Đã gửi)' });
          } else {
            var sentRes = sendCareReminderEmail(cust, evt.TEN_SU_KIEN, eventDateStr, daysUntil, recipientEmail, config, logSheet);
            if (sentRes.success) {
              sentCache[cacheKey] = true;
              sendCount++;
            } else {
              failCount++;
            }
            processedDetails.push({ customer: cust.HO_TEN, event: evt.TEN_SU_KIEN, days: daysUntil, status: sentRes.success ? 'SENT' : 'FAILED', error: sentRes.error });
          }
        }
      }
    });
  });

  return {
    totalChecked: activeCustomers.length,
    sent: sendCount,
    skipped: skipCount,
    failed: failCount,
    details: processedDetails
  };
}

/**
 * Gửi email nhắc chăm sóc khách hàng và ghi log
 */
function sendCareReminderEmail(cust, tenSuKien, ngaySuKien, soNgayTruoc, recipientEmail, config, logSheet) {
  var logId = 'LOG_' + Utilities.getUuid().slice(0, 8);
  var now = new Date();
  var timestamp = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  var dayLabel = soNgayTruoc === 0 ? 'HÔM NAY' : (soNgayTruoc + ' ngày tới');
  var subject = '[CRM CARE] Nhắc chăm sóc khách hàng – ' + tenSuKien + ' (' + dayLabel + ')';

  var appUrl = config.APP_URL || 'https://crm-pocket-bank.web.app';
  var customerProfileUrl = appUrl + '?customerId=' + encodeURIComponent(cust.ID_KH);
  var mapUrl = cust.GOOGLE_MAP_URL || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(cust.DIA_CHI || cust.HO_TEN));

  var body = 
    'Kính gửi Cán bộ QHKH (' + (cust.CAN_BO_PHU_TRACH || 'Phụ trách') + '),\n\n' +
    'Hệ thống CRM nhắc lịch chăm sóc khách hàng:\n\n' +
    '--- THÔNG TIN KHÁCH HÀNG ---\n' +
    'Họ tên: ' + (cust.HO_TEN || '') + '\n' +
    'SĐT: ' + (cust.SDT || '') + '\n' +
    'Phân loại: ' + (cust.PHAN_LOAI || '') + '\n' +
    'Ngày sinh: ' + (cust.NGAY_SINH || '') + '\n' +
    'Địa chỉ: ' + (cust.DIA_CHI || '') + '\n' +
    'Ngành nghề: ' + (cust.NGANH_NGHE || '') + '\n' +
    'Nhu cầu hiện tại: ' + (cust.NHU_CAU || 'Chưa ghi nhận') + '\n\n' +
    '--- SỰ KIỆN CHĂM SÓC ---\n' +
    'Sự kiện: ' + tenSuKien + '\n' +
    'Ngày diễn ra: ' + ngaySuKien + ' (' + dayLabel + ')\n\n' +
    'Đề nghị cán bộ thực hiện liên hệ, gặp gỡ hoặc gửi quà/lời chúc chúc mừng khách hàng kịp thời.\n\n' +
    '📍 Link Google Maps vị trí: ' + mapUrl + '\n' +
    '📱 Link mở hồ sơ khách hàng: ' + customerProfileUrl + '\n\n' +
    '---\n' +
    'Hệ thống Sổ Tay QHKH Ngân Hàng';

  var htmlBody = 
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#1e3a8a;color:#ffffff;padding:16px 20px;">' +
        '<h2 style="margin:0;font-size:18px;">[CRM CARE] Nhắc Chăm Sóc Khách Hàng</h2>' +
        '<p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Sự kiện: <strong>' + tenSuKien + '</strong> (' + dayLabel + ')</p>' +
      '</div>' +
      '<div style="padding:20px;background:#ffffff;color:#334155;font-size:14px;line-height:1.6;">' +
        '<p>Kính gửi Cán bộ: <strong>' + (cust.CAN_BO_PHU_TRACH || 'QHKH') + '</strong>,</p>' +
        '<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin:16px 0;">' +
          '<h3 style="margin:0 0 8px 0;font-size:15px;color:#1e3a8a;">' + cust.HO_TEN + ' <span style="font-size:12px;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:12px;">' + cust.PHAN_LOAI + '</span></h3>' +
          '<p style="margin:4px 0;">📞 <strong>SĐT:</strong> <a href="tel:' + cust.SDT + '">' + cust.SDT + '</a></p>' +
          '<p style="margin:4px 0;">🎂 <strong>Ngày sinh:</strong> ' + (cust.NGAY_SINH || 'Chưa cập nhật') + '</p>' +
          '<p style="margin:4px 0;">🏢 <strong>Ngành nghề:</strong> ' + (cust.NGANH_NGHE || 'Chưa rõ') + '</p>' +
          '<p style="margin:4px 0;">📍 <strong>Địa chỉ:</strong> ' + (cust.DIA_CHI || 'Chưa có') + '</p>' +
          '<p style="margin:4px 0;">💡 <strong>Nhu cầu:</strong> ' + (cust.NHU_CAU || 'Chưa ghi nhận') + '</p>' +
        '</div>' +
        '<p>Đề nghị cán bộ chủ động liên hệ tư vấn, gửi thiệp chúc mừng hoặc thăm gặp để duy trì mối quan hệ bền chặt.</p>' +
        '<div style="margin:20px 0;display:flex;gap:10px;">' +
          '<a href="' + customerProfileUrl + '" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;font-size:13px;">📱 Mở Hồ Sơ Trên App</a> ' +
          '<a href="' + mapUrl + '" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;font-size:13px;">📍 Xem Bản Đồ</a>' +
        '</div>' +
      '</div>' +
      '<div style="background:#f1f5f9;padding:12px 20px;text-align:center;font-size:12px;color:#64748b;">' +
        'Email được gửi tự động từ hệ thống Sổ Tay QHKH Ngân Hàng' +
      '</div>' +
    '</div>';

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      name: config.EMAIL_FROM_NAME || 'Sổ Tay QHKH'
    });

    logSheet.appendRow([
      logId, timestamp, cust.ID_KH, cust.HO_TEN, recipientEmail,
      tenSuKien, ngaySuKien, soNgayTruoc, timestamp, 'SENT', '', ''
    ]);

    return { success: true };
  } catch (err) {
    var errorMsg = err.toString();
    logSheet.appendRow([
      logId, timestamp, cust.ID_KH, cust.HO_TEN, recipientEmail,
      tenSuKien, ngaySuKien, soNgayTruoc, '', 'FAILED', errorMsg, ''
    ]);
    return { success: false, error: errorMsg };
  }
}

/**
 * Gửi email kiểm tra hệ thống (Test Email)
 */
function sendTestEmail(targetEmail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_LOG);
  var config = getEmailConfigMap();

  var recipient = targetEmail || config.TEST_EMAIL || config.ADMIN_EMAIL || Session.getActiveUser().getEmail();
  if (!recipient || recipient.indexOf('@') === -1) {
    return {
      success: false,
      message: 'Địa chỉ email người nhận không hợp lệ: ' + recipient,
      error: 'INVALID_EMAIL'
    };
  }

  var logId = 'TEST_' + Utilities.getUuid().slice(0, 8);
  var now = new Date();
  var timestamp = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  var subject = '[CRM CARE TEST] Kiểm Tra Hệ Thống Gửi Email - ' + timestamp;
  var body = 
    'Kính gửi Quản trị viên,\n\n' +
    'Đây là email kiểm tra chức năng gửi thông báo từ Google Apps Script Backend của Sổ Tay QHKH.\n\n' +
    'Trạng thái: Máy chủ Apps Script đã thực thi MailApp.sendEmail() thành công.\n' +
    'Thời gian: ' + timestamp + '\n' +
    'Cấu hình gửi: ' + (config.EMAIL_FROM_NAME || 'Sổ Tay QHKH') + '\n\n' +
    'Lưu ý: Nếu email nằm trong hòm thư Rác (Spam/Junk), vui lòng bấm "Không phải spam" để các thông báo sau được vào Hộp thư chính.\n\n' +
    'Trân trọng,\nSổ Tay QHKH CRM';

  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body,
      name: config.EMAIL_FROM_NAME || 'Sổ Tay QHKH'
    });

    if (logSheet) {
      logSheet.appendRow([
        logId, timestamp, 'SYSTEM_TEST', 'Kiểm tra hệ thống', recipient,
        'TEST_EMAIL', Utilities.formatDate(now, 'GMT+7', 'dd/MM/yyyy'), 0,
        timestamp, 'SENT', 'Gửi email test thành công qua MailApp.', ''
      ]);
    }

    return {
      success: true,
      message: 'Apps Script đã thực thi gửi email test thành công đến ' + recipient + '!',
      data: {
        recipient: recipient,
        logId: logId,
        timestamp: timestamp,
        note: 'Email có thể nằm trong Spam/Junk hoặc bị hệ thống email người nhận lọc.'
      }
    };
  } catch (err) {
    var errorMsg = err.toString();
    if (logSheet) {
      logSheet.appendRow([
        logId, timestamp, 'SYSTEM_TEST', 'Kiểm tra hệ thống', recipient,
        'TEST_EMAIL', Utilities.formatDate(now, 'GMT+7', 'dd/MM/yyyy'), 0,
        '', 'FAILED', errorMsg, ''
      ]);
    }
    return {
      success: false,
      message: 'Không gửi được email. Lỗi: ' + errorMsg,
      error: errorMsg
    };
  }
}

/**
 * =========================================================================
 * IV. CÁC HÀM CRUD & QUẢN LÝ DỮ LIỆU
 * =========================================================================
 */
function getInitialData(userEmail, userRole) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return { success: false, message: 'Spreadsheet chưa được khởi tạo.' };
  }

  var khSheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  var lsgSheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_GAP);
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);
  var skSheet = ss.getSheetByName(SHEET_NAMES.SU_KIEN_CHAM_SOC);
  var cfgSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_CONFIG);
  var logSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_LOG);

  var rawCustomers = khSheet ? sheetToObjects(khSheet) : [];
  var rawMeetings = lsgSheet ? sheetToObjects(lsgSheet) : [];
  var rawTasks = cvSheet ? sheetToObjects(cvSheet) : [];
  var rawEvents = skSheet ? sheetToObjects(skSheet) : [];
  var emailConfig = getEmailConfigMap();
  var rawLogs = logSheet ? sheetToObjects(logSheet) : [];

  // Transform keys to match frontend types
  var customers = rawCustomers.map(mapCustomerFromSheet);
  var meetings = rawMeetings.map(mapMeetingFromSheet);
  var tasks = rawTasks.map(mapTaskFromSheet);
  var events = rawEvents.map(mapEventFromSheet);
  var logs = rawLogs.map(mapLogFromSheet);

  // Phân quyền: Nếu role là QHKH, chỉ trả về khách hàng của cán bộ đó (nếu có email)
  if (userRole === 'QHKH' && userEmail) {
    var filteredKhIds = {};
    customers = customers.filter(function(c) {
      var match = (c.emailCanBo && c.emailCanBo.toLowerCase() === userEmail.toLowerCase()) ||
                  (c.canBoPhuTrach && userEmail.toLowerCase().indexOf(c.canBoPhuTrach.toLowerCase()) !== -1);
      if (match) filteredKhIds[c.idKh] = true;
      return match;
    });

    meetings = meetings.filter(function(m) {
      return filteredKhIds[m.idKh];
    });

    tasks = tasks.filter(function(t) {
      return filteredKhIds[t.idKh];
    });
  }

  return {
    success: true,
    message: 'Tải dữ liệu thành công.',
    data: {
      customers: customers,
      meetings: meetings,
      tasks: tasks,
      careEvents: events,
      emailConfig: {
        adminEmail: emailConfig.ADMIN_EMAIL || '',
        emailFromName: emailConfig.EMAIL_FROM_NAME || 'Sổ Tay QHKH',
        emailEnabled: emailConfig.EMAIL_ENABLED === 'true',
        reminderDays: emailConfig.REMINDER_DAYS || '7,3,1',
        testEmail: emailConfig.TEST_EMAIL || '',
        appUrl: emailConfig.APP_URL || ''
      },
      emailLogs: logs
    }
  };
}

function addCustomer(cust) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  if (!sheet) return { success: false, message: 'Bảng KHACH_HANG không tồn tại.' };

  var idKh = cust.idKh || ('KH_' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  var row = [
    idKh,
    cust.hoTen || '',
    cust.sdt || '',
    cust.ngaySinh || '',
    cust.diaChi || '',
    cust.latitude || '',
    cust.longitude || '',
    cust.googleMapUrl || '',
    cust.nganhNghe || '',
    cust.nhuCau || '',
    cust.ghiChu || '',
    cust.phanLoai || 'Đang tiếp thị',
    cust.cheDoChamSoc || 'Tắt',
    cust.canBoPhuTrach || '',
    cust.emailCanBo || '',
    nowStr,
    nowStr,
    cust.trangThai || 'Hoạt động'
  ];

  sheet.appendRow(row);
  cust.idKh = idKh;
  cust.ngayTao = nowStr;
  cust.ngayCapNhat = nowStr;

  return {
    success: true,
    message: 'Thêm khách hàng thành công.',
    data: cust
  };
}

function updateCustomer(cust) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  if (!sheet) return { success: false, message: 'Bảng KHACH_HANG không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(cust.idKh).trim()) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, message: 'Không tìm thấy khách hàng với mã: ' + cust.idKh };
  }

  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  var existingRow = data[rowIndex - 1];

  var updatedRow = [
    cust.idKh,
    cust.hoTen !== undefined ? cust.hoTen : existingRow[1],
    cust.sdt !== undefined ? cust.sdt : existingRow[2],
    cust.ngaySinh !== undefined ? cust.ngaySinh : existingRow[3],
    cust.diaChi !== undefined ? cust.diaChi : existingRow[4],
    cust.latitude !== undefined ? cust.latitude : existingRow[5],
    cust.longitude !== undefined ? cust.longitude : existingRow[6],
    cust.googleMapUrl !== undefined ? cust.googleMapUrl : existingRow[7],
    cust.nganhNghe !== undefined ? cust.nganhNghe : existingRow[8],
    cust.nhuCau !== undefined ? cust.nhuCau : existingRow[9],
    cust.ghiChu !== undefined ? cust.ghiChu : existingRow[10],
    cust.phanLoai !== undefined ? cust.phanLoai : existingRow[11],
    cust.cheDoChamSoc !== undefined ? cust.cheDoChamSoc : existingRow[12],
    cust.canBoPhuTrach !== undefined ? cust.canBoPhuTrach : existingRow[13],
    cust.emailCanBo !== undefined ? cust.emailCanBo : existingRow[14],
    existingRow[15], // preserve NGAY_TAO
    nowStr,          // NGAY_CAP_NHAT
    cust.trangThai !== undefined ? cust.trangThai : existingRow[17]
  ];

  sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);

  return {
    success: true,
    message: 'Cập nhật thông tin khách hàng thành công.',
    data: cust
  };
}

function toggleCareMode(idKh, mode) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  if (!sheet) return { success: false, message: 'Bảng KHACH_HANG không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idKh).trim()) {
      var targetMode = (mode === 'Bật' || mode === 'Tắt') ? mode : (data[i][12] === 'Bật' ? 'Tắt' : 'Bật');
      sheet.getRange(i + 1, 13).setValue(targetMode); // Cột 13: CHE_DO_CHAM_SOC
      var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(i + 1, 17).setValue(nowStr); // Cột 17: NGAY_CAP_NHAT
      return {
        success: true,
        message: 'Đã ' + (targetMode === 'Bật' ? 'Bật' : 'Tắt') + ' Chế độ chăm sóc cho khách hàng.',
        data: { idKh: idKh, cheDoChamSoc: targetMode }
      };
    }
  }

  return { success: false, message: 'Không tìm thấy khách hàng: ' + idKh };
}

/**
 * GHI NHẬN CUỘC GẶP KHÁCH HÀNG:
 * - Luôn tạo bản ghi MỚI trong LICH_SU_GAP (không bao giờ sửa bản ghi cũ)
 * - Cập nhật NGAY_CAP_NHAT trong KHACH_HANG
 * - Tự động tạo CONG_VIEC nếu có công việc tiếp theo
 */
function recordMeeting(meeting, newTask) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lsgSheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_GAP);
  var khSheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);

  if (!lsgSheet || !khSheet) {
    return { success: false, message: 'Bảng dữ liệu cuộc gặp không tồn tại.' };
  }

  var idLichSu = 'LS_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  var meetingRow = [
    idLichSu,
    meeting.idKh,
    meeting.thoiGianGap || nowStr,
    meeting.hinhThucGap || 'Gặp trực tiếp',
    meeting.latitude || '',
    meeting.longitude || '',
    meeting.googleMapUrl || '',
    meeting.noiDungTraoDoi || '',
    meeting.nhuCauKhachHang || '',
    meeting.tinhTrangSauGap || 'Đã gặp khách hàng',
    meeting.congViecTiepTheo || '',
    meeting.ngayHenLienHe || '',
    meeting.ghiChu || '',
    meeting.canBoThucHien || '',
    nowStr
  ];

  lsgSheet.appendRow(meetingRow);

  // Cập nhật NGAY_CAP_NHAT và nhu cầu trong KHACH_HANG
  var khData = khSheet.getDataRange().getValues();
  for (var i = 1; i < khData.length; i++) {
    if (String(khData[i][0]).trim() === String(meeting.idKh).trim()) {
      khSheet.getRange(i + 1, 17).setValue(nowStr); // NGAY_CAP_NHAT
      if (meeting.nhuCauKhachHang) {
        khSheet.getRange(i + 1, 10).setValue(meeting.nhuCauKhachHang); // NHU_CAU
      }
      break;
    }
  }

  // Tạo công việc mới nếu có
  var createdTaskData = null;
  if (newTask && newTask.noiDung && cvSheet) {
    var idCv = 'CV_' + Utilities.getUuid().slice(0, 8).toUpperCase();
    var taskRow = [
      idCv,
      meeting.idKh,
      newTask.noiDung,
      newTask.ngayHan || '',
      meeting.canBoThucHien || '',
      'Chưa thực hiện',
      nowStr,
      '',
      newTask.ghiChu || ''
    ];
    cvSheet.appendRow(taskRow);
    createdTaskData = {
      idCongViec: idCv,
      idKh: meeting.idKh,
      noiDung: newTask.noiDung,
      ngayHan: newTask.ngayHan,
      canBo: meeting.canBoThucHien,
      trangThai: 'Chưa thực hiện'
    };
  }

  meeting.idLichSu = idLichSu;
  meeting.thoiGianCapNhat = nowStr;

  return {
    success: true,
    message: 'Đã cập nhật cuộc gặp thành công!',
    data: {
      meeting: meeting,
      task: createdTaskData
    }
  };
}

function createTask(task) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);
  if (!cvSheet) return { success: false, message: 'Bảng CONG_VIEC không tồn tại.' };

  var idCv = 'CV_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  var row = [
    idCv,
    task.idKh || '',
    task.noiDung || '',
    task.ngayHan || '',
    task.canBo || '',
    task.trangThai || 'Chưa thực hiện',
    nowStr,
    '',
    task.ghiChu || ''
  ];

  cvSheet.appendRow(row);
  task.idCongViec = idCv;
  task.ngayTao = nowStr;

  return {
    success: true,
    message: 'Tạo công việc thành công.',
    data: task
  };
}

function updateTaskStatus(idCongViec, trangThai) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);
  if (!cvSheet) return { success: false, message: 'Bảng CONG_VIEC không tồn tại.' };

  var data = cvSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idCongViec).trim()) {
      cvSheet.getRange(i + 1, 6).setValue(trangThai); // Cột 6: TRANG_THAI
      if (trangThai === 'Hoàn thành') {
        var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
        cvSheet.getRange(i + 1, 8).setValue(nowStr); // Cột 8: NGAY_HOAN_THANH
      }
      return {
        success: true,
        message: 'Cập nhật trạng thái công việc thành công.',
        data: { idCongViec: idCongViec, trangThai: trangThai }
      };
    }
  }

  return { success: false, message: 'Không tìm thấy công việc: ' + idCongViec };
}

function saveCareEvent(evt) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.SU_KIEN_CHAM_SOC);
  if (!sheet) return { success: false, message: 'Bảng SU_KIEN_CHAM_SOC không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  var idSuKien = evt.idSuKien;

  if (idSuKien) {
    // Cập nhật sự kiện hiện có
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idSuKien).trim()) {
        sheet.getRange(i + 1, 2).setValue(evt.tenSuKien);
        sheet.getRange(i + 1, 3).setValue(evt.ngay);
        sheet.getRange(i + 1, 4).setValue(evt.loai);
        sheet.getRange(i + 1, 5).setValue(evt.soNgayNhacTruoc);
        sheet.getRange(i + 1, 6).setValue(evt.trangThai);
        return { success: true, message: 'Cập nhật sự kiện thành công.', data: evt };
      }
    }
  }

  // Thêm sự kiện mới
  idSuKien = 'SK_' + Utilities.getUuid().slice(0, 6).toUpperCase();
  var newRow = [
    idSuKien,
    evt.tenSuKien || '',
    evt.ngay || '',
    evt.loai || 'NgayLe',
    evt.soNgayNhacTruoc || 3,
    evt.trangThai || 'Bật'
  ];
  sheet.appendRow(newRow);
  evt.idSuKien = idSuKien;

  return { success: true, message: 'Thêm sự kiện chăm sóc thành công.', data: evt };
}

function deleteCareEvent(idSuKien) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.SU_KIEN_CHAM_SOC);
  if (!sheet) return { success: false, message: 'Bảng SU_KIEN_CHAM_SOC không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idSuKien).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Đã xóa sự kiện chăm sóc.' };
    }
  }

  return { success: false, message: 'Không tìm thấy sự kiện: ' + idSuKien };
}

function updateEmailConfig(cfg) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.EMAIL_CONFIG);
  if (!sheet) return { success: false, message: 'Bảng EMAIL_CONFIG không tồn tại.' };

  var keysToUpdate = {
    ADMIN_EMAIL: cfg.adminEmail,
    EMAIL_FROM_NAME: cfg.emailFromName,
    EMAIL_ENABLED: String(cfg.emailEnabled),
    REMINDER_DAYS: cfg.reminderDays,
    TEST_EMAIL: cfg.testEmail,
    APP_URL: cfg.appUrl
  };

  var data = sheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][0]).trim();
    existingKeys[k] = i + 1; // 1-based row
  }

  Object.keys(keysToUpdate).forEach(function(k) {
    var val = keysToUpdate[k];
    if (val !== undefined) {
      if (existingKeys[k]) {
        sheet.getRange(existingKeys[k], 2).setValue(val);
      } else {
        sheet.appendRow([k, val]);
      }
    }
  });

  return {
    success: true,
    message: 'Đã cập nhật cấu hình email thành công.',
    data: cfg
  };
}

function getEmailLogs(statusFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_LOG);
  if (!logSheet) return { success: true, data: [] };

  var rawLogs = sheetToObjects(logSheet).map(mapLogFromSheet);
  if (statusFilter && statusFilter !== 'ALL') {
    rawLogs = rawLogs.filter(function(l) {
      return l.trangThai === statusFilter;
    });
  }

  return {
    success: true,
    data: rawLogs
  };
}

/**
 * =========================================================================
 * V. TIỆN ÍCH HELPER
 * =========================================================================
 */
function getEmailConfigMap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfgSheet = ss ? ss.getSheetByName(SHEET_NAMES.EMAIL_CONFIG) : null;
  var map = {};
  if (cfgSheet) {
    var data = cfgSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var k = String(data[i][0]).trim();
      var v = String(data[i][1]).trim();
      if (k) map[k] = v;
    }
  }
  return map;
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var r = 1; r < data.length; r++) {
    var rowObj = {};
    var hasVal = false;
    for (var c = 0; c < headers.length; c++) {
      var val = data[r][c];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      }
      rowObj[headers[c]] = val;
      if (val !== '') hasVal = true;
    }
    if (hasVal) rows.push(rowObj);
  }
  return rows;
}

function mapCustomerFromSheet(r) {
  return {
    idKh: String(r.ID_KH || ''),
    hoTen: String(r.HO_TEN || ''),
    sdt: String(r.SDT || ''),
    ngaySinh: String(r.NGAY_SINH || ''),
    diaChi: String(r.DIA_CHI || ''),
    latitude: r.LATITUDE ? parseFloat(r.LATITUDE) : null,
    longitude: r.LONGITUDE ? parseFloat(r.LONGITUDE) : null,
    googleMapUrl: String(r.GOOGLE_MAP_URL || ''),
    nganhNghe: String(r.NGANH_NGHE || ''),
    nhuCau: String(r.NHU_CAU || ''),
    ghiChu: String(r.GHI_CHU || ''),
    phanLoai: r.PHAN_LOAI || 'Đang tiếp thị',
    cheDoChamSoc: r.CHE_DO_CHAM_SOC || 'Tắt',
    canBoPhuTrach: String(r.CAN_BO_PHU_TRACH || ''),
    emailCanBo: String(r.EMAIL_CAN_BO || ''),
    ngayTao: String(r.NGAY_TAO || ''),
    ngayCapNhat: String(r.NGAY_CAP_NHAT || ''),
    trangThai: String(r.TRANG_THAI || 'Hoạt động')
  };
}

function mapMeetingFromSheet(r) {
  return {
    idLichSu: String(r.ID_LICH_SU || ''),
    idKh: String(r.ID_KH || ''),
    thoiGianGap: String(r.THOI_GIAN_GAP || ''),
    hinhThucGap: r.HINH_THUC_GAP || 'Gặp trực tiếp',
    latitude: r.LATITUDE ? parseFloat(r.LATITUDE) : null,
    longitude: r.LONGITUDE ? parseFloat(r.LONGITUDE) : null,
    googleMapUrl: String(r.GOOGLE_MAP_URL || ''),
    noiDungTraoDoi: String(r.NOI_DUNG_TRAO_DOI || ''),
    nhuCauKhachHang: String(r.NHU_CAU_KHACH_HANG || ''),
    tinhTrangSauGap: r.TINH_TRANG_SAU_GAP || 'Đã gặp khách hàng',
    congViecTiepTheo: String(r.CONG_VIEC_TIEP_THEO || ''),
    ngayHenLienHe: String(r.NGAY_HEN_LIEN_HE || ''),
    ghiChu: String(r.GHI_CHU || ''),
    canBoThucHien: String(r.CAN_BO_THUC_HIEN || ''),
    thoiGianCapNhat: String(r.THOI_GIAN_CAP_NHAT || '')
  };
}

function mapTaskFromSheet(r) {
  return {
    idCongViec: String(r.ID_CONG_VIEC || ''),
    idKh: String(r.ID_KH || ''),
    noiDung: String(r.NOI_DUNG || ''),
    ngayHan: String(r.NGAY_HAN || ''),
    canBo: String(r.CAN_BO || ''),
    trangThai: r.TRANG_THAI || 'Chưa thực hiện',
    ngayTao: String(r.NGAY_TAO || ''),
    ngayHoanThanh: String(r.NGAY_HOAN_THANH || ''),
    ghiChu: String(r.GHI_CHU || '')
  };
}

function mapEventFromSheet(r) {
  return {
    idSuKien: String(r.ID_SU_KIEN || ''),
    tenSuKien: String(r.TEN_SU_KIEN || ''),
    ngay: String(r.NGAY || ''),
    loai: String(r.LOAI || ''),
    soNgayNhacTruoc: parseInt(r.SO_NGAY_NHAC_TRUOC, 10) || 3,
    trangThai: r.TRANG_THAI || 'Bật'
  };
}

function mapLogFromSheet(r) {
  return {
    idLog: String(r.ID_LOG || ''),
    thoiGian: String(r.THOI_GIAN || ''),
    idKh: String(r.ID_KH || ''),
    hoTenKh: String(r.HO_TEN_KH || ''),
    emailNhan: String(r.EMAIL_NHAN || ''),
    loaiSuKien: String(r.LOAI_SU_KIEN || ''),
    ngaySuKien: String(r.NGAY_SU_KIEN || ''),
    soNgayTruoc: parseInt(r.SO_NGAY_TRUOC, 10) || 0,
    thoiGianGui: String(r.THOI_GIAN_GUI || ''),
    trangThai: r.TRANG_THAI || 'PENDING',
    loiChiTiet: String(r.LOI_CHI_TIET || ''),
    messageIdNhapNeuCo: String(r.MESSAGE_ID_NHAP_NEU_CO || '')
  };
}

function parseDateStr(str) {
  if (!str) return null;
  // Format YYYY-MM-DD
  var parts = String(str).split('-');
  if (parts.length === 3) {
    return { day: parseInt(parts[2], 10), month: parseInt(parts[1], 10), year: parseInt(parts[0], 10) };
  }
  // Format DD/MM/YYYY
  parts = String(str).split('/');
  if (parts.length >= 2) {
    return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10), year: parts[2] ? parseInt(parts[2], 10) : null };
  }
  return null;
}

function parseFixedDayMonth(str) {
  if (!str) return null;
  var parts = String(str).split('/');
  if (parts.length >= 2) {
    return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
  }
  return null;
}

function getDaysUntilNextAnniversary(day, month, today) {
  var curYear = today.getFullYear();
  var thisYearDate = new Date(curYear, month - 1, day, 0, 0, 0, 0);
  var todayMidnight = new Date(curYear, today.getMonth(), today.getDate(), 0, 0, 0, 0);

  var diffMs = thisYearDate.getTime() - todayMidnight.getTime();
  var diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Date has passed this year, check next year
    var nextYearDate = new Date(curYear + 1, month - 1, day, 0, 0, 0, 0);
    diffDays = Math.round((nextYearDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  }

  return diffDays;
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}
