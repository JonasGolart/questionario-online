'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const token = window.localStorage.getItem('qo_admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  }, [router]);

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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem' }}>StackFAB</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Portal do Professor</p>
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

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
