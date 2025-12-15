'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import styles from '../profile.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue, update, query, equalTo, limitToLast, get, orderByChild } from 'firebase/database';

interface FirebaseUser {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  city?: string;
  badges?: string[];
  role?: string;
  xp?: number;
  level?: number;
  equippedBadge?: string;
  recyclingCount?: number;
  donationCount?: number;
  projectsCompleted?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  rewardType?: 'xp' | 'badge';
  badgeId?: string;
  icon?: string;
  target?: number;
  type?: string;
}

export default function OtherUserProfilePage() {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const userId = params.id as string;

  const [userData, setUserData] = useState<FirebaseUser | null>(null);
  const [badgesList, setBadgesList] = useState<Task[]>([]);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Feedback modal state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [textError, setTextError] = useState(false);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (rating === 0) { setRatingError(true); valid = false; } else { setRatingError(false); }
    if (feedbackText.trim() === '') { setTextError(true); valid = false; } else { setTextError(false); }
    if (!valid) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setSubmitSuccess(false);
        setRating(0);
        setFeedbackText('');
      }, 3000);
    }, 1500);
  };

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const userRef = ref(db, `users/${userId}`);
    const tasksRef = ref(db, 'tasks');

    // Recent Activity – donations
    const donationsRef = ref(db, 'donations');
    const donationsQuery = query(donationsRef, orderByChild('userId'), equalTo(userId), limitToLast(10));
    get(donationsQuery).then(snap => {
      if (snap.exists()) {
        const acts = Object.values(snap.val()).map((d: any) => ({
          type: 'donation',
          title: d.donationTitle || d.title || d.description,
          date: d.createdAt,
          details: `Donated ${d.quantity} ${d.unit} of ${d.category}`
        }));
        setRecentActivity(acts.reverse());
      }
    });

    const unsubscribeUser = onValue(userRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const badges = (data.badges || []).map((b: string) => b.trim());
        setUserData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          fullName: data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : 'Eco User'),
          email: data.email || '',
          city: data.city || 'Unknown Location',
          avatar: data.avatar,
          badges,
          role: data.role || 'user',
          xp: data.xp || 0,
          level: data.level || 1,
          equippedBadge: data.equippedBadge,
          recyclingCount: data.recyclingCount || 0,
          donationCount: data.donationCount || 0,
          projectsCompleted: data.projectsCompleted || 0,
        } as FirebaseUser);
      } else {
        setUserData(null);
      }
    });

    const unsubscribeTasks = onValue(tasksRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const loadedTasks: Task[] = Object.entries(data).map(([key, value]: [string, any]) => ({ id: key, ...(value as any) })).filter(t => t.rewardType === 'badge');
        setBadgesList(loadedTasks);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTasks();
    };
  }, [userId]);

  const handleEquipBadge = async (badgeId: string) => {
    if (!currentUser || currentUser.uid !== userId) return;
    try {
      await update(ref(db, `users/${userId}`), { equippedBadge: badgeId });
    } catch (e) {
      console.error('Error equipping badge:', e);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div>Loading profile...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!userData) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          <Header />
          <div className={styles.container}>
            <Sidebar />
            <main className={styles.mainContent}>
              <div className={styles.backNavigation}>
                <Link href="/homepage" className={styles.backButton}>
                  <i className="fas fa-arrow-left"></i> Back
                </Link>
              </div>
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <h2>User not found</h2>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Badge calculations (case‑insensitive)
  const userBadges = userData.badges || [];
  const unlockedBadges = badgesList.filter(b => b.badgeId && userBadges.some(ub => ub.toLowerCase() === b.badgeId!.toLowerCase()));
  const lockedBadges = badgesList.filter(b => b.badgeId && !userBadges.some(ub => ub.toLowerCase() === b.badgeId!.toLowerCase()));
  const hasSierraMadre = userBadges.some(b => b.toLowerCase() === 'sierra_madre');

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Header />
        <div className={styles.container}>
          <Sidebar />
          <main className={styles.mainContent}>
            <div className={styles.backNavigation}>
              <Link href="/homepage" className={styles.backButton}>
                <i className="fas fa-arrow-left"></i> Back
              </Link>
              <h2 className={styles.pageTitle}>Profile</h2>
            </div>
            <div className={styles.profileHeader}>
              <div className={styles.profileAvatar}>
                {userData.avatar && (userData.avatar.startsWith('http') || userData.avatar.startsWith('/')) ? (
                  <img src={userData.avatar} alt={userData.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userData.fullName ? userData.fullName.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <div className={styles.profileInfo}>
                <h2>{userData.fullName}</h2>
                <p><i className="fas fa-map-marker-alt"></i> {userData.city}</p>
                <span className={styles.profileLevel}>Level {userData.level || 1} Eco Warrior</span>
              </div>
            </div>
            <div className={styles.profileStats}>
              <div className={styles.statCard}>
                <i className="fas fa-recycle"></i>
                <h3>{userData.recyclingCount ?? '?'}</h3>
                <p>Items Recycled</p>
              </div>
              <div className={styles.statCard}>
                <i className="fas fa-hand-holding-heart"></i>
                <h3>{userData.donationCount ?? '?'}</h3>
                <p>Items Donated</p>
              </div>
              <div className={styles.statCard}>
                <i className="fas fa-tasks"></i>
                <h3>{userData.projectsCompleted ?? '?'}</h3>
                <p>Projects Completed</p>
              </div>
              <div className={styles.statCard}>
                <i className="fas fa-star"></i>
                <h3>{userData.xp || 0}</h3>
                <p>Eco Points</p>
              </div>
            </div>
            {/* Eco Badges Section */}
            <div className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <h3>Eco Badges</h3>
                <span className={styles.viewAll} onClick={() => setShowAllBadges(!showAllBadges)}>
                  {showAllBadges ? 'Hide' : 'View All'}
                </span>
              </div>
              <div className={styles.badgesGrid}>
                {unlockedBadges.slice(0, showAllBadges ? unlockedBadges.length : 5).map(badge => (
                  <BadgeItem
                    key={badge.id}
                    icon={badge.icon || 'medal'}
                    title={badge.title}
                    desc={badge.description}
                    isLocked={false}
                    badgeId={badge.badgeId}
                    isEquipped={(userData as any)?.equippedBadge === badge.badgeId}
                    onEquip={handleEquipBadge}
                    canEquip={currentUser?.uid === userId}
                  />
                ))}
                {hasSierraMadre && (showAllBadges || unlockedBadges.length < 5) && (
                  <div className={styles.badgeItem}>
                    <div className={styles.badgeIcon}>
                      <img src="/sierra_madre_badge.svg" alt="Sierra Madre" style={{ width: '30px', filter: 'none' }} />
                    </div>
                    <h4>Sierra Madre</h4>
                    <p>Legendary Badge</p>
                    <small>Completed All Tasks</small>
                  </div>
                )}
                {showAllBadges && lockedBadges.map(badge => (
                  <BadgeItem
                    key={badge.id}
                    icon={badge.icon || 'lock'}
                    title={badge.title}
                    desc={badge.description}
                    isLocked={true}
                    target={badge.target}
                  />
                ))}
                {showAllBadges && !hasSierraMadre && (
                  <div className={`${styles.badgeItem} ${styles.locked}`}>
                    <div className={styles.badgeIcon}>
                      <img src="/sierra_madre_badge.svg" alt="Sierra Madre" style={{ width: '30px', filter: 'grayscale(1) opacity:0.5' }} />
                    </div>
                    <h4>Sierra Madre</h4>
                    <p>Complete all tasks to unlock this legendary badge</p>
                    <small>Locked</small>
                  </div>
                )}
                {unlockedBadges.length === 0 && !hasSierraMadre && !showAllBadges && (
                  <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>No badges earned yet.</p>
                )}
              </div>
            </div>
            {/* Recent Activity Section */}
            <div className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <h3>Recent Activity</h3>
                {recentActivity.length > 5 && (
                  <span className={styles.viewAll} onClick={() => setShowAllActivity(!showAllActivity)}>
                    {showAllActivity ? 'Hide' : 'View All'}
                  </span>
                )}
              </div>
              <ul className={styles.recentActivity}>
                {recentActivity.slice(0, showAllActivity ? recentActivity.length : 5).map((act, idx) => (
                  <li key={idx} className={styles.activityItem}>
                    <div className={styles.activityIcon} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F6FFEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#82AA52', marginRight: '15px' }}>
                      <i className="fas fa-hand-holding-heart"></i>
                    </div>
                    <div className={styles.activityInfo}>
                      <h4 style={{ margin: '0 0 5px 0' }}>{act.title}</h4>
                      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{act.details}</p>
                      <small style={{ color: '#999', fontSize: '12px' }}>{new Date(act.date).toLocaleDateString()}</small>
                    </div>
                  </li>
                ))}
                {recentActivity.length === 0 && (
                  <li className={styles.activityItem}>
                    <div style={{ padding: '10px', color: '#888' }}>No recent activity to show.</div>
                  </li>
                )}
              </ul>
            </div>
            {/* Feedback Button */}
            <div className={styles.feedbackBtn} onClick={() => setIsFeedbackOpen(true)}>💬</div>
            {/* Feedback Modal */}
            {isFeedbackOpen && (
              <div className={styles.feedbackModal} onClick={e => { if (e.target === e.currentTarget) setIsFeedbackOpen(false); }}>
                <div className={styles.feedbackContent}>
                  <span className={styles.feedbackCloseBtn} onClick={() => setIsFeedbackOpen(false)}>×</span>
                  {!submitSuccess ? (
                    <div className={styles.feedbackForm}>
                      <h3>Share Your Feedback</h3>
                      <div className={styles.emojiRating}>
                        {[{ r: 1, e: '😞', l: 'Very Sad' }, { r: 2, e: '😕', l: 'Sad' }, { r: 3, e: '😐', l: 'Neutral' }, { r: 4, e: '🙂', l: 'Happy' }, { r: 5, e: '😍', l: 'Very Happy' }].map(option => (
                          <div key={option.r} className={`${styles.emojiOption} ${rating === option.r ? styles.selected : ''}`} onClick={() => { setRating(option.r); setRatingError(false); }}>
                            <span className={styles.emoji}>{option.e}</span>
                            <span className={styles.emojiLabel}>{option.l}</span>
                          </div>
                        ))}
                      </div>
                      {ratingError && <div className={styles.errorMessage}>Please select a rating</div>}
                      <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                      <textarea placeholder="Your feedback helps us make EcoWaste better..." value={feedbackText} onChange={e => { setFeedbackText(e.target.value); setTextError(false); }} />
                      {textError && <div className={styles.errorMessage}>Please provide your feedback</div>}
                      <button type="submit" className={styles.feedbackSubmitBtn} onClick={handleFeedbackSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (<><span>Submitting...</span><div className={styles.spinner} /></>) : 'Submit Feedback'}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.thankYouMessage}>
                      <span className={styles.thankYouEmoji}>🎉</span>
                      <h3>Thank You!</h3>
                      <p>We appreciate your feedback and will use it to improve EcoWaste.</p>
                      <p>Your opinion matters to us!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Helper component for badges
interface BadgeItemProps {
  icon: string;
  title: string;
  desc: string;
  isLocked: boolean;
  target?: number;
  badgeId?: string;
  isEquipped?: boolean;
  onEquip?: (id: string) => void;
  canEquip?: boolean;
}

function BadgeItem({ icon, title, desc, isLocked, target, badgeId, isEquipped, onEquip, canEquip }: BadgeItemProps) {
  const iconClass = icon.includes('fa-') ? icon : `fas fa-${icon}`;
  return (
    <div className={`${styles.badgeItem} ${isLocked ? styles.locked : ''}`}>
      <div className={styles.badgeIcon}>
        <i className={iconClass}></i>
      </div>
      <h4>{title}</h4>
      <p>{desc}</p>
      {isLocked ? (
        target ? <small>Target: {target}</small> : <small>Locked</small>
      ) : (
        <div style={{ marginTop: '5px' }}>
          {isEquipped ? (
            <div style={{ color: '#82AA52', fontWeight: 'bold', fontSize: '12px', marginTop: '5px' }}>
              <i className="fas fa-check-circle"></i> Equipped
            </div>
          ) : (
            canEquip && badgeId && (
              <button onClick={() => onEquip && onEquip(badgeId)} style={{ padding: '5px 10px', border: '1px solid #82AA52', borderRadius: '15px', background: 'white', color: '#82AA52', cursor: 'pointer', fontSize: '12px', marginTop: '5px' }}>
                Equip Badge
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
