'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import styles from './Header.module.css';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // If no user, we might want to show login button or nothing?
  // The pages protect the route, so usually user is present.
  // But just in case:
  if (!user) {
    return null; 
  }

  return (
    <header className={styles.header}>
      {/* FontAwesome for icons - ideally this should be in layout.tsx */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <div className={styles.logoContainer}>
        <div className={styles.logo}>
          <img src="/ecowaste_logo.png" alt="EcoWaste Logo" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontWeight: 900, fontSize: '24px' }}>EcoWaste</h1>
      </div>
      <div className={styles.userProfile}>
        <div className={styles.profilePic}>
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          ) : (
            user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'
          )}
        </div>
        <span className={styles.profileName}>{user.displayName || 'User'}</span>
        <i className={`fas fa-chevron-down ${styles.dropdownArrow}`}></i>
        <div className={styles.profileDropdown}>
          <Link href="/profile" className={styles.dropdownItem}><i className="fas fa-user" style={{marginRight: '10px'}}></i> My Profile</Link>
          <Link href="/settings" className={styles.dropdownItem}><i className="fas fa-cog" style={{marginRight: '10px'}}></i> Settings</Link>
          <div className={styles.dropdownDivider}></div>
          <button onClick={handleLogout} className={styles.dropdownItem} style={{width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit'}}>
              <i className="fas fa-sign-out-alt" style={{marginRight: '10px'}}></i> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
