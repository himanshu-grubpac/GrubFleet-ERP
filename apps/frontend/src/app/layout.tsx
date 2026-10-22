import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { AppToaster } from '@/components/ui/app-toaster';
import { ChunkLoadRecovery } from '@/components/chunk-load-recovery';
import { getPortalDocumentTitle } from '@/lib/env/portal-tier';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  preload: false,
});

export const metadata: Metadata = {
  title: getPortalDocumentTitle(),
  description: 'GrubPac modular monolith ERP platform',
};

/** Runs before React so a failed /_next/static/*.js load can reload once (post-deploy stale HTML). */
const PORTAL_CHUNK_RECOVERY_SCRIPT = `
(function(){
  var k='grubfleet-portal-chunk-reload';
  window.addEventListener('error',function(e){
    var t=e.target;
    if(!t||t.tagName!=='SCRIPT')return;
    var src=t.src||'';
    if(src.indexOf('/_next/static/')===-1)return;
    if(sessionStorage.getItem(k)==='1')return;
    sessionStorage.setItem(k,'1');
    location.reload();
  },true);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="portal-chunk-recovery"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: PORTAL_CHUNK_RECOVERY_SCRIPT }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ChunkLoadRecovery />
        <QueryProvider>
          <AuthProvider>
            {children}
            <AppToaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
