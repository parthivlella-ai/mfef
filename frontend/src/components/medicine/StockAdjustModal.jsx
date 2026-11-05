import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Plus, Minus, AlertCircle } from 'lucide-react';

const StockAdjustModal = ({ isOpen, onClose, medicine, onConfirm }) => {
  const [changeType, setChangeType] = useState('add'); // 'add' or 'deduct'
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('Restock shipment received');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!medicine) return null;

  const currentQty = medicine.quantity || 0;
  const numAmount = Math.max(1, Number(amount) || 1);
  const finalQuantity =
    changeType === 'add'
      ? currentQty + numAmount
      : Math.max(0, currentQty - numAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const delta = changeType === 'add' ? numAmount : -numAmount;
      await onConfirm(medicine._id, delta, reason);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Stock Quantity"
      subtitle={`${medicine.name} (Batch: ${medicine.batchNumber})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Change Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setChangeType('add');
              setReason('Restock shipment received');
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
              changeType === 'add'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            Add Stock (Inward)
          </button>
          <button
            type="button"
            onClick={() => {
              setChangeType('deduct');
              setReason('Dispensed on prescription');
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
              changeType === 'deduct'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Minus className="w-4 h-4 text-rose-600" />
            Deduct Stock (Dispense)
          </button>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Quantity to {changeType === 'add' ? 'Add' : 'Deduct'} ({medicine.unit})
          </label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
            required
          />
        </div>

        {/* Reason Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason / Purpose
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
          >
            {changeType === 'add' ? (
              <>
                <option value="Restock shipment received">Restock shipment received</option>
                <option value="Returned from patient / ward">Returned from patient / ward</option>
                <option value="Stock count audit surplus">Stock count audit surplus</option>
                <option value="Other inward reason">Other inward adjustment</option>
              </>
            ) : (
              <>
                <option value="Dispensed on prescription">Dispensed on prescription</option>
                <option value="Transferred to emergency room">Transferred to emergency room</option>
                <option value="Damaged in shelf handling">Damaged in shelf handling</option>
                <option value="Audit discrepancy reconciliation">Audit discrepancy reconciliation</option>
                <option value="Sample testing">Quality control sample testing</option>
              </>
            )}
          </select>
        </div>

        {/* Preview Calculation Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block">Current Stock:</span>
            <span className="font-bold text-slate-800">
              {currentQty} {medicine.unit}
            </span>
          </div>
          <div className="text-slate-400 font-bold">→</div>
          <div className="text-right">
            <span className="text-slate-500 block">Resulting Balance:</span>
            <span
              className={`font-bold ${
                finalQuantity <= medicine.minStockLevel
                  ? 'text-amber-600'
                  : 'text-emerald-700'
              }`}
            >
              {finalQuantity} {medicine.unit}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Applying...' : 'Apply Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StockAdjustModal;

