/**
 * Format date string into human readable string (e.g. Oct 24, 2026)
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date for input[type="date"] (YYYY-MM-DD)
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Calculate days remaining until expiry dynamically using actual current date
 */
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffTime = exp.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get clear status indicators according to requirements:
 * - Safe
 * - Expiring Soon (<= 30 days, highlighted if <= 7 days)
 * - Expired (<= 0 days)
 * - Low Stock (quantity <= threshold)
 */
export const getMedicineStatus = (med, customThreshold = 10) => {
  if (!med) return { status: 'Safe', badge: 'Safe', color: 'emerald', label: 'Safe' };

  if (med.isDisposed || med.status === 'disposed') {
    return {
      status: 'Disposed',
      badge: 'Disposed',
      label: 'Decommissioned',
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      variant: 'neutral',
      days: 0,
      urgent: false,
    };
  }

  const days = getDaysUntilExpiry(med.expiryDate);
  const threshold = Number(med.minStockLevel || customThreshold) || 10;
  const quantity = Number(med.quantity !== undefined ? med.quantity : 0);

  // 1. Expired
  if (days !== null && days <= 0) {
    return {
      status: 'Expired',
      badge: 'Expired',
      label: days === 0 ? 'Expires today' : `Expired ${Math.abs(days)}d ago`,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      tagColor: 'text-rose-700 bg-rose-100',
      variant: 'danger',
      days,
      urgent: true,
      severity: 'expired',
    };
  }

  // 2. Expiring Soon (with 7 days alert distinction)
  if (days !== null && days <= 30) {
    const isUnder7 = days <= 7;
    return {
      status: 'Expiring Soon',
      badge: isUnder7 ? 'Expiring in ≤7d' : 'Expiring Soon',
      label: isUnder7 ? `Urgent: ${days}d left` : `Expires in ${days}d`,
      color: isUnder7
        ? 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-300'
        : 'bg-amber-50 text-amber-700 border-amber-200',
      tagColor: isUnder7 ? 'text-orange-700 bg-orange-100' : 'text-amber-700 bg-amber-100',
      variant: isUnder7 ? 'critical' : 'warning',
      days,
      urgent: true,
      isUnder7,
      severity: isUnder7 ? 'critical' : 'warning',
    };
  }

  // 3. Low Stock
  if (quantity <= threshold) {
    return {
      status: 'Low Stock',
      badge: 'Low Stock',
      label: quantity === 0 ? 'Out of stock' : `Low Stock (${quantity} left)`,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      tagColor: 'text-purple-700 bg-purple-100',
      variant: 'low_stock',
      days,
      urgent: quantity === 0,
      severity: 'low_stock',
    };
  }

  // 4. Safe
  return {
    status: 'Safe',
    badge: 'Safe',
    label: `${days} days left`,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tagColor: 'text-emerald-700 bg-emerald-100',
    variant: 'safe',
    days,
    urgent: false,
    severity: 'safe',
  };
};

/**
 * Backward compatibility alias for getExpiryMeta
 */
export const getExpiryMeta = (expiryDate, status = '', quantity, threshold) => {
  return getMedicineStatus({ expiryDate, status, quantity, minStockLevel: threshold });
};

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === '') return '$0.00';
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};
