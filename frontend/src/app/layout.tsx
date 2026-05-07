import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lianka — Intelligent Capital',
  description: 'Sustainable investment growth platform',
  manifest: '/manifest.json',
  themeColor: '#0a0a0a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#161616',
              color: '#fff',
              border: '1px solid #222',
              fontSize: '13px',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#00C853', secondary: '#000' } },
            error: { iconTheme: { primary: '#C1121F', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
