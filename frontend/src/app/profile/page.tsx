'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authAPI, kycAPI, userAPI } from '@/lib/api';
import { Header, BottomNav, fmt, StatusBadge, ConfirmModal, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import {
  Shield, Lock, Bell, Globe, HelpCircle, LogOut,
  ChevronRight, CheckCircle, Camera, Upload, Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const { token, user, logout } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, inapp: true });

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    userAPI.getMe().then(r => { setData(r.data); setLoading(false); });
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;

  return (
    <div className="screen">
      <Header title="Profile" />

      {/* Account Info */}
      <div className="mx-4 mt-4 card">
        <div className="flex items-center gap-4 mb-4">
          {/* Real avatar placeholder with camera icon */}
          <div className="relative shrink-0">
            <img src="/images/avatar-placeholder.png" alt="Profile"
              className="w-16 h-16 object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-bold">{data?.full_name || 'User'}</p>
              <StatusBadge status={data?.account_state} />
            </div>
            <p className="text-[#555] text-xs">{data?.email}</p>
            <p className="text-[#444] text-[11px] font-mono mt-0.5">ID: LIK{data?.id?.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-[#555] text-[10px] mb-1">Current Rank</p>
            <p className="text-[#F9A825] font-bold text-sm">{data?.rank}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-[#555] mb-0.5">Account State</p>
            <StatusBadge status={data?.account_state} />
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-[#555] mb-0.5">Member Since</p>
            <p className="text-white text-[11px]">{fmt.date(data?.created_at)}</p>
          </div>
        </div>
      </div>

      {/* KYC Section */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#00C85515] flex items-center justify-center">
            <Shield size={20} className="text-[#00C853]" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">KYC Verification</p>
            <p className="text-[#666] text-xs">Your identity is {data?.kyc_status === 'VERIFIED' ? 'verified' : 'required for withdrawal'}</p>
          </div>
          <StatusBadge status={data?.kyc_status} />
        </div>
        {data?.kyc_status === 'VERIFIED' ? (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#0f0f0f] rounded-lg p-2">
              <CheckCircle size={14} className="text-[#00C853] mx-auto mb-1" />
              <p className="text-[#555] text-[10px]">Verified On</p>
            </div>
            <div className="bg-[#0f0f0f] rounded-lg p-2">
              <CheckCircle size={14} className="text-[#00C853] mx-auto mb-1" />
              <p className="text-[#555] text-[10px]">3 Submitted</p>
            </div>
            <div className="bg-[#0f0f0f] rounded-lg p-2">
              <CheckCircle size={14} className="text-[#00C853] mx-auto mb-1" />
              <p className="text-[#555] text-[10px]">Next Review</p>
            </div>
          </div>
        ) : (
          <button onClick={() => router.push('/kyc')} className="btn-primary py-3 text-sm">
            Complete KYC Verification
          </button>
        )}
      </div>

      {/* Security */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={16} className="text-[#7B1FA2]" />
          <p className="text-white font-semibold text-sm">Security</p>
        </div>
        {[
          {
            label: 'Two-Factor Authentication (2FA)',
            sub: 'Adds an extra layer of security',
            badge: data?.two_fa_enabled ? 'ENABLED' : 'DISABLED',
            href: '/security/2fa',
          },
          {
            label: 'Change Password',
            sub: 'Update your account password regularly',
            badge: null,
            href: '/security/password',
          },
        ].map((item, i) => (
          <button key={i} onClick={() => router.push(item.href)}
            className="w-full flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-0">
            <div>
              <p className="text-white text-sm font-medium text-left">{item.label}</p>
              <p className="text-[#555] text-xs text-left">{item.sub}</p>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && <StatusBadge status={item.badge} />}
              <ChevronRight size={16} className="text-[#444]" />
            </div>
          </button>
        ))}
      </div>

      {/* Withdrawal Address */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-[#00C85520] flex items-center justify-center">
            <span className="text-[#00C853] text-xs font-bold">T</span>
          </div>
          <p className="text-white font-semibold text-sm">Withdrawal Address</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-semibold">USDT (TRC20)</p>
            <p className="text-[#555] font-mono text-[11px]">
              {data?.withdrawal_address
                ? `${data.withdrawal_address.slice(0, 8)}...${data.withdrawal_address.slice(-6)}`
                : 'Not set'}
            </p>
            <p className="text-[#444] text-[10px] mt-1">
              Address update cooldown: 24h
            </p>
          </div>
          <button onClick={() => router.push('/security/address')}
            className="text-[#1565C0] text-xs font-semibold border border-[#1565C030]
                       px-3 py-1.5 rounded-lg hover:bg-[#1565C010]">
            Update Address
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-[#F9A825]" />
          <p className="text-white font-semibold text-sm">Notification Settings</p>
        </div>
        {[
          { label: 'Email Notifications', sub: 'Receive important updates and alerts via email', key: 'email' },
          { label: 'In-App Notifications', sub: 'Receive notifications within the app', key: 'inapp' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-0">
            <div>
              <p className="text-white text-sm">{item.label}</p>
              <p className="text-[#555] text-xs">{item.sub}</p>
            </div>
            <button
              onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                notifications[item.key as keyof typeof notifications] ? 'bg-[#00C853]' : 'bg-[#333]'
              }`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                notifications[item.key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* Preferences & Support */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-[#1565C0]" />
          <p className="text-white font-semibold text-sm">Preferences & Support</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '💵', label: 'Currency', sub: 'USD' },
            { icon: '🌐', label: 'Language', sub: 'English' },
            { icon: '❓', label: 'Help Center', sub: 'Get support', href: '/help' },
            { icon: '💬', label: 'Contact', sub: '24/7 Help', href: '/support' },
          ].map((item, i) => (
            <button key={i}
              className="bg-[#0f0f0f] rounded-xl p-2.5 text-center hover:bg-[#151515] transition-colors">
              <div className="text-lg mb-1">{item.icon}</div>
              <p className="text-white text-[10px] font-semibold">{item.label}</p>
              <p className="text-[#555] text-[9px]">{item.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="mx-4 mt-3 mb-8">
        <button onClick={() => setShowLogoutConfirm(true)}
          className="btn-danger py-3.5">
          <LogOut size={18} /> Logout
        </button>
      </div>

      {showLogoutConfirm && (
        <ConfirmModal
          title="Log Out"
          message="Are you sure you want to log out of your Lianka account?"
          confirmLabel="Logout"
          confirmClass="bg-[#C1121F] text-white"
          onConfirm={logout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// KYC SCREEN
// ═══════════════════════════════════════════════════════════
export function KYCPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [docType, setDocType] = useState('NATIONAL_ID');
  const [files, setFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});
  const [formData, setFormData] = useState({ full_name: '', date_of_birth: '', document_number: '', nationality: '' });
  const [loading, setLoading] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!files.front || !files.selfie) { toast.error('Please upload required documents'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('document_type', docType);
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      if (files.front) fd.append('files', files.front);
      if (files.back) fd.append('files', files.back);
      if (files.selfie) fd.append('files', files.selfie);
      await kycAPI.submit(fd);
      toast.success('KYC submitted! Verification takes up to 24 hours.');
      router.push('/profile');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <Header title="KYC Verification" back="/profile" />

      <div className="px-4 py-4">
        <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-xl p-3 mb-4">
          <p className="text-[#F9A825] text-xs font-semibold mb-1">⚠ KYC Verification Required</p>
          <p className="text-[#888] text-xs">To withdraw your profits, you need to complete KYC verification to comply with security and regulatory requirements.</p>
        </div>

        {/* Document Type */}
        <p className="section-title">Select Document Type</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'PASSPORT', label: 'Passport' },
            { id: 'NATIONAL_ID', label: 'National ID Card' },
            { id: 'DRIVERS_LICENSE', label: "Driver's License" },
          ].map(d => (
            <button key={d.id} onClick={() => setDocType(d.id)}
              className={`card text-center py-3 text-xs font-semibold transition-all ${
                docType === d.id ? 'border-[#00C853] text-[#00C853]' : 'text-[#888]'
              }`}>
              {d.id === 'PASSPORT' ? '🛂' : d.id === 'NATIONAL_ID' ? '🪪' : '🚗'}
              <br />{d.label}
            </button>
          ))}
        </div>

        {/* Personal Info */}
        <p className="section-title">Personal Information</p>
        <div className="space-y-3 mb-4">
          {[
            { key: 'full_name', label: 'Full Name (as on document)', type: 'text', placeholder: 'Enter full name' },
            { key: 'date_of_birth', label: 'Date of Birth', type: 'date', placeholder: '' },
            { key: 'document_number', label: 'Document Number', type: 'text', placeholder: 'Enter document number' },
            { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'Enter nationality' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[#888] text-xs mb-1.5 block">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder}
                value={formData[f.key as keyof typeof formData]}
                onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="input" />
            </div>
          ))}
        </div>

        {/* Document Upload */}
        <p className="section-title">Upload Documents</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Front Side', ref: frontRef, key: 'front', required: true },
            { label: 'Back Side', ref: backRef, key: 'back', required: docType === 'NATIONAL_ID' },
          ].map(item => (
            <div key={item.key}>
              <input ref={item.ref} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setFiles(prev => ({ ...prev, [item.key]: f }));
                }} />
              <button onClick={() => item.ref.current?.click()}
                className={`w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center
                           justify-center gap-2 transition-colors
                           ${files[item.key as keyof typeof files] ? 'border-[#00C853] bg-[#00C85510]' : 'border-[#333] hover:border-[#444]'}`}>
                {files[item.key as keyof typeof files] ? (
                  <CheckCircle size={24} className="text-[#00C853]" />
                ) : (
                  <Upload size={24} className="text-[#555]" />
                )}
                <p className={`text-xs font-medium ${files[item.key as keyof typeof files] ? 'text-[#00C853]' : 'text-[#555]'}`}>
                  {files[item.key as keyof typeof files]
                    ? (files[item.key as keyof typeof files] as File).name.slice(0, 15) + '...'
                    : item.label}
                </p>
              </button>
            </div>
          ))}
        </div>

        {/* Selfie */}
        <input ref={selfieRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) setFiles(prev => ({ ...prev, selfie: f })); }} />
        <button onClick={() => selfieRef.current?.click()}
          className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-row items-center
                     justify-center gap-3 mb-4 transition-colors
                     ${files.selfie ? 'border-[#00C853] bg-[#00C85510]' : 'border-[#333]'}`}>
          <Camera size={24} className={files.selfie ? 'text-[#00C853]' : 'text-[#555]'} />
          <div className="text-left">
            <p className={`text-sm font-semibold ${files.selfie ? 'text-[#00C853]' : 'text-white'}`}>
              {files.selfie ? 'Selfie uploaded ✓' : 'Take / Upload Selfie'}
            </p>
            <p className="text-[#555] text-xs">Hold your ID next to your face</p>
          </div>
        </button>

        <div className="bg-[#1565C010] border border-[#1565C030] rounded-xl p-3 mb-6">
          <p className="text-[#1565C0] text-xs font-semibold mb-1">Photo Guidelines</p>
          <ul className="text-[#888] text-[11px] space-y-1">
            <li>• Ensure all four corners of the document are visible</li>
            <li>• Information must be clear and readable</li>
            <li>• Supported: JPG, PNG. Max size: 5MB</li>
          </ul>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
          {loading ? 'Submitting...' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}
