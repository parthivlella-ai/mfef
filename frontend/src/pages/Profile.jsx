import React, { useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Building,
  Phone,
  FileBadge,
  Mail,
  CheckCircle2,
  Lock,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import Badge from '../components/common/Badge';
import AlertBanner from '../components/common/AlertBanner';

const Profile = () => {
  const { user, updateProfile } = useAuth();

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    pharmacyName: user?.pharmacyName || '',
    licenseNumber: user?.licenseNumber || '',
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileErr, setProfileErr] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordErr, setPasswordErr] = useState(null);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    setSavingProfile(true);

    const res = await updateProfile(profileForm);
    setSavingProfile(false);

    if (res.success) {
      setProfileMsg('Profile information updated successfully');
    } else {
      setProfileErr(res.error || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErr(null);
    setPasswordMsg(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErr('New password and confirmation do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordErr('Password must be at least 6 characters');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.success) {
        setPasswordMsg('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordErr(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const rolePermissions = {
    admin: [
      'Full administrative authority across all modules',
      'Manage user accounts and role permissions',
      'Full access to compliance audit logs & system health',
      'System-wide inventory and batch oversight',
    ],
    user: [
      'Create and manage your own medicine inventory',
      'Monitor expiry countdowns and threshold alerts for your stock',
      'Perform stock adjustments and dispensary runs on your batches',
      'Decommission and record disposals for your expired medicines',
    ],
  };

  const activePermissions = rolePermissions[user?.role || 'user'] || rolePermissions.user;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          User Profile & Security
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials, pharmacy facility, and security access.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Card & Role Permissions */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-400 mx-auto flex items-center justify-center text-white text-2xl font-black shadow-md shadow-teal-600/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-2">
                <Badge variant={user?.role || 'pharmacist'} size="md">
                  {user?.role?.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-left text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-slate-600">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{user?.pharmacyName}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FileBadge className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate font-mono">Lic: {user?.licenseNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{user?.phone}</span>
              </div>
            </div>
          </div>

          {/* Role Entitlements */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Authorized Role Permissions
              </h4>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              {activePermissions.map((perm, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right 2 Columns: Edit Profile + Password Change */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile Form */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-teal-600" /> Edit Operational Profile
            </h3>

            {profileMsg && <AlertBanner type="success" message={profileMsg} onClose={() => setProfileMsg(null)} />}
            {profileErr && <AlertBanner type="error" message={profileErr} onClose={() => setProfileErr(null)} />}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pharmacy / Facility Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.pharmacyName}
                    onChange={(e) => setProfileForm({ ...profileForm, pharmacyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pharmacy License / Registration #
                  </label>
                  <input
                    type="text"
                    value={profileForm.licenseNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 transition shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 pb-2 border-b border-slate-100">
              <KeyRound className="w-4 h-4 text-teal-600" /> Account Security & Password
            </h3>

            {passwordMsg && <AlertBanner type="success" message={passwordMsg} onClose={() => setPasswordMsg(null)} />}
            {passwordErr && <AlertBanner type="error" message={passwordErr} onClose={() => setPasswordErr(null)} />}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password (min 6 chars)
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="New strong password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition shadow-xs disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
