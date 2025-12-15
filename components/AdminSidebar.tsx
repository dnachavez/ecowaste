'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') return true;
    if (path !== '/admin' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={styles.sidebar}>
      <nav>
        <ul>
          <li>
            <Link href="/admin" className={isActive('/admin') && pathname === '/admin' ? styles.active : ''}>
              <i className="fas fa-tachometer-alt"></i> Dashboard
            </Link>
          </li>
          <li>
            <Link href="/admin/users" className={isActive('/admin/users') ? styles.active : ''}>
              <i className="fas fa-users"></i> Users
            </Link>
          </li>
          <li>
            <Link href="/admin/donations" className={isActive('/admin/donations') ? styles.active : ''}>
              <i className="fas fa-hand-holding-heart"></i> Donations
            </Link>
          </li>
          <li>
            <Link href="/admin/requests" className={isActive('/admin/requests') ? styles.active : ''}>
              <i className="fas fa-envelope-open-text"></i> Requests
            </Link>
          </li>
          <li>
            <Link href="/admin/projects" className={isActive('/admin/projects') ? styles.active : ''}>
              <i className="fas fa-project-diagram"></i> Projects
            </Link>
          </li>
          <li>
            <Link href="/admin/feedback" className={isActive('/admin/feedback') ? styles.active : ''}>
              <i className="fas fa-comment-dots"></i> Feedback
            </Link>
          </li>
          <li>
            <Link href="/admin/tasks" className={isActive('/admin/tasks') && !isActive('/admin/tasks/create') ? styles.active : ''}>
              <i className="fas fa-tasks"></i> Manage Tasks
            </Link>
          </li>
          <li>
            <Link href="/admin/tasks/create" className={isActive('/admin/tasks/create') ? styles.active : ''}>
              <i className="fas fa-plus-circle"></i> Create Task
            </Link>
          </li>
          <li>
            <div style={{ borderTop: '1px solid #ddd', margin: '10px 0' }}></div>
          </li>
          <li>
            <Link href="/homepage">
              <i className="fas fa-home"></i> Back to App
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
