// ─── security/password/page.tsx ──────────────────────────
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { Header } from '@/components/ui';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [show, setShow] = useState({ current: false, new: false });
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (form.new_password.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (form.new_password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ current_password: form.current_password, new_password: form.new_password });
      toast.success('Password changed successfully');
      router.push('/profile');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <Header title="Change Password" back="/profile" />
      <div className="px-4 py-4 space-y-4">
        {[
          { key: 'current_password', label: 'Current Password', showKey: 'current' },
          { key: 'new_password', label: 'New Password', showKey: 'new' },
          { key: 'confirm', label: 'Confirm New Password', showKey: 'new' },
        ].map(field => (
          <div key={field.key}>
            <label className="text-[#888] text-xs font-medium mb-1.5 block">{field.label}</label>
            <div className="relative">
              <input
                type={show[field.showKey as keyof typeof show] ? 'text' : 'password'}
                placeholder={field.label}
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                className="input pr-10"
              />
              <button type="button"
                onClick={() => setShow(p => ({ ...p, [field.showKey]: !p[field.showKey as keyof typeof p] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]">
                {show[field.showKey as keyof typeof show] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}
        <button onClick={handleChange} disabled={loading} className="btn-primary mt-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}
