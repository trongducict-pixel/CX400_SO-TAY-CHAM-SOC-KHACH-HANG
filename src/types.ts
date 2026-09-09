export type CustomerTier = 'Đang tiếp thị' | 'Đã có quan hệ tín dụng' | 'Khách hàng VIP' | 'Khách hàng Siêu VIP';
export type CustomerType = 'Cá nhân' | 'Tổ chức';
export type CareMode = 'Bật' | 'Tắt';
export type MeetingFormat = 'Gặp trực tiếp' | 'Điện thoại' | 'Video call' | 'Email' | 'Khác';
export type MeetingStatus = 
  | 'Đang tiếp cận' 
  | 'Đã gặp khách hàng' 
  | 'Đang tư vấn' 
  | 'Có nhu cầu' 
  | 'Đang xử lý' 
  | 'Chưa thành công' 
  | 'Không còn nhu cầu' 
  | 'Đã phát sinh giao dịch';

export type TaskStatus = 'Chưa thực hiện' | 'Đang thực hiện' | 'Hoàn thành' | 'Quá hạn';
export type EmailLogStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
export type UserRole = 'QHKH' | 'LANH_DAO' | 'ADMIN';

export interface AppUser {
  stt?: number;
  idUser?: string;
  hoTen: string; // Họ và tên
  maNv: string; // Mã nhân viên
  user: string; // Tên đăng nhập (username)
  password?: string; // Mật khẩu (mặc định: 123, admin: admin123)
  phongBan: string; // PHÒNG BAN
  viTri: string; // Vị trí công việc
  sdt: string; // Số điện thoại
  email: string; // Email/AD
  role: UserRole; // QHKH | LANH_DAO | ADMIN
  isLeader: boolean; // Tick vai trò là lãnh đạo phòng
  trangThai?: 'Hoạt động' | 'Khóa';
}

export interface Customer {
  idKh: string; // ID_KH - gắn theo số điện thoại chuẩn hóa (VD: 0912345678)
  hoTen: string; // HO_TEN (Họ tên khách hàng hoặc Người liên hệ đại diện)
  loaiKhachHang?: CustomerType; // LOAI_KHACH_HANG ('Cá nhân' | 'Tổ chức')
  tenCongTy?: string; // TEN_CONG_TY (Bắt buộc nếu loaiKhachHang là 'Tổ chức')
  chucVu?: string; // CHUC_VU (Chức vụ người liên hệ nếu loaiKhachHang là 'Tổ chức')
  sdt: string; // SDT
  ngaySinh: string; // NGAY_SINH (YYYY-MM-DD or DD/MM/YYYY)
  diaChi: string; // DIA_CHI
  latitude: number | null; // LATITUDE
  longitude: number | null; // LONGITUDE
  googleMapUrl: string; // GOOGLE_MAP_URL
  nganhNghe: string; // NGANH_NGHE
  nhuCau: string; // NHU_CAU
  ghiChu: string; // GHI_CHU
  phanLoai: CustomerTier; // PHAN_LOAI
  cheDoChamSoc: CareMode; // CHE_DO_CHAM_SOC
  suKienChamSoc?: string[]; // SU_KIEN_CHAM_SOC (Danh sách các sự kiện chăm sóc được chọn: Sinh nhật, 8/3, 20/10, 27/7, Quốc khánh, Tết, Khác)
  canBoPhuTrach: string; // CAN_BO_PHU_TRACH (Họ tên cán bộ quản lý hiện tại)
  userCanBo?: string; // USER_CAN_BO (Username cán bộ quản lý hiện tại)
  emailCanBo: string; // EMAIL_CAN_BO
  // Thông tin người khởi tạo & phòng ban khởi tạo
  nguoiKhoiTao?: string; // Tên cán bộ khởi tạo ban đầu
  userKhoiTao?: string; // Username cán bộ khởi tạo (Admin có thể thay đổi)
  phongBanKhoiTao?: string; // Phòng ban người khởi tạo
  nguoiCapNhatCuoi?: string; // Họ tên người vừa cập nhật
  userCapNhatCuoi?: string; // Username người vừa cập nhật
  ngayTao: string; // NGAY_TAO
  ngayCapNhat: string; // NGAY_CAP_NHAT
  trangThai: string; // TRANG_THAI
}

