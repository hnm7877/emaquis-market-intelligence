'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AiChatDrawer } from '@/components/common/AiChatDrawer';
import { ExportModal } from '@/components/common/ExportModal';
import { getAuthToken, isTokenExpired, LOGIN_PATH, clearAuthToken } from '@/lib/auth';

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const isLoginPage = pathname === LOGIN_PATH;

  // Toutes les pages (hors connexion) exigent une session valide
  useEffect(() => {
    if (isLoginPage) return;
    const token = getAuthToken();
    if (isTokenExpired(token)) {
      clearAuthToken();
      router.replace(token ? `${LOGIN_PATH}?reason=expired` : LOGIN_PATH);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture de localStorage, disponible seulement côté client
    setAuthChecked(true);
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar with mobile toggle & backdrop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenAiChat={() => setAiChatOpen(true)}
          onOpenExport={() => setExportOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <AiChatDrawer open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
