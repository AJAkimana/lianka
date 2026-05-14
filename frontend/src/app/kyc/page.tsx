'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { kycAPI } from '@/lib/api';
import { Header } from '@/components/ui';
import toast from 'react-hot-toast';
import { Camera, CheckCircle, Loader2, Shield, Upload } from 'lucide-react';

export default function KYCPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [docType, setDocType] = useState('NATIONAL_ID');
  const [files, setFiles] = useState<{
    front?: File;
    back?: File;
    selfie?: File;
  }>({});
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    document_number: '',
    nationality: '',
  });
  const [loading, setLoading] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  if (!token) {
    router.replace('/login');
    return null;
  }

  const handleSubmit = async () => {
    if (!files.front || !files.selfie) {
      toast.error('Please upload required documents');
      return;
    }
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <Header title="KYC Verification" back="/profile" />

      <div className="px-4 py-4">
        <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-xl p-3 mb-4">
          <p className="text-[#F9A825] text-xs font-semibold mb-1">
            ⚠ KYC Verification Required
          </p>
          <p className="text-[#888] text-xs">
            To withdraw your profits, you need to complete KYC verification to
            comply with security and regulatory requirements.
          </p>
        </div>

        <p className="section-title">Select Document Type</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'PASSPORT', label: 'Passport' },
            { id: 'NATIONAL_ID', label: 'National ID Card' },
            { id: 'DRIVERS_LICENSE', label: "Driver's License" },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDocType(d.id)}
              className={`card text-center py-3 text-xs font-semibold transition-all ${
                docType === d.id
                  ? 'border-[#00C853] text-[#00C853]'
                  : 'text-[#888]'
              }`}
            >
              {d.id === 'PASSPORT'
                ? '🛂'
                : d.id === 'NATIONAL_ID'
                  ? '🪪'
                  : '🚗'}
              <br />
              {d.label}
            </button>
          ))}
        </div>

        <p className="section-title">Personal Information</p>
        <div className="space-y-3 mb-4">
          {[
            {
              key: 'full_name',
              label: 'Full Name (as on document)',
              type: 'text',
              placeholder: 'Enter full name',
            },
            {
              key: 'date_of_birth',
              label: 'Date of Birth',
              type: 'date',
              placeholder: '',
            },
            {
              key: 'document_number',
              label: 'Document Number',
              type: 'text',
              placeholder: 'Enter document number',
            },
            {
              key: 'nationality',
              label: 'Nationality',
              type: 'text',
              placeholder: 'Enter nationality',
            },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-[#888] text-xs mb-1.5 block">
                {f.label}
              </label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={formData[f.key as keyof typeof formData]}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                className="input"
              />
            </div>
          ))}
        </div>

        <p className="section-title">Upload Documents</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Front Side', ref: frontRef, key: 'front' },
            { label: 'Back Side', ref: backRef, key: 'back' },
          ].map((item) => (
            <div key={item.key}>
              <input
                ref={item.ref}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFiles((prev) => ({ ...prev, [item.key]: f }));
                }}
              />
              <button
                onClick={() => item.ref.current?.click()}
                className={`w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center
													 justify-center gap-2 transition-colors
													 ${files[item.key as keyof typeof files] ? 'border-[#00C853] bg-[#00C85510]' : 'border-[#333] hover:border-[#444]'}`}
              >
                {files[item.key as keyof typeof files] ? (
                  <CheckCircle size={24} className="text-[#00C853]" />
                ) : (
                  <Upload size={24} className="text-[#555]" />
                )}
                <p
                  className={`text-xs font-medium ${files[item.key as keyof typeof files] ? 'text-[#00C853]' : 'text-[#555]'}`}
                >
                  {files[item.key as keyof typeof files]
                    ? (
                        files[item.key as keyof typeof files] as File
                      ).name.slice(0, 15) + '...'
                    : item.label}
                </p>
              </button>
            </div>
          ))}
        </div>

        <input
          ref={selfieRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFiles((prev) => ({ ...prev, selfie: f }));
          }}
        />
        <button
          onClick={() => selfieRef.current?.click()}
          className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-row items-center
										 justify-center gap-3 mb-4 transition-colors
										 ${files.selfie ? 'border-[#00C853] bg-[#00C85510]' : 'border-[#333]'}`}
        >
          <Camera
            size={24}
            className={files.selfie ? 'text-[#00C853]' : 'text-[#555]'}
          />
          <div className="text-left">
            <p
              className={`text-sm font-semibold ${files.selfie ? 'text-[#00C853]' : 'text-white'}`}
            >
              {files.selfie ? 'Selfie uploaded ✓' : 'Take / Upload Selfie'}
            </p>
            <p className="text-[#555] text-xs">
              Hold your ID next to your face
            </p>
          </div>
        </button>

        <div className="bg-[#1565C010] border border-[#1565C030] rounded-xl p-3 mb-6">
          <p className="text-[#1565C0] text-xs font-semibold mb-1">
            Photo Guidelines
          </p>
          <ul className="text-[#888] text-[11px] space-y-1">
            <li>• Ensure all four corners of the document are visible</li>
            <li>• Information must be clear and readable</li>
            <li>• Supported: JPG, PNG. Max size: 5MB</li>
          </ul>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Shield size={18} />
          )}
          {loading ? 'Submitting...' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}
