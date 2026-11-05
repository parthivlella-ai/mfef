import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ClockAlert,
  ShieldAlert,
  Trash2,
  CheckCheck,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import { notificationService } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = ({ isInline = false, onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll();
      if (res.success && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const filteredList = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'critical') return n.severity === 'critical';
    return true;
  });

  const getIcon = (type, severity) => {
    if (type === 'EXPIRED') return <ShieldAlert className="w-4 h-4 text-rose-600" />;
    if (type === 'EXPIRING_7_DAYS') return <ClockAlert className="w-4 h-4 text-orange-600" />;
    if (type === 'EXPIRING_SOON') return <ClockAlert className="w-4 h-4 text-amber-500" />;
    if (type === 'LOW_STOCK') return <AlertTriangle className="w-4 h-4 text-purple-600" />;
    return <Bell className="w-4 h-4 text-teal-600" />;
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 ${isInline ? '' : 'max-w-lg'}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bell className="w-5 h-5 text-teal-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Expiry Notification Center
            </h3>
            <p className="text-[11px] text-slate-500">
              Live automated surveillance for batch expiry and stock limits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filter === 'unread'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filter === 'critical'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          Critical
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Checking medicine expiry statuses...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
            <p className="font-semibold text-slate-700">No active alerts</p>
            <p className="text-slate-400 text-[11px]">All medicine batches are safe and adequately stocked.</p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item._id}
              className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                !item.isRead
                  ? item.severity === 'critical'
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-amber-50/60 border-amber-200'
                  : 'bg-white border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    item.severity === 'critical'
                      ? 'bg-rose-100'
                      : item.type === 'LOW_STOCK'
                      ? 'bg-purple-100'
                      : 'bg-amber-100'
                  }`}
                >
                  {getIcon(item.type, item.severity)}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-600" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                    <span>{formatDate(item.createdAt)}</span>
                    {item.metadata?.batchNumber && (
                      <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                        Batch: {item.metadata.batchNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item._id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    if (item.type.includes('EXPIRED') || item.type.includes('EXPIRING')) {
                      navigate('/expiry-tracking');
                    } else {
                      navigate('/inventory');
                    }
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition"
                  title="View affected record"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(item._id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Dismiss notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;

