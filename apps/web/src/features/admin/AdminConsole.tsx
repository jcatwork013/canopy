import { useState } from 'react';
import { Menu, X } from '@/components/icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { AdminSidebar, SECTION_META, type SectionKey } from './AdminSidebar';
import { OverviewSection } from './sections/OverviewSection';
import { KycSection } from './sections/KycSection';
import { AISection } from './sections/AISection';
import { WebsiteSection } from './sections/WebsiteSection';
import { EmailSection } from './sections/EmailSection';
import { StorageSection } from './sections/StorageSection';

/**
 * The system-admin console: a fixed left nav (shadcn-style) and a right content
 * pane of config sections. Used both for first-run setup (rendered by the gate)
 * and as the ongoing admin area at /admin. Router-free so it works in both.
 */
export function AdminConsole({ firstRun = false }: { firstRun?: boolean }) {
  const [section, setSection] = useState<SectionKey>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const logout = async () => {
    await api.auth.logout().catch(() => undefined);
    clear();
    window.location.href = '/';
  };

  const select = (key: SectionKey) => {
    setSection(key);
    setDrawerOpen(false);
  };

  const sidebar = (
    <AdminSidebar active={section} onSelect={select} email={user?.email} onLogout={logout} />
  );

  return (
    <div className="min-h-screen bg-base text-content">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border-subtle bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-surface shadow-lg">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Đóng menu"
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-content-tertiary hover:bg-subtle"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-surface/90 px-4 backdrop-blur sm:px-8">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-content-secondary hover:bg-subtle lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm text-content-tertiary">
            Quản trị <span className="mx-1">/</span>
            <span className="font-medium text-content">{SECTION_META[section].title}</span>
          </p>
        </header>

        <main className="w-full max-w-3xl px-4 py-8 sm:px-8">
          {/* Page header — left aligned */}
          <div className="mb-6 border-b border-border-subtle pb-5">
            <h2 className="text-xl font-bold tracking-tight text-content">
              {SECTION_META[section].title}
            </h2>
            <p className="mt-1 text-sm text-content-secondary">
              {SECTION_META[section].description}
            </p>
          </div>

          {section === 'overview' && <OverviewSection firstRun={firstRun} />}
          {section === 'kyc' && <KycSection />}
          {section === 'ai' && <AISection />}
          {section === 'website' && <WebsiteSection />}
          {section === 'email' && <EmailSection />}
          {section === 'storage' && <StorageSection />}
        </main>
      </div>
    </div>
  );
}
