'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Bell, Home, Star, ArrowDownToLine, ArrowUpFromLine, User } from 'lucide-react';
import { clsx } from 'clsx';
import { NotificationPanel } from './NotificationPanel';

// ─── Bottom Navigation ───────────────────────────────────
export function BottomNav() {
  const pathname = usePathname();
  const tabs = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/earn', label: 'Earn', icon: Star },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
    { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
    { href: '/profile', label: 'Profile', icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50
                    bg-[#0d0d0d] border-t border-[#1a1a1a] flex">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href}
            className={clsx('flex-1 flex flex-col items-center py-2 pt-3 transition-colors',
              active ? 'text-[#00C853]' : 'text-[#444]')}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Header — bell opens slide-down overlay (spec §5.1) ───
export function Header({ title, back }: { title?: string; back?: string }) {
  const { unreadCount } = useAuthStore();
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-[#111]
                         flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {back && (
            <button onClick={() => router.back()}
              className="text-[#888] hover:text-white transition-colors text-lg">
              ←
            </button>
          )}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-[#00C853] font-black text-2xl tracking-wider">L</span>
            <span className="text-white font-bold text-sm tracking-widest">LIANKA</span>
          </Link>
        </div>

        {title && (
          <span className="absolute left-1/2 -translate-x-1/2
                           text-white font-semibold text-sm">
            {title}
          </span>
        )}

        {/* Bell — opens panel overlay, does NOT navigate */}
        <button
          onClick={() => setPanelOpen(prev => !prev)}
          className="relative p-1"
          aria-label="Notifications"
        >
          <Bell size={20} className={panelOpen ? 'text-[#00C853]' : 'text-[#888]'} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#7B1FA2] text-white
                             text-[9px] font-bold rounded-full min-w-[16px] h-4
                             flex items-center justify-center px-1 pointer-events-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Slide-down notification panel — 70% screen height overlay */}
      <NotificationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </>
  );
}
