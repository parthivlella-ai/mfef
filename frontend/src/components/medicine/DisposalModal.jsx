import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Trash2, AlertTriangle } from 'lucide-react';

const DisposalModal = ({ isOpen, onClose, medicine, onConfirm }) => {
  const [reason, setReason] = useState('Expired Stock');
  const [notes, setNotes] = useState('Transferred to certified biomedical waste incineration vault.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!medicine) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await onConfirm(medicine._id, { reason, notes });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to dispose batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Decommission & Dispose Medicine Batch"
      subtitle={`Action logged under regulatory audit standards`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900">Irreversible Action</p>
            <p className="mt-0.5 leading-relaxed text-rose-700">
              You are disposing <strong>{medicine.quantity} {medicine.unit}</strong> of{' '}
              <strong>{medicine.name}</strong> (Batch: {medicine.batchNumber}).
              Remaining stock will be zeroed and archived under disposed inventory records.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Disposal
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
          >
            <option value="Expired Stock">Expired Stock (Past Expiry Date)</option>
            <option value="Damaged Packaging">Damaged or Broken Container / Seal</option>
            <option value="Recall by Manufacturer">Recall by Manufacturer or Regulatory Authority</option>
            <option value="Storage Contamination">Cold-Chain Temperature Breach / Contamination</option>
            <option value="Other">Other Regulatory Decommissioning</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Compliance Disposal Protocol & Protocol Notes
          </label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Hazardous biohazard bin #4, witnessed by supervising pharmacist..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
            required
          />
        </div>

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
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 transition shadow-xs disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {submitting ? 'Decommissioning...' : 'Confirm Disposal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DisposalModal;

