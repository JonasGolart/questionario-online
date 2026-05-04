'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const token = window.localStorage.getItem('qo_admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  }, [router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (!isMounted) return null;

  const handleLogout = () => {
    window.localStorage.removeItem('qo_admin_token');
    window.localStorage.removeItem('qo_admin_user');
    router.replace('/admin/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Criar Questionário', path: '/admin/questionarios/novo' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', flexDirection: 'row' }}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        backgroundColor: 'var(--bg-sidebar)', 
        borderRight: '1px solid var(--border)', 
        padding: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: isSidebarOpen ? 0 : '-260px',
        zIndex: 50,
        transition: 'left 0.3s ease',
        // No desktop, ela fica fixa na lateral
      }} className="admin-sidebar">
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem' }}>StackFAB</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Portal do Professor</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
            className="mobile-close-btn"
          >
            ✕
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
          <button 
            onClick={handleLogout} 
            className="btn-primary" 
            style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--error)', border: '1px solid var(--error)' }}
          >
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '0' }} className="admin-main-wrapper">
        {/* Mobile Header */}
        <header style={{ 
          display: 'none', 
          padding: '1rem', 
          backgroundColor: 'var(--bg-sidebar)', 
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }} className="mobile-header">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>StackFAB</h2>
        </header>

        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }} className="admin-main-content">
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 1024px) {
          .admin-sidebar {
            position: sticky !important;
            left: 0 !important;
            display: flex !important;
          }
          .mobile-header, .mobile-close-btn {
            display: none !important;
          }
          .admin-main-wrapper {
            margin-left: 0 !important;
          }
        }
        @media (max-width: 1023px) {
          .mobile-header {
            display: flex !important;
          }
          .mobile-close-btn {
            display: block !important;
            color: var(--text-secondary);
            font-size: 1.5rem;
          }
          .admin-main-content {
            padding: 1rem !important;
          }
        }
      `}} />
    </div>
  );
}
