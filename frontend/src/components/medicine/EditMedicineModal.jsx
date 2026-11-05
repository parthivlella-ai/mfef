import React, { useState, useEffect } from 'react';
import { X, Edit, Save, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { medicineService } from '../../services/api';
import { formatDateForInput, getDaysUntilExpiry } from '../../utils/dateUtils';

const EditMedicineModal = ({ isOpen, medicine, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Antibiotics',
    batchNumber: '',
    quantity: 0,
    unit: 'Tablets',
    purchaseDate: '',
    expiryDate: '',
    price: '',
    description: '',
    minStockLevel: 10,
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name || '',
        brand: medicine.brand || medicine.supplier || '',
        category: medicine.category || 'Antibiotics',
        batchNumber: medicine.batchNumber || '',
        quantity: medicine.quantity !== undefined ? medicine.quantity : 0,
        unit: medicine.unit || 'Tablets',
        purchaseDate: formatDateForInput(medicine.purchaseDate) || formatDateForInput(medicine.mfgDate) || '',
        expiryDate: formatDateForInput(medicine.expiryDate) || '',
        price: medicine.price !== undefined && medicine.price !== null ? medicine.price : (medicine.unitPrice || ''),
        description: medicine.description || '',
        minStockLevel: medicine.minStockLevel || 10,
        storageCondition: medicine.storageCondition || 'Room Temperature (15-25°C)',
        rackLocation: medicine.rackLocation || '',
      });
      setError(null);
    }
  }, [medicine]);

  if (!isOpen || !medicine) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Medicine name is required.');
      return;
    }
    if (!formData.brand.trim()) {
      setError('Brand / Manufacturer name is required.');
      return;
    }
    if (!formData.batchNumber.trim()) {
      setError('Batch number is required.');
      return;
    }
    if (formData.quantity === '' || Number(formData.quantity) < 0) {
      setError('Quantity must be a valid non-negative number.');
      return;
    }
    if (!formData.expiryDate) {
      setError('Expiry date is required.');
      return;
    }

    try {
      setLoading(true);
      const updates = {
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        category: formData.category,
        batchNumber: formData.batchNumber.trim().toUpperCase(),
        quantity: Number(formData.quantity),
        unit: formData.unit,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : undefined,
        expiryDate: new Date(formData.expiryDate),
        price: formData.price !== '' && formData.price !== null ? Number(formData.price) : null,
        description: formData.description.trim(),
        minStockLevel: Number(formData.minStockLevel) || 10,
        storageCondition: formData.storageCondition,
        rackLocation: formData.rackLocation.trim(),
      };

      const res = await medicineService.update(medicine._id, updates);
      if (res.success) {
        onSuccess(res.data || updates);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to update medicine details');
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = getDaysUntilExpiry(formData.expiryDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Medicine Details"
      subtitle={`Editing record for ${medicine.name} (Batch: ${medicine.batchNumber})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Medicine Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Brand / Manufacturer *
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
            >
              <option value="Antibiotics">Antibiotics</option>
              <option value="Analgesics">Analgesics</option>
              <option value="Antipyretics">Antipyretics</option>
              <option value="Antihistamines">Antihistamines</option>
              <option value="Cardiovascular">Cardiovascular</option>
              <option value="Antidiabetic">Antidiabetic</option>
              <option value="Respiratory">Respiratory</option>
              <option value="Vitamins & Supplements">Vitamins & Supplements</option>
              <option value="Gastrointestinal">Gastrointestinal</option>
              <option value="Dermatological">Dermatological</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Batch Number *
            </label>
            <input
              type="text"
              name="batchNumber"
              value={formData.batchNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold uppercase focus:bg-white focus:border-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Unit *
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
            >
              <option value="Tablets">Tablets</option>
              <option value="Capsules">Capsules</option>
              <option value="Syrup Bottles">Syrup Bottles</option>
              <option value="Injection Vials">Injection Vials</option>
              <option value="Ointment Tubes">Ointment Tubes</option>
              <option value="Drops Bottles">Drops Bottles</option>
              <option value="Inhalers">Inhalers</option>
              <option value="Sachets">Sachets</option>
              <option value="Units">Units</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Stock Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              min="0"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Low-Stock Alert Level
            </label>
            <input
              type="number"
              name="minStockLevel"
              min="1"
              value={formData.minStockLevel}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Price ($) <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Expiry Date *
              </label>
              {daysLeft !== null && (
                <span
                  className={`text-[10px] font-bold ${
                    daysLeft <= 0
                      ? 'text-rose-600'
                      : daysLeft <= 7
                      ? 'text-orange-600'
                      : daysLeft <= 30
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                </span>
              )}
            </div>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Description / Notes (Optional)
          </label>
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            placeholder="Clinical notes, storage or administration instructions..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Storage Condition
            </label>
            <select
              name="storageCondition"
              value={formData.storageCondition}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
            >
              <option value="Room Temperature (15-25°C)">Room Temperature (15-25°C)</option>
              <option value="Refrigerated (2-8°C)">Refrigerated (2-8°C)</option>
              <option value="Frozen (-20°C)">Frozen (-20°C)</option>
              <option value="Cool & Dry Place">Cool & Dry Place</option>
              <option value="Protect from Light">Protect from Light</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Rack / Location
            </label>
            <input
              type="text"
              name="rackLocation"
              value={formData.rackLocation}
              onChange={handleChange}
              placeholder="e.g. Rack B-1"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditMedicineModal;

