'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { ref, query, orderByChild, onValue, limitToLast, equalTo } from 'firebase/database';
import { Notification, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/notifications';
import styles from './Header.module.css';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [equippedBadge, setEquippedBadge] = useState<string>('');
  const [equippedBorder, setEquippedBorder] = useState<string>('');
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const notificationsRef = ref(db, `notifications/${user.uid}`);
    const notificationsQuery = query(notificationsRef, orderByChild('createdAt'), limitToLast(20));

    const unsubscribe = onValue(notificationsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedNotifications = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...(value as Omit<Notification, 'id'>)
        }));

        // Sort by newest first
        loadedNotifications.sort((a, b) => b.createdAt - a.createdAt);

        setNotifications(loadedNotifications);
        setUnreadCount(loadedNotifications.filter(n => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch equipped badge
  useEffect(() => {
    if (!user) return;

    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.equippedBadge) {
          setEquippedBadge(data.equippedBadge);
        } else {
          setEquippedBadge('');
        }

        // Also fetch equipped border
        if (data.equippedBorder) {
          setEquippedBorder(data.equippedBorder);
        } else {
          setEquippedBorder('');
        }
      } else {
        setEquippedBadge('');
        setEquippedBorder('');
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch badge icon
  const [badgeIcon, setBadgeIcon] = useState<string>('');
  useEffect(() => {
    if (!equippedBadge) {
      setBadgeIcon('');
      return;
    }

    const tasksRef = ref(db, 'tasks');
    const tasksQuery = query(tasksRef, orderByChild('badgeId'), equalTo(equippedBadge));

    const unsubscribe = onValue(tasksQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Data is an object with push keys, we just take the first one
        const taskKey = Object.keys(data)[0];
        const task = data[taskKey];
        if (task && task.icon) {
          // If icon is a font awesome class, render it? The render below expects text or image?
          // Line 227: {badgeIcon && <span style={{ fontSize: '18px' }}>{badgeIcon}</span>}
          // If badgeIcon is 'fas fa-recycle', <span ...>fas fa-recycle</span> renders text, not icon.
          // It should be <i className={badgeIcon}></i>.
          // I'll check how it's rendered below.
          setBadgeIcon(task.icon);
        }
      } else {
        // Fallback: check static list or just empty
        setBadgeIcon('');
      }
    });

    return () => unsubscribe();
  }, [equippedBadge]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && user) {
      await markNotificationAsRead(user.uid, notification.id);
    }
    // Redirect if relatedId exists (assuming it's a donation/request ID)
    // For now we just stay or go to donations page?
    // Let's assume most notifications are about donations/requests
    if (notification.relatedId) {
      // Since we don't know if it's a request or donation, we might just go to donations page
      // Ideally we'd have a link type in notification
      router.push('/donations');
    }
    setShowNotifications(false);
  };

  const handleMarkAllRead = async () => {
    if (user && notifications.length > 0) {
      await markAllNotificationsAsRead(user.uid, notifications);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}m ago`;
      }
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    return date.toLocaleDateString();
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
        <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '24px' }}>EcoWaste</h1>
      </div>
      <div className={styles.rightSection}>
        <div className={styles.notificationContainer} ref={notificationRef}>
          <div className={styles.notificationBell} onClick={() => setShowNotifications(!showNotifications)}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </div>

          {showNotifications && (
            <div className={styles.notificationDropdown}>
              <div className={styles.notificationHeader}>
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className={styles.markAllRead} onClick={handleMarkAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div className={styles.notificationList}>
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={`${styles.notificationIcon} ${styles[notification.type]}`}>
                        <i className={`fas ${notification.type === 'success' ? 'fa-check' :
                          notification.type === 'warning' ? 'fa-exclamation' :
                            notification.type === 'error' ? 'fa-times' : 'fa-info'
                          }`}></i>
                      </div>
                      <div className={styles.notificationContent}>
                        <div className={styles.notificationTitle}>{notification.title}</div>
                        <div className={styles.notificationMessage}>{notification.message}</div>
                        <span className={styles.notificationTime}>{formatTime(notification.createdAt)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyNotifications}>
                    <i className="far fa-bell-slash"></i>
                    <p>No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles.userProfile} ref={profileRef} onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
          <div className={`${styles.profilePic} ${equippedBorder ? equippedBorder : ''}`}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3d6a06', color: 'white', fontWeight: 'bold' }}>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {badgeIcon && (
              badgeIcon.startsWith('http') || badgeIcon.startsWith('/') ?
                <img src={badgeIcon} alt="Badge" style={{ width: '20px', height: '20px' }} /> :
                <i className={badgeIcon} style={{ fontSize: '18px', marginRight: '5px', color: '#82AA52' }}></i>
            )}
            <span className={styles.profileName}>{user.displayName || 'User'}</span>
          </div>
          <i className={`fas fa-chevron-down ${styles.dropdownArrow} ${showProfileDropdown ? styles.rotate : ''}`}></i>
          {showProfileDropdown && (
            <div className={styles.profileDropdown}>
              <Link href="/profile" className={styles.dropdownItem}><i className="fas fa-user" style={{ marginRight: '10px' }}></i> My Profile</Link>
              <Link href="/settings" className={styles.dropdownItem}><i className="fas fa-cog" style={{ marginRight: '10px' }}></i> Settings</Link>
              <div className={styles.dropdownDivider}></div>
              <button onClick={handleLogout} className={styles.dropdownItem} style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
                <i className="fas fa-sign-out-alt" style={{ marginRight: '10px' }}></i> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
