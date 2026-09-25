'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AiChatDrawer } from '@/components/common/AiChatDrawer';
import { ExportModal } from '@/components/common/ExportModal';

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenAiChat={() => setAiChatOpen(true)}
          onOpenExport={() => setExportOpen(true)}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <AiChatDrawer open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
