import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ClockAlert,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  DollarSign,
  Trash2,
  Boxes,
  RefreshCw,
  Info,
  Tag,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { medicineService } from '../services/api';
import { formatDate, formatCurrency, getMedicineStatus } from '../utils/dateUtils';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import AlertBanner from '../components/common/AlertBanner';
import DisposalModal from '../components/medicine/DisposalModal';
import StockAdjustModal from '../components/medicine/StockAdjustModal';
import Modal from '../components/common/Modal';

const ExpiryTracking = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab filter: 'all', 'expired', 'expiring7', 'expiring30', 'safe'
  const [activeTab, setActiveTab] = useState(searchParams.get('filter') || 'all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [disposeModalMed, setDisposeModalMed] = useState(null);
  const [stockModalMed, setStockModalMed] = useState(null);
  const [detailModalMed, setDetailModalMed] = useState(null);

  const fetchExpiryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await medicineService.getExpiryBreakdown();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch expiry surveillance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryData();
  }, []);

  const handleDisposeConfirm = async (id, details) => {
    await medicineService.dispose(id, details);
    setSuccess('Medicine batch marked as decommissioned and disposed.');
    fetchExpiryData();
  };

  const handleStockAdjustConfirm = async (id, delta, reason) => {
    await medicineService.adjustStock(id, delta, reason);
    setSuccess('Stock balance updated successfully.');
    fetchExpiryData();
  };

  const counts = data?.counts || { total: 0, expired: 0, expiring7: 0, expiring30: 0, safe: 0 };
  const lists = data?.data || { expired: [], expiring7: [], expiring30: [], safe: [] };

  // Determine current active list based on tab
  let displayedList = [];
  if (activeTab === 'all') {
    displayedList = [
      ...lists.expired,
      ...lists.expiring7,
      ...lists.expiring30,
      ...lists.safe,
    ];
  } else if (activeTab === 'expired') {
    displayedList = lists.expired;
  } else if (activeTab === 'expiring7') {
    displayedList = lists.expiring7;
  } else if (activeTab === 'expiring30') {
    // Both under 7 and 7-30 days
    displayedList = [...lists.expiring7, ...lists.expiring30];
  } else if (activeTab === 'safe') {
    displayedList = lists.safe;
  }

  // Calculate value at risk
  const expiredValueAtRisk = lists.expired.reduce(
    (acc, m) => acc + (m.quantity || 0) * (m.price || m.unitPrice || 0),
    0
  );
  const urgent7ValueAtRisk = lists.expiring7.reduce(
    (acc, m) => acc + (m.quantity || 0) * (m.price || m.unitPrice || 0),
    0
  );
  const soon30ValueAtRisk = [...lists.expiring7, ...lists.expiring30].reduce(
    (acc, m) => acc + (m.quantity || 0) * (m.price || m.unitPrice || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Expiry Tracking & Early Warning System
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance of upcoming medicine expiry dates calculated dynamically against today's date.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchExpiryData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="Refresh expiry surveillance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/inventory"
            className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100/60 px-3.5 py-2 rounded-xl transition"
          >
            View Inventory →
          </Link>
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

      {/* 4 Urgency Category Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expired Medicines */}
        <div
          onClick={() => setActiveTab('expired')}
          className={`cursor-pointer rounded-2xl border p-5 transition ${
            activeTab === 'expired'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200 shadow-md'
              : 'bg-white border-rose-200/80 hover:bg-rose-50/40 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Expired Stock
            </span>
            <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
              {counts.expired}
            </span>
          </div>
          <p className="text-xl font-bold text-rose-900 mt-2">
            {formatCurrency(expiredValueAtRisk)}
          </p>
          <p className="text-[11px] text-rose-600 font-medium mt-0.5">
            Requires immediate decommissioning
          </p>
        </div>

        {/* Expiring within 7 Days */}
        <div
          onClick={() => setActiveTab('expiring7')}
          className={`cursor-pointer rounded-2xl border p-5 transition ${
            activeTab === 'expiring7'
              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200 shadow-md'
              : 'bg-white border-orange-200/80 hover:bg-orange-50/40 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
              Expiring &le; 7 Days
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
              {counts.expiring7}
            </span>
          </div>
          <p className="text-xl font-bold text-orange-900 mt-2">
            {formatCurrency(urgent7ValueAtRisk)}
          </p>
          <p className="text-[11px] text-orange-600 font-medium mt-0.5">
            Critical 7-day priority window
          </p>
        </div>

        {/* Expiring within 30 Days */}
        <div
          onClick={() => setActiveTab('expiring30')}
          className={`cursor-pointer rounded-2xl border p-5 transition ${
            activeTab === 'expiring30'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200 shadow-md'
              : 'bg-white border-amber-200/80 hover:bg-amber-50/40 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Expiring &le; 30 Days
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
              {counts.expiring7 + counts.expiring30}
            </span>
          </div>
          <p className="text-xl font-bold text-amber-900 mt-2">
            {formatCurrency(soon30ValueAtRisk)}
          </p>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">
            Active 30-day monitoring horizon
          </p>
        </div>

        {/* Safe Stock */}
        <div
          onClick={() => setActiveTab('safe')}
          className={`cursor-pointer rounded-2xl border p-5 transition ${
            activeTab === 'safe'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 shadow-md'
              : 'bg-white border-emerald-200/80 hover:bg-emerald-50/40 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Safe Stock (&gt; 30 Days)
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              {counts.safe}
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-900 mt-2">
            {counts.safe} Batches
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
            Optimal shelf lifecycle
          </p>
        </div>
      </div>

      {/* Tabs Filter Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Monitored ({counts.total})
        </button>
        <button
          onClick={() => setActiveTab('expired')}
          className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'expired'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Expired Batches ({counts.expired})
        </button>
        <button
          onClick={() => setActiveTab('expiring7')}
          className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'expiring7'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Expiring &le; 7 Days ({counts.expiring7})
        </button>
        <button
          onClick={() => setActiveTab('expiring30')}
          className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'expiring30'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Expiring &le; 30 Days ({counts.expiring7 + counts.expiring30})
        </button>
        <button
          onClick={() => setActiveTab('safe')}
          className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
            activeTab === 'safe'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Safe Stock ({counts.safe})
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <LoadingSpinner text="Computing real-time batch expiry dates..." />
      ) : displayedList.length === 0 ? (
        <EmptyState
          title="No Batches in this Urgency Category"
          description="None of your active medicine batches fall into the selected expiry bracket."
          actionLabel="View All Monitored"
          onAction={() => setActiveTab('all')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200/80 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Medicine & Brand</th>
                  <th className="py-3.5 px-3">Batch & Category</th>
                  <th className="py-3.5 px-3">Quantity</th>
                  <th className="py-3.5 px-3">Expiry Date</th>
                  <th className="py-3.5 px-3">Status Indicator</th>
                  <th className="py-3.5 px-3">Est. Value</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedList.map((med) => {
                  const statusMeta = getMedicineStatus(med);
                  const isExpired = statusMeta.status === 'Expired';
                  const isExpiring7 = statusMeta.status === 'Expiring Soon' && statusMeta.isUnder7;
                  const unitVal = med.price !== undefined && med.price !== null ? med.price : (med.unitPrice || 0);
                  const batchTotalVal = (med.quantity || 0) * unitVal;

                  return (
                    <tr
                      key={med._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isExpired
                          ? 'bg-rose-50/30'
                          : isExpiring7
                          ? 'bg-orange-50/30'
                          : ''
                      }`}
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
                      </td>

                      {/* Batch & Category */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-semibold text-slate-800 block text-xs">
                          {med.batchNumber}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {med.category}
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 text-sm">
                          {med.quantity}
                        </span>
                        <span className="text-slate-500 text-[11px] ml-1">
                          {med.unit || 'Units'}
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {formatDate(med.expiryDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {statusMeta.days !== null
                            ? statusMeta.days <= 0
                              ? `Expired ${Math.abs(statusMeta.days)} days ago`
                              : `${statusMeta.days} days remaining`
                            : ''}
                        </div>
                      </td>

                      {/* Status Indicator */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.color}`}
                        >
                          {statusMeta.status === 'Expired' && <ShieldAlert className="w-3 h-3 shrink-0" />}
                          {statusMeta.status === 'Expiring Soon' && <ClockAlert className="w-3 h-3 shrink-0" />}
                          {statusMeta.status === 'Safe' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                          {statusMeta.status === 'Low Stock' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {statusMeta.status}
                        </span>
                      </td>

                      {/* Est. Value */}
                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {formatCurrency(batchTotalVal)}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {formatCurrency(unitVal)} / unit
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailModalMed(med)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setStockModalMed(med)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition"
                            title="Quick Stock +/-"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>

                          {isExpired && (
                            <button
                              onClick={() => setDisposeModalMed(med)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1 shadow-2xs"
                              title="Biohazard Disposal"
                            >
                              <Trash2 className="w-3 h-3" />
                              Dispose
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailModalMed && (
        <Modal
          isOpen={true}
          onClose={() => setDetailModalMed(null)}
          title={detailModalMed.name}
          subtitle={`Batch: ${detailModalMed.batchNumber} • ${detailModalMed.category}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Brand</span>
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
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Stock</span>
                <span className="font-bold text-slate-900 text-sm">
                  {detailModalMed.quantity} {detailModalMed.unit || 'Units'}
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
            </div>

            {detailModalMed.description && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Description</span>
                <p className="text-slate-700 font-medium">{detailModalMed.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModalMed(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
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
    </div>
  );
};

export default ExpiryTracking;
