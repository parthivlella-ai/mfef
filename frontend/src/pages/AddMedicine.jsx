import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle,
  Pill,
  Sparkles,
  ArrowLeft,
  Calendar,
  Building,
  DollarSign,
  Boxes,
  FileText,
  ThermometerSnowflake,
  CheckCircle2,
} from 'lucide-react';
import { medicineService } from '../services/api';
import { getDaysUntilExpiry } from '../utils/dateUtils';
import AlertBanner from '../components/common/AlertBanner';

const AddMedicine = () => {
  const navigate = useNavigate();

  // Helper date generators
  const today = () => new Date().toISOString().slice(0, 10);
  const futureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const pastDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  const initialForm = {
    name: '',
    category: 'Antibiotics',
    brand: '',
    batchNumber: '',
    quantity: 100,
    unit: 'Tablets',
    purchaseDate: today(),
    expiryDate: futureDate(365),
    price: 15.5,
    description: '',
    minStockLevel: 10,
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // 1-Click Quick Pre-fill Templates for seamless evaluation & testing
  const loadTemplate = (type) => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    if (type === 'antibiotic') {
      setFormData({
        name: 'Amoxicillin 500mg',
        category: 'Antibiotics',
        brand: 'GlaxoSmithKline (GSK)',
        batchNumber: `AMX-${rand}`,
        quantity: 120,
        unit: 'Capsules',
        purchaseDate: pastDate(15),
        expiryDate: futureDate(450),
        price: 18.5,
        description: 'Broad-spectrum antibiotic used to treat bacterial infections.',
        minStockLevel: 20,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Rack A-1, Shelf 3',
      });
    } else if (type === 'expiring7') {
      setFormData({
        name: 'Azithromycin 250mg',
        category: 'Antibiotics',
        brand: 'Pfizer Inc.',
        batchNumber: `AZI-${rand}`,
        quantity: 35,
        unit: 'Tablets',
        purchaseDate: pastDate(300),
        expiryDate: futureDate(5), // Expiring in 5 days!
        price: 24.0,
        description: 'Urgent expiry batch. Macrolide antibiotic for respiratory tract infections.',
        minStockLevel: 10,
        storageCondition: 'Cool & Dry Place',
        rackLocation: 'Rack B-2, Urgent Dispense',
      });
    } else if (type === 'expiring30') {
      setFormData({
        name: 'Cough Relief Syrup',
        category: 'Respiratory',
        brand: 'Johnson & Johnson',
        batchNumber: `CRS-${rand}`,
        quantity: 45,
        unit: 'Syrup Bottles',
        purchaseDate: pastDate(200),
        expiryDate: futureDate(21), // Expiring in 21 days!
        price: 9.75,
        description: 'Antitussive formulation. Monitor for expiry within 3 weeks.',
        minStockLevel: 15,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Rack C-1, Shelf 2',
      });
    } else if (type === 'lowStock') {
      setFormData({
        name: 'Metformin HCl 500mg',
        category: 'Antidiabetic',
        brand: 'Sun Pharma',
        batchNumber: `MET-${rand}`,
        quantity: 4, // Below default threshold 10!
        unit: 'Tablets',
        purchaseDate: pastDate(60),
        expiryDate: futureDate(500),
        price: 12.0,
        description: 'First-line anti-hyperglycemic for type 2 diabetes. Low inventory alert trigger.',
        minStockLevel: 15,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Rack D-4, Shelf 1',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Please provide medicine name.');
      return;
    }
    if (!formData.brand.trim()) {
      setError('Please provide the brand or manufacturer name.');
      return;
    }
    if (!formData.batchNumber.trim()) {
      setError('Please provide a batch number.');
      return;
    }
    if (formData.quantity === '' || Number(formData.quantity) < 0) {
      setError('Quantity cannot be negative.');
      return;
    }
    if (!formData.expiryDate) {
      setError('Expiry date is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        batchNumber: formData.batchNumber.trim().toUpperCase(),
        quantity: Number(formData.quantity),
        price: formData.price !== '' && formData.price !== null ? Number(formData.price) : null,
        minStockLevel: Number(formData.minStockLevel) || 10,
      };

      const res = await medicineService.create(payload);
      if (res.success) {
        setSuccess(`Medicine "${formData.name}" added successfully to your inventory!`);
        setFormData(initialForm);
      }
    } catch (err) {
      setError(err.message || 'Failed to add medicine to inventory');
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = getDaysUntilExpiry(formData.expiryDate);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            to="/inventory"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Add New Medicine
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Record new pharmaceutical batches with brand, stock count, and dynamic expiry tracking.
            </p>
          </div>
        </div>

        <Link
          to="/inventory"
          className="self-start sm:self-auto text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100/60 px-3.5 py-2 rounded-xl transition"
        >
          View Inventory Database →
        </Link>
      </div>

      {/* 1-Click Quick Pre-fill Templates */}
      <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="text-xs font-bold text-teal-900">
            Quick 1-Click Test Templates:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadTemplate('antibiotic')}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 hover:bg-teal-100/50 text-teal-800 text-xs font-semibold shadow-2xs transition"
          >
            💊 Safe Stock
          </button>
          <button
            type="button"
            onClick={() => loadTemplate('expiring7')}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 text-orange-800 text-xs font-semibold shadow-2xs transition"
          >
            ⚠️ Expiring in &le; 7 Days
          </button>
          <button
            type="button"
            onClick={() => loadTemplate('expiring30')}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 text-amber-800 text-xs font-semibold shadow-2xs transition"
          >
            ⏳ Expiring in &le; 30 Days
          </button>
          <button
            type="button"
            onClick={() => loadTemplate('lowStock')}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-50 text-purple-800 text-xs font-semibold shadow-2xs transition"
          >
            📉 Low Stock Item
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

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Section 1: Identification & Brand */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Pill className="w-4 h-4" /> 1. Medicine & Brand Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medicine Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Paracetamol 500mg, Amoxicillin"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand / Manufacturer *
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Pfizer, GSK, Sun Pharma, Cipla"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              >
                <option value="Antibiotics">Antibiotics</option>
                <option value="Analgesics">Analgesics (Pain Relievers)</option>
                <option value="Antipyretics">Antipyretics (Fever)</option>
                <option value="Antihistamines">Antihistamines (Allergy)</option>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                placeholder="e.g. BATCH-2026-X"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit / Dosage Form *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
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
        </div>

        {/* Section 2: Stock, Unit & Pricing */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Boxes className="w-4 h-4" /> 2. Quantity & Pricing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g. 100"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low-Stock Alert Threshold
              </label>
              <input
                type="number"
                name="minStockLevel"
                min="1"
                value={formData.minStockLevel}
                onChange={handleChange}
                placeholder="Default: 10"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Triggers "Low Stock" indicator when quantity &le; threshold
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price ($) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g. 15.50"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Dates & Dynamic Expiry */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4" /> 3. Purchase Date & Expiry Date
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Expiry Date *
                </label>
                <span
                  className={`text-[11px] font-bold ${
                    daysLeft <= 0
                      ? 'text-rose-600'
                      : daysLeft <= 7
                      ? 'text-orange-600'
                      : daysLeft <= 30
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {daysLeft <= 0
                    ? '⚠️ Already Expired'
                    : daysLeft <= 7
                    ? `⚠️ Urgent: Expires in ${daysLeft} days!`
                    : daysLeft <= 30
                    ? `⏳ Expiring Soon (${daysLeft} days)`
                    : `✅ Safe (${daysLeft} days left)`}
                </span>
              </div>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 4: Description & Optional Storage */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4" /> 4. Description & Storage (Optional)
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g. Prescribed dosage instructions, specific contraindications, packaging details..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Storage Condition
              </label>
              <select
                name="storageCondition"
                value={formData.storageCondition}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              >
                <option value="Room Temperature (15-25°C)">Room Temperature (15-25°C)</option>
                <option value="Refrigerated (2-8°C)">Refrigerated (2-8°C)</option>
                <option value="Frozen (-20°C)">Frozen (-20°C)</option>
                <option value="Cool & Dry Place">Cool & Dry Place</option>
                <option value="Protect from Light">Protect from Light</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rack / Shelf Location
              </label>
              <input
                type="text"
                name="rackLocation"
                value={formData.rackLocation}
                onChange={handleChange}
                placeholder="e.g. Cabinet A, Shelf 3"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <Link
            to="/inventory"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition shadow-xs disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            {loading ? 'Saving to Database...' : 'Add Medicine'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMedicine;