export interface MeetingHistory {
  idLichSu: string; // ID_LICH_SU
  idKh: string; // ID_KH
  thoiGianGap: string; // THOI_GIAN_GAP (YYYY-MM-DD HH:mm)
  hinhThucGap: MeetingFormat; // HINH_THUC_GAP
  latitude: number | null; // LATITUDE
  longitude: number | null; // LONGITUDE
  googleMapUrl: string; // GOOGLE_MAP_URL
  noiDungTraoDoi: string; // NOI_DUNG_TRAO_DOI
  nhuCauKhachHang: string; // NHU_CAU_KHACH_HANG
  tinhTrangSauGap: MeetingStatus; // TINH_TRANG_SAU_GAP
  congViecTiepTheo: string; // CONG_VIEC_TIEP_THEO
  ngayHenLienHe: string; // NGAY_HEN_LIEN_HE
  ghiChu: string; // GHI_CHU
  canBoThucHien: string; // CAN_BO_THUC_HIEN
  thoiGianCapNhat: string; // THOI_GIAN_CAP_NHAT
}

export interface Task {
  idCongViec: string; // ID_CONG_VIEC
  idKh: string; // ID_KH
  noiDung: string; // NOI_DUNG
  ngayHan: string; // NGAY_HAN
  canBo: string; // CAN_BO
  trangThai: TaskStatus; // TRANG_THAI
  ngayTao: string; // NGAY_TAO
  ngayHoanThanh: string; // NGAY_HOAN_THANH
  ghiChu: string; // GHI_CHU
}

export interface CareEvent {
  idSuKien: string; // ID_SU_KIEN
  tenSuKien: string; // TEN_SU_KIEN
  ngay: string; // NGAY (e.g. "08/03", "20/10", "27/07", "02/09", or "SINH_NHAT")
  loai: string; // LOAI ('DinhKy', 'SinhNhat', 'NgayLe')
  soNgayNhacTruoc: number; // SO_NGAY_NHAC_TRUOC (e.g. 3)
  trangThai: 'Bật' | 'Tắt'; // TRANG_THAI
}

export interface EmailConfig {
  adminEmail: string; // ADMIN_EMAIL
  emailFromName: string; // EMAIL_FROM_NAME
  emailEnabled: boolean; // EMAIL_ENABLED
  reminderDays: string; // REMINDER_DAYS (e.g. "7,3,1")
  testEmail: string; // TEST_EMAIL
  appUrl: string; // APP_URL
}

export interface EmailLog {
  idLog: string; // ID_LOG
  thoiGian: string; // THOI_GIAN
  idKh: string; // ID_KH
  hoTenKh: string; // HO_TEN_KH
  emailNhan: string; // EMAIL_NHAN
  loaiSuKien: string; // LOAI_SU_KIEN
  ngaySuKien: string; // NGAY_SU_KIEN
  soNgayTruoc: number; // SO_NGAY_TRUOC
  thoiGianGui: string; // THOI_GIAN_GUI
  trangThai: EmailLogStatus; // TRANG_THAI
  loiChiTiet: string; // LOI_CHI_TIET
  messageIdNhapNeuCo: string; // MESSAGE_ID_NHAP_NEU_CO
}

export interface SystemHealthStatus {
  googleSheet: {
    status: 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN';
    details: string;
    sheetCount?: number;
  };
  appsScriptApi: {
    status: 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN';
    details: string;
    responseTimeMs?: number;
  };
  emailService: {
    status: 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN';
    details: string;
    configuredEmail?: string;
    enabled?: boolean;
    quotaRemaining?: number;
  };
  trigger: {
    status: 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN';
    details: string;
    activeTriggersCount?: number;
  };
  config: {
    status: 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN';
    details: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  duplicate?: boolean;
  existingCustomer?: Customer;
  details?: any;
}

export interface AppStateData {
  customers: Customer[];
  meetings: MeetingHistory[];
  tasks: Task[];
  careEvents: CareEvent[];
  emailConfig: EmailConfig;
  emailLogs: EmailLog[];
  systemHealth: SystemHealthStatus;
}
