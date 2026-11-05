import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Download,
  Trash2,
  Edit,
  ClockAlert,
  Boxes,
  ArrowUpDown,
  AlertTriangle,
  RotateCcw,
  LayoutGrid,
  List,
  Eye,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  DollarSign,
  Tag,
} from 'lucide-react';
import { medicineService } from '../services/api';
import { formatDate, formatCurrency, getMedicineStatus } from '../utils/dateUtils';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import AlertBanner from '../components/common/AlertBanner';
import StockAdjustModal from '../components/medicine/StockAdjustModal';
import DisposalModal from '../components/medicine/DisposalModal';
import EditMedicineModal from '../components/medicine/EditMedicineModal';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

const MedicineInventory = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search, Filter, Sort and Threshold states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [threshold, setThreshold] = useState(Number(searchParams.get('threshold')) || 10);
  const [sortBy, setSortBy] = useState('expiryDate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // Data states
  const [medicines, setMedicines] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    expired: 0,
    expiring7: 0,
    expiring30: 0,
    lowStock: 0,
    safe: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals state
  const [stockModalMed, setStockModalMed] = useState(null);
  const [disposeModalMed, setDisposeModalMed] = useState(null);
  const [detailModalMed, setDetailModalMed] = useState(null);
  const [editModalMed, setEditModalMed] = useState(null);
  const [deleteConfirmMed, setDeleteConfirmMed] = useState(null);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await medicineService.getStats({ threshold });
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch medicine stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        search: search.trim() || undefined,
        category: category !== 'All' ? category : undefined,
        statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
        threshold,
        sortBy,
        sortOrder,
      };

      const res = await medicineService.getAll(params);
      if (res.success && res.data) {
        setMedicines(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [threshold]);

  useEffect(() => {
    fetchMedicines();
  }, [category, statusFilter, threshold, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedicines();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All');
    setStatusFilter('all');
    setThreshold(10);
    setSortBy('expiryDate');
    setSortOrder('asc');
    setSearchParams({});
    setTimeout(() => {
      fetchMedicines();
      fetchStats();
    }, 0);
  };

  const handleStockAdjustConfirm = async (id, delta, reason) => {
    await medicineService.adjustStock(id, delta, reason);
    setSuccessMsg('Stock adjusted successfully');
    fetchMedicines();
    fetchStats();
  };

  const handleDisposeConfirm = async (id, details) => {
    await medicineService.dispose(id, details);
    setSuccessMsg('Medicine batch marked as decommissioned / disposed');
    fetchMedicines();
    fetchStats();
  };

  const handleEditSuccess = (updatedMed) => {
    setSuccessMsg(`Successfully updated "${updatedMed.name}"`);
    fetchMedicines();
    fetchStats();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmMed) return;
    try {
      await medicineService.delete(deleteConfirmMed._id);
      setSuccessMsg(`"${deleteConfirmMed.name}" permanently deleted from your inventory.`);
      setDeleteConfirmMed(null);
      fetchMedicines();
      fetchStats();
    } catch (err) {
      setError(err.message || 'Failed to delete medicine');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (medicines.length === 0) return;

    const headers = [
      'Medicine Name',
      'Brand',
      'Category',
      'Batch Number',
      'Quantity',
      'Unit',
      'Price',
      'Purchase Date',
      'Expiry Date',
      'Days Until Expiry',
      'Status Indicator',
    ];

    const rows = medicines.map((m) => {
      const statusMeta = getMedicineStatus(m, threshold);
      return [
        `"${m.name}"`,
        `"${m.brand || ''}"`,
        `"${m.category}"`,
        `"${m.batchNumber}"`,
        m.quantity,
        `"${m.unit}"`,
        m.price !== undefined && m.price !== null ? m.price : (m.unitPrice || ''),
        `"${formatDate(m.purchaseDate || m.createdAt)}"`,
        `"${formatDate(m.expiryDate)}"`,
        statusMeta.days !== null ? statusMeta.days : '',
        `"${statusMeta.status}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meditrack_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = [
    'All',
    'Antibiotics',
    'Analgesics',
    'Antipyretics',
    'Antihistamines',
    'Cardiovascular',
    'Antidiabetic',
    'Respiratory',
    'Vitamins & Supplements',
    'Gastrointestinal',
    'Dermatological',
    'Other',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Medicine Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal pharmaceutical inventory with automated expiry tracking and stock alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition"
            title="Download CSV export"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/medicines/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Medicine</span>
          </Link>
        </div>
      </div>

      {successMsg && (
        <AlertBanner
          type="success"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {error && (
        <AlertBanner
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Metrics & Filter Pills Bar (Total, Expired, Expiring 7d, Expiring 30d, Low Stock, Safe) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Medicines */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            statusFilter === 'all'
              ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-200 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Medicines
            </span>
            <Boxes className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[11px] text-slate-400 font-medium">batches</span>
          </div>
        </button>

        {/* Expired */}
        <button
          onClick={() => setStatusFilter('expired')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            statusFilter === 'expired'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-rose-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Expired
            </span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-700">{stats.expired}</span>
            <span className="text-[11px] text-rose-500 font-medium">past date</span>
          </div>
        </button>

        {/* Expiring in 7 Days */}
        <button
          onClick={() => setStatusFilter('expiring7')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            statusFilter === 'expiring7'
              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-orange-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
              &le; 7 Days Expiry
            </span>
            <ClockAlert className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-orange-700">{stats.expiring7}</span>
            <span className="text-[11px] text-orange-500 font-medium">urgent</span>
          </div>
        </button>

        {/* Expiring in 30 Days */}
        <button
          onClick={() => setStatusFilter('expiring30')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            statusFilter === 'expiring30'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-amber-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              &le; 30 Days Expiry
            </span>
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-700">{stats.expiring30}</span>
            <span className="text-[11px] text-amber-500 font-medium">soon</span>
          </div>
        </button>

        {/* Low Stock (Configurable Threshold) */}
        <button
          onClick={() => setStatusFilter('lowStock')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            statusFilter === 'lowStock'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-purple-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Low Stock
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-800">{stats.lowStock}</span>
            <span className="text-[10px] text-purple-500 font-semibold">&le; {threshold} units</span>
          </div>
        </button>

        {/* Safe */}
        <button
          onClick={() => setStatusFilter('safe')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            statusFilter === 'safe'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-emerald-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Safe Stock
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-700">{stats.safe}</span>
            <span className="text-[11px] text-emerald-500 font-medium">&gt; 30 days</span>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        {/* Row 1: Search Form + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicines by name or brand..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition"
            >
              Search
            </button>
          </form>

          {/* Table / Grid Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-teal-700' : 'text-slate-500'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-white shadow-2xs text-teal-700' : 'text-slate-500'
              }`}
              title="Grid Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Select Filters (Category, Status, Threshold, SortBy) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Filter by Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:bg-white focus:border-teal-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Indicator Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Status Indicator Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:bg-white focus:border-teal-500"
            >
              <option value="all">All Medicines</option>
              <option value="expired">Expired (&le; 0 Days)</option>
              <option value="expiring7">Expiring within 7 Days</option>
              <option value="expiring30">Expiring within 30 Days</option>
              <option value="lowStock">Low Stock (&le; Threshold)</option>
              <option value="safe">Safe Stock</option>
            </select>
          </div>

          {/* Low Stock Threshold Config */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
              <span>Low-Stock Threshold</span>
              <span className="text-teal-600 font-bold">{threshold} qty</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="500"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold outline-none focus:bg-white focus:border-teal-500"
              />
            </div>
          </div>

          {/* Sort By Expiry Date or Quantity */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Sort By
            </label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:bg-white focus:border-teal-500 text-xs"
              >
                <option value="expiryDate">Expiry Date</option>
                <option value="quantity">Stock Quantity</option>
                <option value="name">Medicine Name</option>
                <option value="createdAt">Date Added</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition shrink-0"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Helper */}
        {(category !== 'All' || statusFilter !== 'all' || search || threshold !== 10) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Filters applied • {medicines.length} medicine{medicines.length === 1 ? '' : 's'} displayed
            </span>
            <button
              onClick={handleResetFilters}
              className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Results Container */}
      {loading ? (
        <LoadingSpinner text="Querying medicine records from database..." />
      ) : medicines.length === 0 ? (
        <EmptyState
          title="No Medicines Found"
          description={
            search || category !== 'All' || statusFilter !== 'all'
              ? 'No medicines match the selected filter criteria. Try adjusting your search or reset filters.'
              : 'Your medicine inventory is currently empty. Click "Add Medicine" to create your first record.'
          }
          actionLabel={search || category !== 'All' || statusFilter !== 'all' ? 'Reset Filters' : 'Add First Medicine'}
          onAction={
            search || category !== 'All' || statusFilter !== 'all'
              ? handleResetFilters
              : () => (window.location.href = '/medicines/new')
          }
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200/80 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Medicine & Brand</th>
                  <th className="py-3.5 px-3">Category & Batch</th>
                  <th className="py-3.5 px-3">Stock Quantity</th>
                  <th className="py-3.5 px-3">Expiry Date</th>
                  <th className="py-3.5 px-3">Status Indicator</th>
                  <th className="py-3.5 px-3">Price</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((med) => {
                  const statusMeta = getMedicineStatus(med, threshold);
                  const isLow = med.quantity <= (med.minStockLevel || threshold) && med.quantity > 0;
                  const isOut = med.quantity === 0;

                  return (
                    <tr
                      key={med._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {med.name}
                        </div>
                        <div className="text-[11px] text-teal-700 font-semibold mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {med.brand || med.supplier || 'Generic'}
                        </div>
                        {med.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {med.description}
                          </p>
                        )}
                      </td>

                      {/* Category & Batch */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-semibold text-slate-800 block text-xs">
                          {med.batchNumber}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {med.category}
                        </span>
                      </td>

                      {/* Quantity & Unit */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-black text-sm ${
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-purple-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {med.quantity}
                          </span>
                          <span className="text-slate-500 text-[11px] font-medium">
                            {med.unit || 'Units'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Min alert: {med.minStockLevel || threshold}
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {formatDate(med.expiryDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Purchased: {formatDate(med.purchaseDate || med.createdAt)}
                        </div>
                      </td>

                      {/* Status Indicator (Safe, Expiring Soon, Expired, Low Stock) */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.color}`}
                        >
                          {statusMeta.status === 'Expired' && <ShieldAlert className="w-3 h-3 shrink-0" />}
                          {statusMeta.status === 'Expiring Soon' && <ClockAlert className="w-3 h-3 shrink-0" />}
                          {statusMeta.status === 'Low Stock' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {statusMeta.status === 'Safe' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                          {statusMeta.status}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {med.price !== undefined && med.price !== null
                          ? formatCurrency(med.price)
                          : med.unitPrice
                          ? formatCurrency(med.unitPrice)
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailModalMed(med)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditModalMed(med)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition"
                            title="Edit Medicine Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setStockModalMed(med)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition"
                            title="Quick Stock +/-"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>

                          {!med.isDisposed && med.status !== 'disposed' && (
                            <button
                              onClick={() => setDisposeModalMed(med)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition"
                              title="Decommission / Dispose"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteConfirmMed(med)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicines.map((med) => {
            const statusMeta = getMedicineStatus(med, threshold);
            const isLow = med.quantity <= (med.minStockLevel || threshold) && med.quantity > 0;
            const isOut = med.quantity === 0;

            return (
              <div
                key={med._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {med.name}
                      </h3>
                      <p className="text-xs text-teal-700 font-semibold mt-0.5">
                        Brand: {med.brand || med.supplier || 'Generic'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.color}`}
                    >
                      {statusMeta.status}
                    </span>
                  </div>

                  {med.description && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                      {med.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Stock Quantity
                      </span>
                      <span
                        className={`font-bold ${
                          isOut ? 'text-rose-600' : isLow ? 'text-purple-700' : 'text-slate-900'
                        }`}
                      >
                        {med.quantity} {med.unit || 'Units'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Price
                      </span>
                      <span className="font-bold text-slate-900">
                        {med.price !== undefined && med.price !== null
                          ? formatCurrency(med.price)
                          : med.unitPrice
                          ? formatCurrency(med.unitPrice)
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Batch #
                      </span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {med.batchNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Expiry Date
                      </span>
                      <span className="font-medium text-slate-700">
                        {formatDate(med.expiryDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {statusMeta.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDetailModalMed(med)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setEditModalMed(med)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setStockModalMed(med)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition"
                    >
                      Stock
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Inspector Modal */}
      {detailModalMed && (
        <Modal
          isOpen={true}
          onClose={() => setDetailModalMed(null)}
          title={detailModalMed.name}
          subtitle={`Batch: ${detailModalMed.batchNumber} • ${detailModalMed.category}`}
        >
          <div className="space-y-4 text-xs">
            {/* Status Ribbon */}
            {(() => {
              const meta = getMedicineStatus(detailModalMed, threshold);
              return (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${meta.color}`}>
                  <div className="flex items-center gap-2">
                    {meta.status === 'Expired' && <ShieldAlert className="w-5 h-5" />}
                    {meta.status === 'Expiring Soon' && <ClockAlert className="w-5 h-5" />}
                    {meta.status === 'Low Stock' && <AlertTriangle className="w-5 h-5" />}
                    {meta.status === 'Safe' && <CheckCircle2 className="w-5 h-5" />}
                    <div>
                      <span className="font-bold text-sm block">Status: {meta.status}</span>
                      <span className="text-[11px] opacity-90">{meta.label}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold">
                    {meta.days !== null ? `${meta.days} days` : ''}
                  </span>
                </div>
              );
            })()}

            {/* Grid of all required schema fields */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Medicine Name</span>
                <span className="font-bold text-slate-900 text-sm">{detailModalMed.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Brand / Manufacturer</span>
                <span className="font-bold text-teal-700">{detailModalMed.brand || detailModalMed.supplier || 'Generic'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-semibold text-slate-800">{detailModalMed.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Batch Number</span>
                <span className="font-mono font-bold text-slate-800">{detailModalMed.batchNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity & Unit</span>
                <span className="font-bold text-slate-900 text-sm">
                  {detailModalMed.quantity} {detailModalMed.unit || 'Units'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Low-Stock Alert Level</span>
                <span className="font-semibold text-slate-800">{detailModalMed.minStockLevel || threshold} units</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Price</span>
                <span className="font-semibold text-slate-800">
                  {detailModalMed.price !== undefined && detailModalMed.price !== null
                    ? formatCurrency(detailModalMed.price)
                    : detailModalMed.unitPrice
                    ? formatCurrency(detailModalMed.unitPrice)
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Purchase Date</span>
                <span className="font-medium text-slate-800">
                  {formatDate(detailModalMed.purchaseDate || detailModalMed.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Expiry Date</span>
                <span className="font-bold text-rose-700">{formatDate(detailModalMed.expiryDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Date Created / Intake</span>
                <span className="font-medium text-slate-700">{formatDate(detailModalMed.createdAt)}</span>
              </div>
            </div>

            {/* Description */}
            {detailModalMed.description && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Description / Clinical Notes
                </span>
                <p className="p-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                  {detailModalMed.description}
                </p>
              </div>
            )}

            {/* Storage details */}
            {(detailModalMed.storageCondition || detailModalMed.rackLocation) && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Condition</span>
                  <span className="font-medium text-slate-800">{detailModalMed.storageCondition || 'Room Temperature'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Rack Location</span>
                  <span className="font-medium text-slate-800">{detailModalMed.rackLocation || 'Unassigned'}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => {
                  const m = detailModalMed;
                  setDetailModalMed(null);
                  setEditModalMed(m);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Details
              </button>

              <button
                onClick={() => setDetailModalMed(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Medicine Modal */}
      {editModalMed && (
        <EditMedicineModal
          isOpen={true}
          medicine={editModalMed}
          onClose={() => setEditModalMed(null)}
          onSuccess={handleEditSuccess}
        />
      )}

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

      {/* Delete Confirmation Modal */}
      {deleteConfirmMed && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmMed(null)}
          title="Delete Medicine Record"
          subtitle="Are you sure you want to permanently delete this medicine?"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              <p className="font-bold text-sm mb-1">Warning: Irreversible Action</p>
              <p>
                You are about to delete <strong>{deleteConfirmMed.name}</strong> (Brand: {deleteConfirmMed.brand || 'Generic'}, Batch: {deleteConfirmMed.batchNumber}) from your personal inventory.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmMed(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MedicineInventory;
