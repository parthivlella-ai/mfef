/**
 * Calculate expiry status and days remaining
 * @param {Date|string} expiryDate 
 * @returns {{ daysRemaining: number, status: 'expired'|'critical'|'warning'|'safe', label: string, color: string }}
 */
const calculateExpiryStatus = (expiryDate) => {
  if (!expiryDate) {
    return { daysRemaining: 0, status: 'unknown', label: 'Unknown', color: 'gray' };
  }

  const now = new Date();
  const exp = new Date(expiryDate);
  const diffTime = exp.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      daysRemaining,
      status: 'expired',
      label: `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`,
      color: 'red',
    };
  }

  if (daysRemaining <= 30) {
    return {
      daysRemaining,
      status: 'critical',
      label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      color: 'orange',
    };
  }

  if (daysRemaining <= 90) {
    return {
      daysRemaining,
      status: 'warning',
      label: `Expires in ${daysRemaining} days`,
      color: 'amber',
    };
  }

  return {
    daysRemaining,
    status: 'safe',
    label: `Safe (${daysRemaining} days remaining)`,
    color: 'emerald',
  };
};

/**
 * Calculate stock health status
 * @param {number} quantity 
 * @param {number} minStockLevel 
 * @returns {{ status: 'out_of_stock'|'low_stock'|'adequate'|'surplus', label: string, color: string }}
 */
const calculateStockStatus = (quantity, minStockLevel = 15) => {
  if (quantity <= 0) {
    return { status: 'out_of_stock', label: 'Out of Stock', color: 'red' };
  }
  if (quantity <= minStockLevel) {
    return { status: 'low_stock', label: `Low Stock (${quantity} left)`, color: 'amber' };
  }
  if (quantity > minStockLevel * 4) {
    return { status: 'surplus', label: 'Well Stocked', color: 'blue' };
  }
  return { status: 'adequate', label: 'In Stock', color: 'emerald' };
};

module.exports = {
  calculateExpiryStatus,
  calculateStockStatus,
};

