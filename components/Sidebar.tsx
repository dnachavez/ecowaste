'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/homepage' && pathname === '/homepage') return true;
    if (path !== '/homepage' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={styles.sidebar}>
      <nav>
        <ul>
          <li>
            <Link href="/homepage" className={isActive('/homepage') ? styles.active : ''}>
              <i className="fas fa-home"></i>Home
            </Link>
          </li>
          <li>
            <Link href="/browse" className={isActive('/browse') ? styles.active : ''}>
              <i className="fas fa-search"></i>Browse
            </Link>
          </li>
          <li>
            <Link href="/achievements" className={isActive('/achievements') ? styles.active : ''}>
              <i className="fas fa-star"></i>Achievements
            </Link>
          </li>
          <li>
            <Link href="/leaderboard" className={isActive('/leaderboard') ? styles.active : ''}>
              <i className="fas fa-trophy"></i>Leaderboard
            </Link>
          </li>
          <li>
            <Link href="/projects" className={isActive('/projects') ? styles.active : ''}>
              <i className="fas fa-recycle"></i>Projects
            </Link>
          </li>
          <li>
            <Link href="/donations" className={isActive('/donations') ? styles.active : ''}>
              <i className="fas fa-hand-holding-heart"></i>Donations
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
