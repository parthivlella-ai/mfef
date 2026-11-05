import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Users,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Search,
  Lock,
  Pill,
  ShieldAlert,
  Boxes,
  ClockAlert,
  UserCheck,
  UserX,
  LogOut,
  User,
  Eye,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import { adminService } from '../services/api';
import { formatDate, formatDateTime, formatCurrency } from '../utils/dateUtils';
import Badge from '../components/common/Badge';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import Modal from '../components/common/Modal';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'logs', 'system'

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Users search & filter states
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Logs filters
  const [logAction, setLogAction] = useState('All');
  const [logSeverity, setLogSeverity] = useState('All');

  // Modals state
  const [userToDelete, setUserToDelete] = useState(null);
  const [inspectUserStats, setInspectUserStats] = useState(null);
  const [loadingUserStats, setLoadingUserStats] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, usersRes, logsRes, healthRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getUsers({
          search: userSearch.trim() || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        adminService.getAuditLogs({
          action: logAction !== 'All' ? logAction : undefined,
          severity: logSeverity !== 'All' ? logSeverity : undefined,
        }),
        adminService.getSystemHealth(),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (logsRes.success) setLogs(logsRes.data);
      if (healthRes.success) setSystemHealth(healthRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load administrator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userSearch, roleFilter, statusFilter, logAction, logSeverity]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      setSuccess(`User role updated to ${newRole}`);
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await adminService.toggleUserStatus(userId, newStatus);
      setSuccess(`User status changed to ${newStatus}`);
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    try {
      await adminService.deleteUser(userToDelete._id);
      setSuccess(`User "${userToDelete.name}" permanently deleted.`);
      setUserToDelete(null);
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to delete user account');
    }
  };

  const handleInspectUser = async (userId) => {
    try {
      setLoadingUserStats(true);
      const res = await adminService.getUserStats(userId);
      if (res.success && res.data) {
        setInspectUserStats(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to inspect user medicine stats');
    } finally {
      setLoadingUserStats(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const metrics = dashboardData?.metrics || {
    totalRegisteredUsers: 0,
    totalAllUsers: 0,
    activeUsersCount: 0,
    inactiveUsersCount: 0,
    totalMedicinesAcrossPlatform: 0,
    totalActiveMedicines: 0,
    totalExpiredMedicines: 0,
    totalExpiringSoonMedicines: 0,
  };

  const charts = dashboardData?.charts || {
    categoryDistribution: [],
    expiryDistribution: { safe: 0, expiringSoon: 0, expired: 0 },
    userStatusBreakdown: { active: 0, inactive: 0 },
    registrationTrend: [],
  };

  const recentlyRegistered = dashboardData?.recentlyRegisteredUsers || [];

  const platformDonut = [
    { label: 'Safe Stock', value: charts.expiryDistribution?.safe || 0, color: '#10b981' },
    { label: 'Expiring Soon', value: charts.expiryDistribution?.expiringSoon || 0, color: '#f59e0b' },
    { label: 'Expired', value: charts.expiryDistribution?.expired || 0, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Admin Profile / Logout Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Admin Governance Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System-wide platform oversight, user management, and real-time MongoDB analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Admin Identity pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <span className="font-semibold text-purple-900">{user?.name}</span>
            <span className="text-[10px] font-bold uppercase text-purple-600 bg-purple-100 px-1.5 py-0.2 rounded">
              Super Admin
            </span>
          </div>

          <Link
            to="/profile"
            className="p-2 rounded-xl text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="Admin Profile"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="Sync all data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
            title="Sign out of Admin session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {success && (
        <AlertBanner
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      {error && (
        <AlertBanner
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* 5 Core Admin Metric Cards (Dynamic MongoDB Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Total Registered Users */}
        <StatCard
          title="Total Users"
          value={metrics.totalRegisteredUsers}
          subtitle={`${metrics.activeUsersCount} active / ${metrics.inactiveUsersCount} inactive`}
          icon={Users}
          color="purple"
          onClick={() => setActiveTab('users')}
        />

        {/* 2. Total Platform Medicines */}
        <StatCard
          title="Platform Medicines"
          value={metrics.totalMedicinesAcrossPlatform}
          subtitle="Across all users"
          icon={Pill}
          color="teal"
        />

        {/* 3. Total Expired Medicines */}
        <StatCard
          title="Expired Medicines"
          value={metrics.totalExpiredMedicines}
          subtitle="Platform-wide expired"
          icon={ShieldAlert}
          color="red"
        />

        {/* 4. Expiring Soon (≤ 30d) */}
        <StatCard
          title="Expiring Soon"
          value={metrics.totalExpiringSoonMedicines}
          subtitle="Upcoming 30-day radar"
          icon={ClockAlert}
          color="amber"
        />

        {/* 5. Active Stock Units */}
        <StatCard
          title="Active Medicines"
          value={metrics.totalActiveMedicines}
          subtitle="Safe clinical inventory"
          icon={CheckCircle2}
          color="blue"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Platform Overview & Charts</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Management ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Audit Logs ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'system'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>System Diagnostics</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Compiling administrative analytics from MongoDB..." />
      ) : activeTab === 'overview' ? (
        /* TAB 1: OVERVIEW & PLATFORM CHARTS */
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Platform Categories Bar Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <BarChart
                data={charts.categoryDistribution}
                dataKey="count"
                labelKey="category"
                title="Platform Drug Categories"
                subtitle="Distribution across all dispensary inventories"
                color="purple"
              />
            </div>

            {/* Chart 2: Platform Expiry Donut Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <DonutChart
                data={platformDonut}
                title="Platform Expiry Surveillance"
                subtitle="Safe vs Expiring vs Expired batches across platform"
                centerLabel="Total Batches"
              />
            </div>

            {/* Chart 3: Registration Trend */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <TrendLineChart
                data={charts.registrationTrend.length > 0 ? charts.registrationTrend : [{ month: 'Current', count: metrics.totalAllUsers }]}
                labelKey="month"
                valueKey="count"
                title="User Growth Trend"
                subtitle="Monthly account registration volume"
                color="purple"
              />
            </div>
          </div>

          {/* Two-Column: Recently Registered Users + Recent Platform Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recently Registered Users */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Recently Registered Users
                  </h3>
                  <p className="text-[11px] text-slate-400">Newly created pharmacy & staff accounts</p>
                </div>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700"
                >
                  Manage All →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {recentlyRegistered.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No recent users.</p>
                ) : (
                  recentlyRegistered.map((usr) => (
                    <div key={usr._id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                          {usr.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{usr.name}</span>
                          <span className="text-[11px] text-slate-500">{usr.email}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          usr.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {usr.status}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {formatDate(usr.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity Audit Logs */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    Recent Platform Audit Logs
                  </h3>
                  <p className="text-[11px] text-slate-400">Real-time compliance activity trail</p>
                </div>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700"
                >
                  View Full Trail →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {dashboardData?.recentActivity?.slice(0, 5).map((log, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{log.title}</p>
                      <p className="text-[11px] text-slate-500">{log.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        /* TAB 2: USERS MANAGEMENT & SEARCH */
        <div className="space-y-4">
          {/* Search and Filters Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name, email, or pharmacy..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-purple-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="inactive">Inactive Accounts</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">User Account</th>
                    <th className="py-3.5 px-3">Role Tier</th>
                    <th className="py-3.5 px-3">Facility & License</th>
                    <th className="py-3.5 px-3">Medicine Statistics</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Registered</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((usr) => {
                    const isCurrent = usr._id === user?._id || usr.email === user?.email;
                    return (
                      <tr key={usr._id} className="hover:bg-slate-50 transition">
                        {/* Name & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                              {usr.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {usr.name} {isCurrent && <span className="text-[10px] text-purple-600 font-semibold">(You)</span>}
                              </span>
                              <span className="text-[11px] text-slate-500">{usr.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Selector */}
                        <td className="py-3.5 px-3">
                          <select
                            value={usr.role}
                            onChange={(e) => handleRoleChange(usr._id, e.target.value)}
                            disabled={isCurrent}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 disabled:opacity-60 capitalize"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        {/* Facility & License */}
                        <td className="py-3.5 px-3 text-[11px]">
                          <span className="text-slate-800 font-medium block truncate max-w-[150px]">
                            {usr.pharmacyName || 'Central Pharmacy'}
                          </span>
                          <span className="text-slate-500 font-mono">
                            {usr.licenseNumber || 'N/A'}
                          </span>
                        </td>

                        {/* User Medicine Statistics Pill */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => handleInspectUser(usr._id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Inspect user's medicine inventory"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
                            <span className="font-bold">{usr.stats?.medicineCount || 0}</span>
                            <span className="text-slate-400 font-normal">meds</span>
                            {usr.stats?.expiredCount > 0 && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1 rounded">
                                {usr.stats.expiredCount} exp
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Status Toggle Button */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => handleStatusToggle(usr._id, usr.status)}
                            disabled={isCurrent}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                              usr.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            } disabled:opacity-60`}
                          >
                            {usr.status === 'active' ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>

                        {/* Date Registered */}
                        <td className="py-3.5 px-3 text-[11px] text-slate-500">
                          {formatDate(usr.createdAt)}
                        </td>

                        {/* Delete User Action */}
                        <td className="py-3.5 px-4 text-right">
                          {!isCurrent && (
                            <button
                              onClick={() => setUserToDelete(usr)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete user account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'logs' ? (
        /* TAB 3: AUDIT LOGS */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Filter Action:</span>
              <select
                value={logAction}
                onChange={(e) => setLogAction(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
              >
                <option value="All">All Actions</option>
                <option value="MEDICINE_CREATED">Medicine Added</option>
                <option value="MEDICINE_UPDATED">Medicine Updated</option>
                <option value="MEDICINE_DELETED">Medicine Deleted</option>
                <option value="STOCK_ADJUSTED">Stock Adjusted</option>
                <option value="MEDICINE_DISPOSED">Medicine Disposed</option>
                <option value="USER_ROLE_UPDATED">Role Changed</option>
                <option value="USER_STATUS_UPDATED">Status Changed</option>
                <option value="USER_DELETED">User Deleted</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Severity:</span>
              <select
                value={logSeverity}
                onChange={(e) => setLogSeverity(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
              >
                <option value="All">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No activity logs match the selected filter.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="p-4 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{log.title}</p>
                    <p className="text-slate-600">{log.description}</p>
                    <p className="text-[10px] text-slate-400">
                      User: {log.user?.name} ({log.user?.role || 'staff'}) • {log.action}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* TAB 4: SYSTEM DIAGNOSTICS */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase">MongoDB Status</span>
              <p className="text-xl font-black text-emerald-600">
                {systemHealth?.database?.status === 'connected' ? 'Connected' : 'Active'}
              </p>
              <p className="text-xs text-slate-500">
                Host: {systemHealth?.database?.host || '127.0.0.1'} / DB: {systemHealth?.database?.name || 'meditrack'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase">Node Environment</span>
              <p className="text-xl font-black text-purple-600">
                {systemHealth?.server?.nodeVersion || process.version || 'Node.js'}
              </p>
              <p className="text-xs text-slate-500">
                Uptime: {Math.floor((systemHealth?.server?.uptimeSeconds || 60) / 60)} minutes
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase">Platform Health</span>
              <p className="text-xl font-black text-teal-600">Optimal</p>
              <p className="text-xs text-slate-500">
                Memory: {systemHealth?.server?.memoryMb || 85} MB RSS
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Medicine Statistics Inspector Modal */}
      {inspectUserStats && (
        <Modal
          isOpen={true}
          onClose={() => setInspectUserStats(null)}
          title={`Medicine Statistics: ${inspectUserStats.user?.name}`}
          subtitle={`Account: ${inspectUserStats.user?.email} • ${inspectUserStats.user?.pharmacyName || 'Pharmacy'}`}
        >
          <div className="space-y-4 text-xs">
            {/* 4 User Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Meds</span>
                <span className="text-lg font-black text-slate-900">{inspectUserStats.stats?.totalMedicines}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Active Stock</span>
                <span className="text-lg font-black text-emerald-700">{inspectUserStats.stats?.activeMedicines}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Expired</span>
                <span className="text-lg font-black text-rose-700">{inspectUserStats.stats?.expiredCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Total Units</span>
                <span className="text-lg font-black text-purple-700">{inspectUserStats.stats?.totalStock}</span>
              </div>
            </div>

            {/* User Medicine Sample Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                User Medicine Inventory Sample ({inspectUserStats.medicines?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Medicine & Brand</th>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectUserStats.medicines?.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.name}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{m.batchNumber}</td>
                        <td className="py-2 px-3">{m.quantity} {m.unit}</td>
                        <td className="py-2 px-3 text-slate-600">{formatDate(m.expiryDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectUserStats(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setUserToDelete(null)}
          title="Delete User Account"
          subtitle="Are you sure you want to permanently delete this user?"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              <p className="font-bold text-sm mb-1">Confirm Irreversible Account Deletion</p>
              <p>
                You are about to permanently delete <strong>{userToDelete.name}</strong> ({userToDelete.email}) and all their associated medicine records.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition"
              >
                Confirm Delete Account
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
