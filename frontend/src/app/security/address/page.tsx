'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Header } from '@/components/ui';
import toast from 'react-hot-toast';
import { AlertTriangle, Loader2, Shield } from 'lucide-react';

export default function UpdateAddressPage() {
  const router = useRouter();
  const [network, setNetwork] = useState('TRC20');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!address.trim()) { toast.error('Enter a wallet address'); return; }
    setLoading(true);
    try {
      await api.post('/users/withdrawal-address', { network, address: address.trim() });
      toast.success('Withdrawal address updated');
      router.push('/profile');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <Header title="Withdrawal Address" back="/profile" />
      <div className="px-4 py-4">
        <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-xl p-3 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-[#F9A825] shrink-0 mt-0.5" />
            <p className="text-[#F9A825] text-xs">
              Your withdrawal address can only be changed once every 24 hours. Double-check the address before saving — wrong address = permanent loss.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[#888] text-xs font-medium mb-2 block">Network</label>
            <div className="grid grid-cols-2 gap-3">
              {['TRC20', 'BEP20'].map(n => (
                <button key={n} onClick={() => setNetwork(n)}
                  className={`card py-3 text-center font-semibold text-sm transition-all ${
                    network === n ? 'border-[#00C853] text-[#00C853]' : 'text-[#888]'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[#888] text-xs font-medium mb-1.5 block">
              USDT Wallet Address ({network})
            </label>
            <textarea value={address} onChange={e => setAddress(e.target.value)}
              placeholder={network === 'TRC20' ? 'T...' : '0x...'}
              className="input font-mono text-xs h-24 resize-none" />
          </div>

          <div className="card border-[#00C85330] bg-[#00C85508]">
            <p className="text-[#00C853] text-[11px] font-semibold mb-1">
              <Shield size={12} className="inline mr-1" />
              Important
            </p>
            <p className="text-[#888] text-[11px]">Only send USDT ({network}) to this address. Sending other tokens will result in permanent loss.</p>
          </div>

          <button onClick={handleUpdate} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
            {loading ? 'Saving...' : 'Save Withdrawal Address'}
          </button>
        </div>
      </div>
    </div>
  );
}
