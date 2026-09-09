import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Users, 
  CheckCircle2, 
  Award, 
  Handshake, 
  TrendingUp,
  UserPlus,
  CreditCard,
  Banknote,
  Briefcase,
  Layers,
  ChevronDown,
  Building2,
  ShieldCheck,
  Crown,
  UserCheck,
  User,
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { Customer, MeetingHistory, Task, AppUser } from '../types';
import { DashboardReportExportModal } from './DashboardReportExportModal';

interface ReportsViewProps {
  customers: Customer[];
  meetings: MeetingHistory[];
  tasks: Task[];
  currentUser?: AppUser | null;
  users?: AppUser[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  customers,
  meetings,
  tasks,
  currentUser,
  users = []
}) => {
  // Determine Role & Scope
  const isAdmin = currentUser?.role === 'ADMIN';
  const isLeader = !isAdmin && (currentUser?.role === 'LANH_DAO' || currentUser?.isLeader === true);
  const isOfficer = !isAdmin && !isLeader;

  const userDept = currentUser?.phongBan || '';
  const isBranchLeader = isLeader && (userDept.toLowerCase().includes('giám đốc') || userDept.toLowerCase().includes('chi nhánh'));

  // Filter States
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // 1. Phân quyền dữ liệu (RBAC Data Filtering)
  // - Cán bộ: Chỉ xem khách hàng do mình quản lý
  // - Lãnh đạo phòng: Xem báo cáo của toàn bộ phòng mình quản lý
  // - Admin: Xem toàn bộ hoặc lọc theo phòng ban / cán bộ
  const scopedData = useMemo(() => {
    let baseCustomers = customers;

    if (isOfficer) {
      // Cán bộ QHKH: Chỉ lấy khách hàng do mình quản lý
      const myUsername = (currentUser?.user || '').toLowerCase().trim();
      const myFullName = (currentUser?.hoTen || '').toLowerCase().trim();
      const myEmail = (currentUser?.email || '').toLowerCase().trim();

      baseCustomers = customers.filter(c => {
        const cUser = (c.userCanBo || '').toLowerCase().trim();
        const cName = (c.canBoPhuTrach || '').toLowerCase().trim();
        const cEmail = (c.emailCanBo || '').toLowerCase().trim();

        return (
          (myUsername && cUser === myUsername) ||
          (myFullName && cName === myFullName) ||
          (myEmail && cEmail === myEmail)
        );
      });
    } else if (isLeader && !isBranchLeader) {
      // Lãnh đạo phòng: Xem toàn bộ khách hàng của phòng mình
      const deptUsers = users.filter(u => u.phongBan.toLowerCase().trim() === userDept.toLowerCase().trim());
      const deptUsernames = new Set(deptUsers.map(u => u.user.toLowerCase().trim()));
      const deptFullnames = new Set(deptUsers.map(u => u.hoTen.toLowerCase().trim()));

      baseCustomers = customers.filter(c => {
        const cDept = (c.phongBanKhoiTao || '').toLowerCase().trim();
        if (cDept && cDept === userDept.toLowerCase().trim()) return true;

        const cUser = (c.userCanBo || '').toLowerCase().trim();
        const cName = (c.canBoPhuTrach || '').toLowerCase().trim();

        if (cUser && deptUsernames.has(cUser)) return true;
        if (cName && deptFullnames.has(cName)) return true;

        return false;
      });
    } else if (isAdmin || isBranchLeader) {
      // Admin hoặc Ban Giám đốc: Nếu có chọn phòng ban thì lọc theo phòng
      if (selectedDeptFilter !== 'all') {
        const deptUsers = users.filter(u => u.phongBan === selectedDeptFilter);
        const deptUsernames = new Set(deptUsers.map(u => u.user.toLowerCase().trim()));
        const deptFullnames = new Set(deptUsers.map(u => u.hoTen.toLowerCase().trim()));

        baseCustomers = customers.filter(c => {
          if (c.phongBanKhoiTao === selectedDeptFilter) return true;
          const cUser = (c.userCanBo || '').toLowerCase().trim();
          const cName = (c.canBoPhuTrach || '').toLowerCase().trim();
          if (cUser && deptUsernames.has(cUser)) return true;
          if (cName && deptFullnames.has(cName)) return true;
          return false;
        });
      }
    }

    // Set of scoped customer IDs
    const allowedCustomerIds = new Set(baseCustomers.map(c => c.idKh));

    // Scoped Meetings
    let baseMeetings = meetings.filter(m => {
      if (allowedCustomerIds.has(m.idKh)) return true;
      if (isOfficer && currentUser) {
        return (m.canBoThucHien || '').toLowerCase().trim() === currentUser.hoTen.toLowerCase().trim();
      }
      return false;
    });

    // Scoped Tasks
    let baseTasks = tasks.filter(t => {
      if (allowedCustomerIds.has(t.idKh)) return true;
      if (isOfficer && currentUser) {
        return (t.canBo || '').toLowerCase().trim() === currentUser.hoTen.toLowerCase().trim();
      }
      return false;
    });

    return {
      customers: baseCustomers,
      meetings: baseMeetings,
      tasks: baseTasks
    };
  }, [customers, meetings, tasks, currentUser, isOfficer, isLeader, isBranchLeader, isAdmin, userDept, users, selectedDeptFilter]);

  // List of unique departments for Admin / Ban Giám đốc filter
  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.phongBan && u.phongBan !== 'Quản trị hệ thống') set.add(u.phongBan);
    });
    customers.forEach(c => {
      if (c.phongBanKhoiTao) set.add(c.phongBanKhoiTao);
    });
    return Array.from(set).sort();
  }, [users, customers]);

  // Date calculation
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  // 1. KPI Cards from Scoped Data
  const totalCustomers = scopedData.customers.length;

  const newCustomersThisMonth = useMemo(() => {
    return scopedData.customers.filter(c => {
      if (!c.ngayTao) return false;
      const d = new Date(c.ngayTao);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [scopedData.customers, currentMonth, currentYear]);

  const totalMeetings = scopedData.meetings.length;

  const completedTasksCount = scopedData.tasks.filter(t => t.trangThai === 'Hoàn thành').length;
  const taskCompletionRate = scopedData.tasks.length > 0 
    ? Math.round((completedTasksCount / scopedData.tasks.length) * 100) 
    : 100;

  // 2. Khách hàng theo phân loại
  const classificationStats = useMemo(() => {
    let tiepThi = 0;
    let qhtd = 0;
    let vip = 0;
    let sieuVip = 0;

    scopedData.customers.forEach(c => {
      if (c.phanLoai.includes('Siêu VIP')) {
        sieuVip++;
      } else if (c.phanLoai.includes('VIP')) {
        vip++;
      } else if (c.phanLoai.includes('quan hệ tín dụng')) {
        qhtd++;
      } else {
        tiepThi++;
      }
    });

    return [
      { name: 'Đang tiếp thị', count: tiepThi, color: '#0284c7' },
      { name: 'Đã có QHTD', count: qhtd, color: '#059669' },
      { name: 'Khách hàng VIP', count: vip, color: '#d97706' },
      { name: 'Khách hàng Siêu VIP', count: sieuVip, color: '#7e22ce' },
    ];
  }, [scopedData.customers]);

  const pieDataClassification = classificationStats.map(item => ({
    name: item.name,
    value: item.count
  }));

  // 3. Khách hàng theo nhu cầu tài chính
  const demandStats = useMemo(() => {
    let vay = 0;
    let tienGui = 0;
    let the = 0;
    let dichVuKhac = 0;

    scopedData.customers.forEach(c => {
      const demandText = (c.nhuCau || '').toLowerCase();
      let matched = false;

      if (demandText.includes('vay') || demandText.includes('tín dụng') || demandText.includes('thế chấp') || demandText.includes('vốn')) {
        vay++;
        matched = true;
      }
      if (demandText.includes('gửi') || demandText.includes('tiết kiệm') || demandText.includes('tiền gửi') || demandText.includes('huy động')) {
        tienGui++;
        matched = true;
      }
      if (demandText.includes('thẻ') || demandText.includes('card') || demandText.includes('visa') || demandText.includes('master')) {
        the++;
        matched = true;
      }
      if (!matched && demandText.trim().length > 0) {
        dichVuKhac++;
      }
    });

    return [
      { category: 'Nhu cầu Vay', count: vay, fill: '#2563eb' },
      { category: 'Nhu cầu Tiền gửi', count: tienGui, fill: '#059669' },
      { category: 'Nhu cầu Thẻ', count: the, fill: '#ea580c' },
      { category: 'Dịch vụ khác', count: dichVuKhac, fill: '#8b5cf6' },
    ];
  }, [scopedData.customers]);

  // 4. Báo cáo năng suất theo từng Cán bộ trong phạm vi phân quyền
  const officerStats = useMemo(() => {
    const stats: Record<string, { officer: string; customers: number; meetings: number; completedTasks: number; totalTasks: number }> = {};

    // For officer role, ensure their row exists even with 0 customers
    if (isOfficer && currentUser) {
      stats[currentUser.hoTen] = {
        officer: currentUser.hoTen,
        customers: 0,
        meetings: 0,
        completedTasks: 0,
        totalTasks: 0
      };
    }

    scopedData.customers.forEach(c => {
      const off = c.canBoPhuTrach || 'Chưa phân công';
      if (!stats[off]) {
        stats[off] = { officer: off, customers: 0, meetings: 0, completedTasks: 0, totalTasks: 0 };
      }
      stats[off].customers++;
    });

    scopedData.meetings.forEach(m => {
      const off = m.canBoThucHien || 'QHKH';
      if (!stats[off]) {
        stats[off] = { officer: off, customers: 0, meetings: 0, completedTasks: 0, totalTasks: 0 };
      }
      stats[off].meetings++;
    });

    scopedData.tasks.forEach(t => {
      const off = t.canBo || 'QHKH';
      if (!stats[off]) {
        stats[off] = { officer: off, customers: 0, meetings: 0, completedTasks: 0, totalTasks: 0 };
      }
      stats[off].totalTasks++;
      if (t.trangThai === 'Hoàn thành') {
        stats[off].completedTasks++;
      }
    });

    return Object.values(stats).sort((a, b) => b.customers - a.customers);
  }, [scopedData, isOfficer, currentUser]);

  const uniqueOfficers = useMemo(() => {
    return Array.from(new Set(officerStats.map(o => o.officer)));
  }, [officerStats]);

  const filteredOfficerList = useMemo(() => {
    if (isOfficer && currentUser) {
      return officerStats.filter(o => o.officer.toLowerCase().trim() === currentUser.hoTen.toLowerCase().trim());
    }
    if (selectedOfficerFilter === 'all') return officerStats;
    return officerStats.filter(o => o.officer === selectedOfficerFilter);
  }, [officerStats, selectedOfficerFilter, isOfficer, currentUser]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 md:pb-8">
      {/* 1. Header Banner Phân quyền chuẩn xác */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                  Báo cáo Quản trị Toàn chi nhánh
                </span>
              ) : isLeader ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/30 text-amber-200 border border-amber-400/30">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  Báo cáo Lãnh đạo • {userDept || 'Phòng ban'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                  Báo cáo Cán bộ • {currentUser?.hoTen || 'QHKH'}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {isAdmin 
                ? 'TỔNG HỢP HIỆU SUẤT TOÀN HỆ THỐNG' 
                : isLeader 
                ? `BÁO CÁO HOẠT ĐỘNG ${userDept.toUpperCase()}` 
                : 'BÁO CÁO HIỆU SUẤT QUẢN LÝ KHÁCH HÀNG'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 max-w-2xl">
              {isAdmin 
                ? 'Theo dõi dữ liệu toàn bộ khách hàng, năng suất cán bộ và hoạt động tiếp xúc trên toàn hệ thống.' 
                : isLeader 
                ? `Theo dõi toàn bộ danh mục khách hàng, cuộc gặp gỡ và cán bộ thuộc quyền quản lý của ${userDept}.` 
                : `Dữ liệu khách hàng, cuộc gặp gỡ và nhiệm vụ do cán bộ ${currentUser?.hoTen || ''} trực tiếp phụ trách.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
            <button
              id="reports-btn-export-leadership"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
              title="Xuất file báo cáo chuẩn nộp Lãnh đạo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất file nộp Lãnh đạo</span>
            </button>
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold text-right">
              <span className="text-blue-200 block text-[10px] uppercase">Kỳ báo cáo</span>
              <strong className="text-white text-xs sm:text-sm">Tháng {currentMonth + 1}/{currentYear}</strong>
            </div>
          </div>
        </div>

        {/* Filters for Admin / Leader */}
        {(isAdmin || isBranchLeader) && (
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-blue-200 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc phòng ban:
            </span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => {
                setSelectedDeptFilter(e.target.value);
                setSelectedOfficerFilter('all');
              }}
              className="bg-white/15 border border-white/25 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="all" className="text-slate-900">Tất cả phòng ban ({allDepartments.length})</option>
              {allDepartments.map(dept => (
                <option key={dept} value={dept} className="text-slate-900">{dept}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notice for Officer: Confirms Scope */}
      {isOfficer && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-blue-900 shadow-2xs">
          <User className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Hệ thống đang hiển thị báo cáo của tài khoản <strong>@{currentUser?.user}</strong> ({currentUser?.hoTen}). Bạn chỉ xem dữ liệu các khách hàng do mình trực tiếp quản lý.
          </span>
        </div>
      )}

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Tổng số khách hàng */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isOfficer ? 'KH của tôi' : 'Tổng khách hàng'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalCustomers}</p>
          <p className="text-[11px] text-slate-400">
            {isOfficer ? 'Bạn đang quản lý' : isLeader ? `Thuộc ${userDept}` : 'Trên toàn hệ thống'}
          </p>
        </div>

        {/* Card 2: Khách hàng mới trong tháng */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mới trong tháng</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">+{newCustomersThisMonth}</p>
          <p className="text-[11px] text-slate-400">Khách hàng phát triển mới</p>
        </div>

        {/* Card 3: Số cuộc gặp đã thực hiện */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuộc gặp gỡ</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-900">{totalMeetings}</p>
          <p className="text-[11px] text-slate-400">Đã ghi nhận tiếp xúc</p>
        </div>

        {/* Card 4: Tỷ lệ hoàn thành công việc */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hoàn thành việc</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700">{taskCompletionRate}%</p>
          <p className="text-[11px] text-slate-400">{completedTasksCount} / {scopedData.tasks.length} nhiệm vụ đã xong</p>
        </div>
      </div>

      {/* 3. Phân tích 2 Biểu đồ chính: Phân loại KH & Nhu cầu KH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Biểu đồ 1: Khách hàng theo phân loại */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-700" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Cơ cấu phân loại khách hàng
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {totalCustomers} KH
            </span>
          </div>

          {totalCustomers === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <Users className="w-8 h-8 text-slate-300 mb-1" />
              <p className="text-xs font-bold text-slate-600">Chưa có dữ liệu khách hàng</p>
              <p className="text-[11px] text-slate-400">Danh mục khách hàng chưa phát sinh trong phạm vi này</p>
            </div>
          ) : (
            <>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataClassification}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) => percent > 0 ? `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%` : ''}
                    >
                      {classificationStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Classification breakdown chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                {classificationStats.map(stat => (
                  <div key={stat.name} className="p-2 rounded-xl bg-slate-50 text-center">
                    <span className="block text-[11px] font-bold text-slate-500 truncate">{stat.name}</span>
                    <strong className="text-sm font-black" style={{ color: stat.color }}>{stat.count} KH</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Biểu đồ 2: Khách hàng có nhu cầu (Vay, Tiền gửi, Thẻ, Khác) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Khách hàng theo nhu cầu tài chính
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Đã ghi nhận
            </span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Số khách hàng" radius={[6, 6, 0, 0]}>
                  {demandStats.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Demand breakdown list */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-900 text-center">
              <span className="block text-[11px] font-bold">Vay vốn</span>
              <strong className="text-sm font-black">{demandStats[0].count} KH</strong>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-900 text-center">
              <span className="block text-[11px] font-bold">Tiền gửi</span>
              <strong className="text-sm font-black">{demandStats[1].count} KH</strong>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-900 text-center">
              <span className="block text-[11px] font-bold">Thẻ tín dụng</span>
              <strong className="text-sm font-black">{demandStats[2].count} KH</strong>
            </div>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-900 text-center">
              <span className="block text-[11px] font-bold">DV khác</span>
              <strong className="text-sm font-black">{demandStats[3].count} KH</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Báo cáo chi tiết theo từng Cán bộ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isOfficer 
                  ? 'Năng suất quản lý của cá nhân tôi' 
                  : isLeader 
                  ? `Năng suất cán bộ ${userDept}` 
                  : 'Báo cáo năng suất Cán bộ QHKH'}
              </h3>
              <p className="text-xs text-slate-500">
                {isOfficer 
                  ? 'Tổng hợp kết quả tiếp xúc và hoàn thành nhiệm vụ của bạn' 
                  : 'Theo dõi số khách hàng quản lý, số cuộc gặp đã thực hiện và tỷ lệ hoàn thành việc'}
              </p>
            </div>
          </div>

          {/* Officer Filter Dropdown: Only shown for Admin or Leader */}
          {!isOfficer && uniqueOfficers.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Lọc cán bộ:</span>
              <select
                value={selectedOfficerFilter}
                onChange={(e) => setSelectedOfficerFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả cán bộ ({uniqueOfficers.length})</option>
                {uniqueOfficers.map(off => (
                  <option key={off} value={off}>{off}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Cán bộ QHKH</th>
                <th className="py-3 px-3 text-center">Khách hàng quản lý</th>
                <th className="py-3 px-3 text-center">Cuộc gặp đã làm</th>
                <th className="py-3 px-3 text-center">Việc đã hoàn thành</th>
                <th className="py-3 px-3 text-right">Tỷ lệ hoàn thành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOfficerList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                    Chưa có số liệu phát sinh cho cán bộ này.
                  </td>
                </tr>
              ) : (
                filteredOfficerList.map((item, idx) => {
                  const completionRate = item.totalTasks > 0
                    ? Math.round((item.completedTasks / item.totalTasks) * 100)
                    : 100;
                  const isCurrentLoggedIn = currentUser && item.officer.toLowerCase().trim() === currentUser.hoTen.toLowerCase().trim();

                  return (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentLoggedIn ? 'bg-blue-50/50 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                          isCurrentLoggedIn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.officer.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="truncate block">{item.officer}</span>
                          {isCurrentLoggedIn && (
                            <span className="text-[10px] text-blue-700 font-bold">● Bạn (Đang đăng nhập)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-slate-800">
                        {item.customers} KH
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-blue-700">
                        {item.meetings} cuộc gặp
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {item.completedTasks} / {item.totalTasks} việc
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full font-black text-[11px] ${
                          completionRate >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : completionRate >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {completionRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Report Modal */}
      {isExportModalOpen && (
        <DashboardReportExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentUser={currentUser || null}
          customers={customers}
          meetings={meetings}
          tasks={tasks}
        />
      )}
    </div>
  );
};
