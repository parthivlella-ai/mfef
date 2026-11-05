import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Stethoscope, ShieldCheck, HeartPulse, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PublicLayout = () => {
  const { isAuthenticated, getDashboardRoute } = useAuth();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Medi<span className="text-teal-600">Track</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <Link to="/" className="hover:text-teal-600 transition">
              Overview
            </Link>
            <a href="/#features" className="hover:text-teal-600 transition">
              Key Features
            </a>
            <a href="/#expiry-intelligence" className="hover:text-teal-600 transition">
              Expiry Intelligence
            </a>
            <a href="/#compliance" className="hover:text-teal-600 transition">
              Regulatory Compliance
            </a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={getDashboardRoute ? getDashboardRoute() : '/dashboard'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition shadow-xs"
              >
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-teal-600 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition shadow-xs"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      {!isAuthPage && (
        <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-white">MediTrack</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Empowering hospitals, clinical pharmacies, and dispensaries with real-time medicine inventory and smart expiry management.
              </p>
            </div>

            <div>
              <p className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">
                Product
              </p>
              <ul className="space-y-2">
                <li><Link to="/inventory" className="hover:text-white transition">Medicine Inventory</Link></li>
                <li><Link to="/expiry-tracking" className="hover:text-white transition">Expiry Tracking Radar</Link></li>
                <li><Link to="/medicines/new" className="hover:text-white transition">Batch Intake</Link></li>
                <li><Link to="/admin" className="hover:text-white transition">Audit & Compliance</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">
                Compliance & Security
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> FDA CFR 21 Aligned</li>
                <li className="flex items-center gap-1.5"><HeartPulse className="w-3.5 h-3.5 text-teal-400" /> WHO Good Pharmacy Practice</li>
                <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Role-based Access Control</li>
              </ul>
            </div>

            <div>
              <p className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">
                MediTrack Architecture
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Built on modern MERN stack with React 19, Vite, Express.js, and MongoDB Mongoose.
              </p>
              <p className="text-[10px] text-slate-500">
                © {new Date().getFullYear()} MediTrack. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PublicLayout;

