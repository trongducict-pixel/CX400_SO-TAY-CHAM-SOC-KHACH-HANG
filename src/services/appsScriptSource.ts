/**
 * Code Google Apps Script đóng gói để hiển thị và sao chép trực tiếp trong WebApp
 */

export const APPS_SCRIPT_SOURCE_CODE = `/**
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
  CAN_BO: 'CAN_BO',
  KHACH_HANG: 'KHACH_HANG',
  LICH_SU_GAP: 'LICH_SU_GAP',
  CONG_VIEC: 'CONG_VIEC',
  SU_KIEN_CHAM_SOC: 'SU_KIEN_CHAM_SOC',
  EMAIL_CONFIG: 'EMAIL_CONFIG',
  EMAIL_LOG: 'EMAIL_LOG'
};

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

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

      case 'login':
        output = loginUser(params.username, params.password);
        break;

      case 'getUsers':
        output = getUsers();
        break;

      case 'updateUser':
        output = updateUser(params.user);
        break;

      case 'resetUserPassword':
        output = resetUserPassword(params.username, params.newPassword);
        break;

      case 'addUser':
        output = addUser(params.user);
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

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, message: 'Không tìm thấy Spreadsheet đang kích hoạt.' };

  var createdSheets = [];

  // Sheet 1: CAN_BO (Cán bộ / Users)
  var cbHeaders = [
    'STT', 'HO_TEN', 'MA_NV', 'USER', 'PASSWORD', 'PHONG_BAN', 
    'VI_TRI', 'SDT', 'EMAIL', 'ROLE', 'IS_LEADER', 'TRANG_THAI'
  ];
  var cbSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.CAN_BO, cbHeaders, createdSheets);
  if (cbSheet.getLastRow() === 1) {
    var defaultStaff = [
      [0, 'Quản trị viên Hệ thống', 'ADMIN01', 'admin', 'admin123', 'Quản trị hệ thống', 'Quản trị viên', '0943882109', 'trongduc.ict@gmail.com', 'ADMIN', 'true', 'Hoạt động'],
      [1, 'Đinh Xuân Thắng', '00005568', 'thangdx', '123', 'Ban giám đốc', 'Giám đốc CN', '0979792099', 'THANGDX@VIETINBANK.VN', 'LANH_DAO', 'true', 'Hoạt động'],
      [2, 'Nguyễn Trọng Đức', '00072898', 'ducnt4', '123', 'Phòng Khách hàng Doanh nghiệp', 'Cán bộ QHKH', '0943882109', 'DUCNT4@VIETINBANK.VN', 'QHKH', 'false', 'Hoạt động'],
      [3, 'Trần Minh Đức', '00073102', 'ductm', '123', 'Phòng Khách hàng Bán lẻ', 'Cán bộ QHKH', '0912345678', 'DUCTM@VIETINBANK.VN', 'QHKH', 'false', 'Hoạt động']
    ];
    cbSheet.getRange(2, 1, defaultStaff.length, defaultStaff[0].length).setValues(defaultStaff);
  }

  var khHeaders = [
    'ID_KH', 'HO_TEN', 'LOAI_KHACH_HANG', 'TEN_CONG_TY', 'CHUC_VU', 'SDT', 'NGAY_SINH', 'DIA_CHI', 
    'LATITUDE', 'LONGITUDE', 'GOOGLE_MAP_URL', 'NGANH_NGHE', 
    'NHU_CAU', 'GHI_CHU', 'PHAN_LOAI', 'CHE_DO_CHAM_SOC', 
    'CAN_BO_PHU_TRACH', 'USER_CAN_BO', 'EMAIL_CAN_BO', 
    'NGUOI_KHOI_TAO', 'USER_KHOI_TAO', 'PHONG_BAN_KHOI_TAO',
    'NGUOI_CAP_NHAT_CUOI', 'USER_CAP_NHAT_CUOI',
    'NGAY_TAO', 'NGAY_CAP_NHAT', 'TRANG_THAI'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.KHACH_HANG, khHeaders, createdSheets);

  var lsgHeaders = [
    'ID_LICH_SU', 'ID_KH', 'THOI_GIAN_GAP', 'HINH_THUC_GAP', 
    'LATITUDE', 'LONGITUDE', 'GOOGLE_MAP_URL', 'NOI_DUNG_TRAO_DOI', 
    'NHU_CAU_KHACH_HANG', 'TINH_TRANG_SAU_GAP', 'CONG_VIEC_TIEP_THEO', 
    'NGAY_HEN_LIEN_HE', 'GHI_CHU', 'CAN_BO_THUC_HIEN', 'THOI_GIAN_CAP_NHAT'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.LICH_SU_GAP, lsgHeaders, createdSheets);

  var cvHeaders = [
    'ID_CONG_VIEC', 'ID_KH', 'NOI_DUNG', 'NGAY_HAN', 
    'CAN_BO', 'TRANG_THAI', 'NGAY_TAO', 'NGAY_HOAN_THANH', 'GHI_CHU'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.CONG_VIEC, cvHeaders, createdSheets);

  var skHeaders = ['ID_SU_KIEN', 'TEN_SU_KIEN', 'NGAY', 'LOAI', 'SO_NGAY_NHAC_TRUOC', 'TRANG_THAI'];
  var skSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.SU_KIEN_CHAM_SOC, skHeaders, createdSheets);
  if (skSheet.getLastRow() === 1) {
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

  var logHeaders = [
    'ID_LOG', 'THOI_GIAN', 'ID_KH', 'HO_TEN_KH', 'EMAIL_NHAN', 
    'LOAI_SU_KIEN', 'NGAY_SU_KIEN', 'SO_NGAY_TRUOC', 'THOI_GIAN_GUI', 
    'TRANG_THAI', 'LOI_CHI_TIET', 'MESSAGE_ID_NHAP_NEU_CO'
  ];
  ensureSheetWithHeaders(ss, SHEET_NAMES.EMAIL_LOG, logHeaders, createdSheets);

  return {
    success: true,
    message: 'Thiết lập Database thành công 6 Sheet: KHACH_HANG, LICH_SU_GAP, CONG_VIEC, SU_KIEN_CHAM_SOC, EMAIL_CONFIG, EMAIL_LOG.',
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

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var removedCount = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkCareReminders') {
      ScriptApp.deleteTrigger(triggers[i]);
      removedCount++;
    }
  }

  ScriptApp.newTrigger('checkCareReminders')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  return {
    success: true,
    message: 'Đã thiết lập Trigger tự động chạy lúc 07:00 hàng ngày (đã dọn ' + removedCount + ' trigger cũ).'
  };
}

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

  if (!khSheet || !skSheet || !logSheet) return { error: 'Thiếu sheet cần thiết.' };
  if (config.EMAIL_ENABLED !== 'true') return { message: 'Gửi email đang Tắt (EMAIL_ENABLED=false).' };

  var customers = sheetToObjects(khSheet);
  var events = sheetToObjects(skSheet);
  var sentLogs = sheetToObjects(logSheet);

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
  var todayYear = today.getFullYear();

  var sendCount = 0;
  var skipCount = 0;
  var failCount = 0;
  var processedDetails = [];

  var activeCustomers = customers.filter(function(c) {
    return String(c.CHE_DO_CHAM_SOC).trim() === 'Bật';
  });

  activeCustomers.forEach(function(cust) {
    var recipientEmail = cust.EMAIL_CAN_BO || config.ADMIN_EMAIL;
    if (!recipientEmail) return;

    if (cust.NGAY_SINH) {
      var bday = parseDateStr(cust.NGAY_SINH);
      if (bday) {
        var daysUntil = getDaysUntilNextAnniversary(bday.day, bday.month, today);
        if (reminderDays.indexOf(daysUntil) !== -1 || daysUntil === 0) {
          var eventDateStr = pad2(bday.day) + '/' + pad2(bday.month) + '/' + todayYear;
          var cacheKey = cust.ID_KH + '|SINH_NHAT|' + eventDateStr + '|' + daysUntil;

          if (sentCache[cacheKey]) {
            skipCount++;
            processedDetails.push({ customer: cust.HO_TEN, event: 'Sinh nhật', days: daysUntil, status: 'SKIPPED' });
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

    events.forEach(function(evt) {
      if (String(evt.TRANG_THAI).trim() !== 'Bật') return;
      if (evt.LOAI === 'SinhNhat') return;

      var evtDate = parseFixedDayMonth(evt.NGAY);
      if (evtDate) {
        var daysUntil = getDaysUntilNextAnniversary(evtDate.day, evtDate.month, today);
        var noticeDays = parseInt(evt.SO_NGAY_NHAC_TRUOC, 10) || 3;
        var eligibleDays = [noticeDays, 1, 0];
        if (eligibleDays.indexOf(daysUntil) !== -1) {
          var eventDateStr = pad2(evtDate.day) + '/' + pad2(evtDate.month) + '/' + todayYear;
          var cacheKey = cust.ID_KH + '|' + evt.TEN_SU_KIEN + '|' + eventDateStr + '|' + daysUntil;

          if (sentCache[cacheKey]) {
            skipCount++;
            processedDetails.push({ customer: cust.HO_TEN, event: evt.TEN_SU_KIEN, days: daysUntil, status: 'SKIPPED' });
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
    'Kính gửi Cán bộ QHKH,\\n\\n' +
    'Khách hàng:\\n' +
    'Họ tên: ' + cust.HO_TEN + '\\n' +
    'SĐT: ' + cust.SDT + '\\n' +
    'Phân loại: ' + cust.PHAN_LOAI + '\\n' +
    'Ngày sinh: ' + cust.NGAY_SINH + '\\n' +
    'Địa chỉ: ' + cust.DIA_CHI + '\\n' +
    'Ngành nghề: ' + cust.NGANH_NGHE + '\\n' +
    'Nhu cầu: ' + (cust.NHU_CAU || 'Chưa ghi nhận') + '\\n\\n' +
    'Sự kiện: ' + tenSuKien + '\\n' +
    'Ngày: ' + ngaySuKien + ' (' + dayLabel + ')\\n\\n' +
    'Đề nghị cán bộ thực hiện chăm sóc khách hàng.\\n\\n' +
    'Link Google Maps: ' + mapUrl + '\\n' +
    'Link mở hồ sơ khách hàng: ' + customerProfileUrl + '\\n\\n' +
    'Trân trọng,\\nSổ Tay QHKH';

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      body: body,
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

function sendTestEmail(targetEmail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_LOG);
  var config = getEmailConfigMap();

  var recipient = targetEmail || config.TEST_EMAIL || config.ADMIN_EMAIL || Session.getActiveUser().getEmail();
  if (!recipient || recipient.indexOf('@') === -1) {
    return { success: false, message: 'Địa chỉ email người nhận không hợp lệ: ' + recipient, error: 'INVALID_EMAIL' };
  }

  var logId = 'TEST_' + Utilities.getUuid().slice(0, 8);
  var now = new Date();
  var timestamp = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  var subject = '[CRM CARE TEST] Kiểm Tra Hệ Thống Gửi Email - ' + timestamp;
  var body = 'Kính gửi Quản trị viên,\\n\\nApps Script đã thực thi sendEmail() thành công.\\nThời gian: ' + timestamp;

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
      data: { recipient: recipient, logId: logId, timestamp: timestamp }
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
    return { success: false, message: 'Không gửi được email. Lỗi: ' + errorMsg, error: errorMsg };
  }
}

function getInitialData(userEmail, userRole) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, message: 'Spreadsheet chưa mở.' };

  var khSheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  var lsgSheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_GAP);
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);
  var skSheet = ss.getSheetByName(SHEET_NAMES.SU_KIEN_CHAM_SOC);
  var logSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_LOG);
  var emailConfig = getEmailConfigMap();

  var customers = (khSheet ? sheetToObjects(khSheet) : []).map(mapCustomerFromSheet);
  var meetings = (lsgSheet ? sheetToObjects(lsgSheet) : []).map(mapMeetingFromSheet);
  var tasks = (cvSheet ? sheetToObjects(cvSheet) : []).map(mapTaskFromSheet);
  var events = (skSheet ? sheetToObjects(skSheet) : []).map(mapEventFromSheet);
  var logs = (logSheet ? sheetToObjects(logSheet) : []).map(mapLogFromSheet);

  return {
    success: true,
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

  var rawPhone = String(cust.sdt || '');
  var cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.indexOf('84') === 0 && cleanPhone.length >= 10) {
    cleanPhone = '0' + cleanPhone.slice(2);
  }
  var idKh = cleanPhone || cust.idKh || ('KH_' + Utilities.getUuid().slice(0, 8).toUpperCase());

  // Kiểm tra khách hàng trùng số điện thoại
  var allKh = sheetToObjects(sheet);
  for (var k = 0; k < allKh.length; k++) {
    var r = allKh[k];
    var rPhone = String(r.SDT || '').replace(/\D/g, '');
    if (rPhone.indexOf('84') === 0 && rPhone.length >= 10) rPhone = '0' + rPhone.slice(2);
    if ((cleanPhone && rPhone === cleanPhone) || String(r.ID_KH).trim() === idKh) {
      if (!cust.allowUpdateExisting && !cust.forceUpdate) {
        return {
          success: false,
          duplicate: true,
          existingCustomer: mapCustomerFromSheet(r),
          message: 'Khách hàng có số điện thoại "' + rawPhone + '" đã tồn tại, đang được quản lý bởi cán bộ ' + (r.CAN_BO_PHU_TRACH || 'khác') + ' (@' + (r.USER_CAN_BO || '') + '). Bạn có thể xem và cập nhật hồ sơ khách hàng này.'
        };
      } else {
        cust.idKh = r.ID_KH;
        return updateCustomer(cust);
      }
    }
  }

  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  var userKhoiTao = cust.userKhoiTao || cust.userCanBo || '';
  var nguoiKhoiTao = cust.nguoiKhoiTao || cust.canBoPhuTrach || '';
  var phongBanKhoiTao = cust.phongBanKhoiTao || '';

  var row = [
    idKh, cust.hoTen || '', cust.loaiKhachHang || 'Cá nhân', cust.tenCongTy || '', cust.chucVu || '', cleanPhone || rawPhone, cust.ngaySinh || '', cust.diaChi || '',
    cust.latitude || '', cust.longitude || '', cust.googleMapUrl || '',
    cust.nganhNghe || '', cust.nhuCau || '', cust.ghiChu || '',
    cust.phanLoai || 'Đang tiếp thị', cust.cheDoChamSoc || 'Tắt',
    cust.canBoPhuTrach || '', cust.userCanBo || '', cust.emailCanBo || '',
    nguoiKhoiTao, userKhoiTao, phongBanKhoiTao,
    cust.nguoiCapNhatCuoi || nguoiKhoiTao, cust.userCapNhatCuoi || userKhoiTao,
    nowStr, nowStr, cust.trangThai || 'Hoạt động'
  ];

  sheet.appendRow(row);
  cust.idKh = idKh;
  cust.nguoiKhoiTao = nguoiKhoiTao;
  cust.userKhoiTao = userKhoiTao;
  cust.phongBanKhoiTao = phongBanKhoiTao;
  cust.ngayTao = nowStr;
  cust.ngayCapNhat = nowStr;

  return { success: true, message: 'Thêm khách hàng thành công.', data: cust };
}

function updateCustomer(cust) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  if (!sheet) return { success: false, message: 'Bảng KHACH_HANG không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(cust.idKh).trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { success: false, message: 'Không tìm thấy khách hàng.' };

  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  var fields = {
    'HO_TEN': cust.hoTen,
    'LOAI_KHACH_HANG': cust.loaiKhachHang,
    'TEN_CONG_TY': cust.tenCongTy,
    'CHUC_VU': cust.chucVu,
    'SDT': cust.sdt,
    'NGAY_SINH': cust.ngaySinh,
    'DIA_CHI': cust.diaChi,
    'LATITUDE': cust.latitude,
    'LONGITUDE': cust.longitude,
    'GOOGLE_MAP_URL': cust.googleMapUrl,
    'NGANH_NGHE': cust.nganhNghe,
    'NHU_CAU': cust.nhuCau,
    'GHI_CHU': cust.ghiChu,
    'PHAN_LOAI': cust.phanLoai,
    'CHE_DO_CHAM_SOC': cust.cheDoChamSoc,
    'CAN_BO_PHU_TRACH': cust.canBoPhuTrach,
    'USER_CAN_BO': cust.userCanBo,
    'EMAIL_CAN_BO': cust.emailCanBo,
    'NGUOI_KHOI_TAO': cust.nguoiKhoiTao,
    'USER_KHOI_TAO': cust.userKhoiTao,
    'PHONG_BAN_KHOI_TAO': cust.phongBanKhoiTao,
    'NGUOI_CAP_NHAT_CUOI': cust.nguoiCapNhatCuoi,
    'USER_CAP_NHAT_CUOI': cust.userCapNhatCuoi,
    'NGAY_CAP_NHAT': nowStr,
    'TRANG_THAI': cust.trangThai
  };

  for (var k in fields) {
    if (fields[k] !== undefined) {
      var colIdx = headers.indexOf(k);
      if (colIdx !== -1) {
        sheet.getRange(rowIndex, colIdx + 1).setValue(fields[k]);
      }
    }
  }

  return { success: true, message: 'Cập nhật thông tin khách hàng thành công.', data: cust };
}

function toggleCareMode(idKh, mode) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  if (!sheet) return { success: false, message: 'Bảng KHACH_HANG không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idKh).trim()) {
      var targetMode = (mode === 'Bật' || mode === 'Tắt') ? mode : (data[i][12] === 'Bật' ? 'Tắt' : 'Bật');
      sheet.getRange(i + 1, 13).setValue(targetMode);
      var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(i + 1, 17).setValue(nowStr);
      return { success: true, message: 'Đã cập nhật Chế độ chăm sóc: ' + targetMode, data: { idKh: idKh, cheDoChamSoc: targetMode } };
    }
  }
  return { success: false, message: 'Không tìm thấy khách hàng.' };
}

function recordMeeting(meeting, newTask) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lsgSheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_GAP);
  var khSheet = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);

  if (!lsgSheet || !khSheet) return { success: false, message: 'Bảng cuộc gặp không tồn tại.' };

  var idLichSu = 'LS_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  var meetingRow = [
    idLichSu, meeting.idKh, meeting.thoiGianGap || nowStr, meeting.hinhThucGap || 'Gặp trực tiếp',
    meeting.latitude || '', meeting.longitude || '', meeting.googleMapUrl || '',
    meeting.noiDungTraoDoi || '', meeting.nhuCauKhachHang || '', meeting.tinhTrangSauGap || 'Đã gặp khách hàng',
    meeting.congViecTiepTheo || '', meeting.ngayHenLienHe || '', meeting.ghiChu || '',
    meeting.canBoThucHien || '', nowStr
  ];

  lsgSheet.appendRow(meetingRow);

  var khData = khSheet.getDataRange().getValues();
  for (var i = 1; i < khData.length; i++) {
    if (String(khData[i][0]).trim() === String(meeting.idKh).trim()) {
      khSheet.getRange(i + 1, 17).setValue(nowStr);
      if (meeting.nhuCauKhachHang) khSheet.getRange(i + 1, 10).setValue(meeting.nhuCauKhachHang);
      break;
    }
  }

  var createdTaskData = null;
  if (newTask && newTask.noiDung && cvSheet) {
    var idCv = 'CV_' + Utilities.getUuid().slice(0, 8).toUpperCase();
    var taskRow = [
      idCv, meeting.idKh, newTask.noiDung, newTask.ngayHan || '',
      meeting.canBoThucHien || '', 'Chưa thực hiện', nowStr, '', newTask.ghiChu || ''
    ];
    cvSheet.appendRow(taskRow);
    createdTaskData = {
      idCongViec: idCv, idKh: meeting.idKh, noiDung: newTask.noiDung,
      ngayHan: newTask.ngayHan, canBo: meeting.canBoThucHien, trangThai: 'Chưa thực hiện'
    };
  }

  meeting.idLichSu = idLichSu;
  meeting.thoiGianCapNhat = nowStr;

  return { success: true, message: 'Đã cập nhật thành công.', data: { meeting: meeting, task: createdTaskData } };
}

function createTask(task) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);
  if (!cvSheet) return { success: false, message: 'Bảng CONG_VIEC không tồn tại.' };

  var idCv = 'CV_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  cvSheet.appendRow([idCv, task.idKh || '', task.noiDung || '', task.ngayHan || '', task.canBo || '', task.trangThai || 'Chưa thực hiện', nowStr, '', task.ghiChu || '']);
  task.idCongViec = idCv;
  task.ngayTao = nowStr;
  return { success: true, message: 'Tạo công việc thành công.', data: task };
}

function updateTaskStatus(idCongViec, trangThai) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cvSheet = ss.getSheetByName(SHEET_NAMES.CONG_VIEC);
  if (!cvSheet) return { success: false, message: 'Bảng CONG_VIEC không tồn tại.' };

  var data = cvSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idCongViec).trim()) {
      cvSheet.getRange(i + 1, 6).setValue(trangThai);
      if (trangThai === 'Hoàn thành') {
        var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
        cvSheet.getRange(i + 1, 8).setValue(nowStr);
      }
      return { success: true, message: 'Cập nhật công việc thành công.', data: { idCongViec: idCongViec, trangThai: trangThai } };
    }
  }
  return { success: false, message: 'Không tìm thấy công việc.' };
}

function saveCareEvent(evt) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.SU_KIEN_CHAM_SOC);
  if (!sheet) return { success: false, message: 'Bảng SU_KIEN_CHAM_SOC không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  var idSuKien = evt.idSuKien;

  if (idSuKien) {
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

  idSuKien = 'SK_' + Utilities.getUuid().slice(0, 6).toUpperCase();
  sheet.appendRow([idSuKien, evt.tenSuKien || '', evt.ngay || '', evt.loai || 'NgayLe', evt.soNgayNhacTruoc || 3, evt.trangThai || 'Bật']);
  evt.idSuKien = idSuKien;
  return { success: true, message: 'Thêm sự kiện chăm sóc thành công.', data: evt };
}

function deleteCareEvent(idSuKien) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.SU_KIEN_CHAM_SOC);
  if (!sheet) return { success: false, message: 'Bảng không tồn tại.' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idSuKien).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Đã xóa sự kiện chăm sóc.' };
    }
  }
  return { success: false, message: 'Không tìm thấy sự kiện.' };
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
    existingKeys[String(data[i][0]).trim()] = i + 1;
  }

  Object.keys(keysToUpdate).forEach(function(k) {
    var val = keysToUpdate[k];
    if (val !== undefined) {
      if (existingKeys[k]) sheet.getRange(existingKeys[k], 2).setValue(val);
      else sheet.appendRow([k, val]);
    }
  });

  return { success: true, message: 'Cập nhật cấu hình email thành công.', data: cfg };
}

function getEmailLogs(statusFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_NAMES.EMAIL_LOG);
  if (!logSheet) return { success: true, data: [] };

  var logs = sheetToObjects(logSheet).map(mapLogFromSheet);
  if (statusFilter && statusFilter !== 'ALL') {
    logs = logs.filter(function(l) { return l.trangThai === statusFilter; });
  }
  return { success: true, data: logs };
}

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
    loaiKhachHang: r.LOAI_KHACH_HANG || 'Cá nhân',
    tenCongTy: String(r.TEN_CONG_TY || ''),
    chucVu: String(r.CHUC_VU || ''),
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
    userCanBo: String(r.USER_CAN_BO || r.CAN_BO_PHU_TRACH || ''),
    emailCanBo: String(r.EMAIL_CAN_BO || ''),
    nguoiKhoiTao: String(r.NGUOI_KHOI_TAO || r.CAN_BO_PHU_TRACH || ''),
    userKhoiTao: String(r.USER_KHOI_TAO || r.USER_CAN_BO || ''),
    phongBanKhoiTao: String(r.PHONG_BAN_KHOI_TAO || ''),
    nguoiCapNhatCuoi: String(r.NGUOI_CAP_NHAT_CUOI || ''),
    userCapNhatCuoi: String(r.USER_CAP_NHAT_CUOI || ''),
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

function mapUserFromSheet(r) {
  return {
    stt: parseInt(r.STT, 10) || 0,
    hoTen: String(r.HO_TEN || ''),
    maNv: String(r.MA_NV || ''),
    user: String(r.USER || ''),
    password: String(r.PASSWORD || ''),
    phongBan: String(r.PHONG_BAN || ''),
    viTri: String(r.VI_TRI || ''),
    sdt: String(r.SDT || ''),
    email: String(r.EMAIL || ''),
    role: r.ROLE || 'QHKH',
    isLeader: String(r.IS_LEADER).toLowerCase() === 'true',
    trangThai: r.TRANG_THAI || 'Hoạt động'
  };
}

function loginUser(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CAN_BO);
  if (!sheet) return { success: false, message: 'Sheet CAN_BO chưa được tạo.' };

  var users = sheetToObjects(sheet).map(mapUserFromSheet);
  var u = String(username || '').trim().toLowerCase();
  var p = String(password || '').trim();

  var found = users.find(function(item) {
    return item.user.toLowerCase() === u;
  });

  if (!found) {
    return { success: false, message: 'Tài khoản không tồn tại trong hệ thống.' };
  }

  var expectedPass = found.password || (found.user === 'admin' ? 'admin123' : '123');
  if (p !== expectedPass) {
    return { success: false, message: 'Mật khẩu không chính xác.' };
  }

  // Remove password from response
  var safeUser = Object.assign({}, found);
  delete safeUser.password;

  return {
    success: true,
    message: 'Đăng nhập thành công! Xin chào ' + found.hoTen,
    data: safeUser
  };
}

function getUsers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CAN_BO);
  if (!sheet) return { success: false, message: 'Sheet CAN_BO chưa tồn tại.' };

  var users = sheetToObjects(sheet).map(mapUserFromSheet);
  return { success: true, data: users };
}

function updateUser(userData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CAN_BO);
  if (!sheet) return { success: false, message: 'Sheet CAN_BO chưa tồn tại.' };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var userIdx = headers.indexOf('USER');
  if (userIdx === -1) return { success: false, message: 'Không tìm thấy cột USER trong sheet CAN_BO.' };

  var targetUser = String(userData.user || '').trim().toLowerCase();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]).trim().toLowerCase() === targetUser) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, message: 'Không tìm thấy cán bộ có username: ' + userData.user };
  }

  var fieldMap = {
    'HO_TEN': userData.hoTen,
    'MA_NV': userData.maNv,
    'PHONG_BAN': userData.phongBan,
    'VI_TRI': userData.viTri,
    'SDT': userData.sdt,
    'EMAIL': userData.email,
    'ROLE': userData.role,
    'IS_LEADER': userData.isLeader ? 'true' : 'false',
    'TRANG_THAI': userData.trangThai
  };

  for (var key in fieldMap) {
    var cIdx = headers.indexOf(key);
    if (cIdx !== -1 && fieldMap[key] !== undefined) {
      sheet.getRange(rowIndex, cIdx + 1).setValue(fieldMap[key]);
    }
  }

  return { success: true, message: 'Cập nhật thông tin cán bộ thành công!' };
}

function resetUserPassword(username, newPassword) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CAN_BO);
  if (!sheet) return { success: false, message: 'Sheet CAN_BO chưa tồn tại.' };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var userIdx = headers.indexOf('USER');
  var passIdx = headers.indexOf('PASSWORD');
  if (userIdx === -1 || passIdx === -1) return { success: false, message: 'Thiếu cột USER hoặc PASSWORD.' };

  var targetUser = String(username || '').trim().toLowerCase();
  var defaultPass = targetUser === 'admin' ? 'admin123' : '123';
  var passToSet = newPassword || defaultPass;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]).trim().toLowerCase() === targetUser) {
      sheet.getRange(i + 1, passIdx + 1).setValue(passToSet);
      return { success: true, message: 'Đã đặt lại mật khẩu cho cán bộ @' + username + ' thành công (' + passToSet + ')!' };
    }
  }

  return { success: false, message: 'Không tìm thấy cán bộ có username: ' + username };
}

function addUser(userData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CAN_BO);
  if (!sheet) return { success: false, message: 'Sheet CAN_BO chưa tồn tại.' };

  var defaultPass = userData.user === 'admin' ? 'admin123' : '123';
  var row = [
    sheet.getLastRow(),
    userData.hoTen || '',
    userData.maNv || '',
    userData.user || '',
    userData.password || defaultPass,
    userData.phongBan || '',
    userData.viTri || '',
    userData.sdt || '',
    userData.email || '',
    userData.role || 'QHKH',
    userData.isLeader ? 'true' : 'false',
    userData.trangThai || 'Hoạt động'
  ];

  sheet.appendRow(row);
  return { success: true, message: 'Thêm cán bộ mới thành công!', data: userData };
}

function parseDateStr(str) {
  if (!str) return null;
  var parts = String(str).split('-');
  if (parts.length === 3) return { day: parseInt(parts[2], 10), month: parseInt(parts[1], 10), year: parseInt(parts[0], 10) };
  parts = String(str).split('/');
  if (parts.length >= 2) return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
  return null;
}

function parseFixedDayMonth(str) {
  if (!str) return null;
  var parts = String(str).split('/');
  if (parts.length >= 2) return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
  return null;
}

function getDaysUntilNextAnniversary(day, month, today) {
  var curYear = today.getFullYear();
  var thisYearDate = new Date(curYear, month - 1, day, 0, 0, 0, 0);
  var todayMidnight = new Date(curYear, today.getMonth(), today.getDate(), 0, 0, 0, 0);

  var diffMs = thisYearDate.getTime() - todayMidnight.getTime();
  var diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    var nextYearDate = new Date(curYear + 1, month - 1, day, 0, 0, 0, 0);
    diffDays = Math.round((nextYearDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  }
  return diffDays;
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}
`;
