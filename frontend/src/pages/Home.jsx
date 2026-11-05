import React from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  ShieldCheck,
  ClockAlert,
  BarChart3,
  CheckCircle2,
  PackagePlus,
  ArrowRight,
  Database,
  Lock,
  Boxes,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated, user, getDashboardRoute } = useAuth();

  const features = [
    {
      icon: ClockAlert,
      title: 'Predictive Expiry Radar',
      description:
        'Categorizes medicine batches into Expired, Critical (<30 days), Warning (<90 days), and Safe zones with automated disposal protocols.',
      color: 'bg-rose-50 text-rose-600 border-rose-200',
    },
    {
      icon: Boxes,
      title: 'Smart Stock Thresholds',
      description:
        'Continuous monitoring of safety stock levels. Instant warnings before life-saving medicines drop below critical reorder limits.',
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      icon: ShieldCheck,
      title: 'Full Audit Trail & Decommissioning',
      description:
        'Compliant biomedical waste logging, disposal tracking with witness records, and non-repudiation audit trails for regulatory compliance.',
      color: 'bg-teal-50 text-teal-600 border-teal-200',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Inventory Valuation',
      description:
        'Live financial tracking of pharmacy stock value, batch margins, and category-by-category allocation reports.',
      color: 'bg-sky-50 text-sky-600 border-sky-200',
    },
    {
      icon: Lock,
      title: 'Role-Based Access Control',
      description:
        'Dedicated permission tiers for Administrators, Registered Pharmacists, and Dispensary Staff with secure JWT tokens.',
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      icon: PackagePlus,
      title: 'Batch & Storage Intelligence',
      description:
        'Granular tracking of cold vaults (2-8°C), room temperature, light-sensitive drugs, and precise shelf/rack indexing.',
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>MERN Stack Production Ready • MongoDB Connected</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Medi<span className="text-teal-600">Track</span> – Smart Medicine Inventory & Expiry Management
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Eliminate expired stock, prevent medication shortages, and streamline dispensary operations with automated batch-level intelligence.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {isAuthenticated ? (
              <Link
                to={getDashboardRoute()}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition shadow-lg shadow-teal-600/25"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition shadow-lg shadow-teal-600/25"
                >
                  Create User Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 active:scale-98 transition shadow-xs"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Secure Role Access Notice */}
          <div className="pt-6 border-t border-slate-200/80 max-w-xl mx-auto text-xs text-slate-500">
            <p className="font-semibold text-slate-700 mb-1">Role-Based Access Control</p>
            <p className="leading-relaxed">
              Users sign up with dedicated access to their own medicine batches. Administrator accounts are securely provisioned via environment variables and backend seed scripts.
            </p>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
          <div className="text-center p-3">
            <h3 className="text-3xl font-extrabold text-teal-400">99.8%</h3>
            <p className="text-xs text-slate-400 mt-1">Expiry Loss Reduction</p>
          </div>
          <div className="text-center p-3 border-l border-slate-800">
            <h3 className="text-3xl font-extrabold text-emerald-400">&lt; 30s</h3>
            <p className="text-xs text-slate-400 mt-1">Dispensary Lookup Time</p>
          </div>
          <div className="text-center p-3 border-l border-slate-800">
            <h3 className="text-3xl font-extrabold text-sky-400">100%</h3>
            <p className="text-xs text-slate-400 mt-1">Audit Compliance Ready</p>
          </div>
          <div className="text-center p-3 border-l border-slate-800">
            <h3 className="text-3xl font-extrabold text-purple-400">Zero</h3>
            <p className="text-xs text-slate-400 mt-1">Critical Stockouts</p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
            Enterprise Architecture
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Critical Healthcare Pharmacy Workflows
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Every feature is calibrated to eliminate medication errors, reduce waste, and safeguard patient health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition duration-200 space-y-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center ${feat.color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Expiry Radar Spotlight */}
      <section id="expiry-intelligence" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white grid grid-cols-1 lg:grid-cols-2 gap-8 items-center shadow-2xl">
          <div className="space-y-5">
            <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold">
              Automated Safety Matrix
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Proactive Expiry Radar with 30 & 90-Day Early Warning
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              MediTrack continuously audits the timestamp of every batch in storage.
              Medicines nearing 30 days are automatically surfaced on the topbar alert bell,
              highlighted in the dispensary dashboard, and prioritized for rotation.
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Automated color-coded urgency bands (Safe, Warning, Critical, Expired)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>One-click batch quarantine and certified disposal workflow</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Disposal audit log with personnel witness and reason tracking</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                to="/expiry-tracking"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 transition"
              >
                Inspect Expiry Tracking System
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Live Preview Panel Mockup */}
          <div className="bg-slate-950/70 rounded-2xl border border-slate-700 p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-teal-400 font-bold">LIVE RADAR AUDIT</span>
              <span className="text-[10px] text-slate-400">ACTIVE DAEMON</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div>
                <p className="font-bold text-rose-300">Ibuprofen 400mg</p>
                <p className="text-[10px] text-slate-400">Batch: IBU-2024-910 • 45 Tablets</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                EXPIRED 14d AGO
              </span>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
              <div>
                <p className="font-bold text-orange-300">Amoxicillin 500mg</p>
                <p className="text-[10px] text-slate-400">Batch: AMX-2025-089 • 65 Capsules</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                CRITICAL (18d Left)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-300">Paracetamol 650mg</p>
                <p className="text-[10px] text-slate-400">Batch: PCM-2026-102 • 480 Tablets</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                SAFE (&gt;1 Year)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="text-center p-10 bg-teal-50 border border-teal-200 rounded-3xl space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ready to modernize your pharmacy inventory?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Experience smart medicine inventory control, live expiry countdowns, and automated restock warnings now.
          </p>
          <div className="pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 transition shadow-md shadow-teal-600/20"
            >
              Get Started with MediTrack
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

