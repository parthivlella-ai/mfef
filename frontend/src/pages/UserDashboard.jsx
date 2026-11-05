import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pill,
  ShieldCheck,
  AlertTriangle,
  ClockAlert,
  Boxes,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Bell,
  ShieldAlert,
  Eye,
  User,
  Tag,
} from 'lucide-react';
import { dashboardService, medicineService } from '../services/api';
import { formatCurrency, formatDate, getMedicineStatus } from '../utils/dateUtils';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';
import NotificationCenter from '../components/notifications/NotificationCenter';
import StockAdjustModal from '../components/medicine/StockAdjustModal';
import DisposalModal from '../components/medicine/DisposalModal';
import { useAuth } from '../context/AuthContext';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Modals state
  const [stockModalMed, setStockModalMed] = useState(null);
  const [disposeModalMed, setDisposeModalMed] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getStats();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dispensary dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStockAdjustConfirm = async (id, delta, reason) => {
    await medicineService.adjustStock(id, delta, reason);
    setActionSuccess('Stock updated successfully');
    fetchDashboardData();
  };

  const handleDisposeConfirm = async (id, details) => {
    await medicineService.dispose(id, details);
    setActionSuccess('Batch decommissioned and logged');
    fetchDashboardData();
  };

  if (loading && !data) {
    return <LoadingSpinner text="Compiling live dispensary metrics and surveillance analytics..." fullPage />;
  }

  const summary = data?.summary || {
    totalMedicines: 0,
    activeMedicines: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringIn30DaysCount: 0,
    expiringIn7DaysCount: 0,
    expiredCount: 0,
    safeCount: 0,
    totalStockUnits: 0,
    totalInventoryValue: 0,
    unreadNotificationsCount: 0,
  };

  const categoryDistribution = data?.categoryDistribution || [];
  const expiryBreakdown = data?.expiryStatusBreakdown || {
    safe: summary.safeCount || 0,
    expiringSoon: summary.expiringIn30DaysCount || 0,
    expired: summary.expiredCount || 0,
    lowStock: summary.lowStockCount || 0,
  };

  const donutData = [
    { label: 'Safe Stock', value: expiryBreakdown.safe || 0, color: '#10b981' },
    { label: 'Expiring Soon', value: expiryBreakdown.expiringSoon || 0, color: '#f59e0b' },
    { label: 'Expired', value: expiryBreakdown.expired || 0, color: '#f43f5e' },
    { label: 'Low Stock', value: expiryBreakdown.lowStock || 0, color: '#a855f7' },
  ];

  const recentlyAdded = data?.recentlyAdded || [];
  const upcomingReminders = data?.upcomingExpiryReminders || [];
  const recentLogs = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Dispensary Operations Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span>. Real-time batch surveillance and inventory analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className={`relative p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              showNotificationPanel
                ? 'bg-teal-50 text-teal-800 border-teal-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <Bell className="w-4 h-4 text-teal-600" />
            <span>Alerts</span>
            {summary.unreadNotificationsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                {summary.unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <Link
            to="/profile"
            className="p-2 rounded-xl text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="My Profile"
          >
            <User className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <Link
            to="/medicines/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Medicine</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <AlertBanner
          type="success"
          message={actionSuccess}
          onClose={() => setActionSuccess(null)}
        />
      )}

      {error && (
        <AlertBanner
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Embedded Expiry Notification Center (collapsible or toggleable) */}
      {showNotificationPanel && (
        <NotificationCenter
          isInline={true}
          onClose={() => setShowNotificationPanel(false)}
        />
      )}

      {/* 5 Top Core Stat Cards (Total, Active, Expired, Expiring Soon, Low Stock) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Total Medicines */}
        <StatCard
          title="Total Medicines"
          value={summary.totalMedicines}
          subtitle={`${summary.totalStockUnits.toLocaleString()} units cataloged`}
          icon={Pill}
          color="teal"
          onClick={() => navigate('/inventory')}
        />

        {/* 2. Active Medicines */}
        <StatCard
          title="Active Medicines"
          value={summary.activeMedicines}
          subtitle="Non-expired active stock"
          icon={ShieldCheck}
          color="blue"
          onClick={() => navigate('/inventory?status=safe')}
        />

        {/* 3. Expired Medicines */}
        <StatCard
          title="Expired Batches"
          value={summary.expiredCount}
          subtitle="Requires immediate disposal"
          icon={ShieldAlert}
          color="red"
          onClick={() => navigate('/expiry-tracking?filter=expired')}
        />

        {/* 4. Expiring Soon (<= 30 Days) */}
        <StatCard
          title="Expiring Soon"
          value={summary.expiringIn30DaysCount}
          subtitle={`${summary.expiringIn7DaysCount} batches ≤ 7 days!`}
          icon={ClockAlert}
          color="amber"
          onClick={() => navigate('/expiry-tracking?filter=critical')}
        />

        {/* 5. Low-Stock Medicines */}
        <StatCard
          title="Low Stock Alert"
          value={summary.lowStockCount}
          subtitle="Below safety threshold"
          icon={Boxes}
          color="purple"
          onClick={() => navigate('/inventory?status=lowStock')}
        />
      </div>

      {/* Interactive Charts Row: Category Distribution + Expiry Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Categories Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <BarChart
            data={categoryDistribution}
            dataKey="count"
            labelKey="category"
            title="Medicine Therapeutic Categories"
            subtitle="Catalog breakdown by pharmaceutical classification"
            color="teal"
          />
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              {categoryDistribution.length} distinct therapeutic classes
            </span>
            <Link to="/inventory" className="text-teal-600 font-bold hover:text-teal-700">
              Browse Categories →
            </Link>
          </div>
        </div>

        {/* Chart 2: Expiry & Stock Status Donut */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <DonutChart
            data={donutData}
            title="Inventory Status Distribution"
            subtitle="Safe vs Expiring vs Expired vs Low-Stock proportions"
            centerLabel="Batches"
          />
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              Valuation: {formatCurrency(summary.totalInventoryValue)}
            </span>
            <Link to="/expiry-tracking" className="text-teal-600 font-bold hover:text-teal-700">
              Surveillance Radar →
            </Link>
          </div>
        </div>
      </div>

      {/* Two Columns: Recently Added Medicines + Upcoming Expiry Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recently Added Medicines */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                Recently Added Medicines
              </h3>
              <p className="text-[11px] text-slate-400">Latest pharmaceutical intakes added to inventory</p>
            </div>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentlyAdded.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No medicines added yet. Click "+ Add Medicine" to record your first batch.
              </p>
            ) : (
              recentlyAdded.map((med) => {
                const statusMeta = getMedicineStatus(med);
                return (
                  <div key={med._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {med.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {med.batchNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Brand: {med.brand || 'Generic'}</span>
                        <span>•</span>
                        <span>{med.quantity} {med.unit}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.color}`}>
                        {statusMeta.status}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Exp: {formatDate(med.expiryDate)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Expiry Reminders */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ClockAlert className="w-4 h-4 text-amber-500" />
                Upcoming Expiry Reminders
              </h3>
              <p className="text-[11px] text-slate-400">Batches reaching end-of-life horizon soonest</p>
            </div>
            <Link
              to="/expiry-tracking"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Surveillance Radar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingReminders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                <p className="font-semibold text-slate-700">No batches expiring soon!</p>
                <p className="text-slate-400 text-[11px]">All pharmaceutical batches have safe, extended expiry dates.</p>
              </div>
            ) : (
              upcomingReminders.map((rem) => (
                <div
                  key={rem._id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    rem.urgency === 'high'
                      ? 'bg-rose-50/70 border-rose-200'
                      : rem.urgency === 'medium'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block">
                      {rem.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>Batch: {rem.batchNumber}</span>
                      <span>•</span>
                      <span>{rem.quantity} {rem.unit}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-black ${
                        rem.urgency === 'high'
                          ? 'text-rose-700'
                          : rem.urgency === 'medium'
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {rem.daysLeft} days left
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Exp: {formatDate(rem.expiryDate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjust Modal */}
      {stockModalMed && (
        <StockAdjustModal
          isOpen={true}
          medicine={stockModalMed}
          onClose={() => setStockModalMed(null)}
          onConfirm={handleStockAdjustConfirm}
        />
      )}

      {/* Disposal Modal */}
      {disposeModalMed && (
        <DisposalModal
          isOpen={true}
          medicine={disposeModalMed}
          onClose={() => setDisposeModalMed(null)}
          onConfirm={handleDisposeConfirm}
        />
      )}
    </div>
  );
};

export default UserDashboard;
