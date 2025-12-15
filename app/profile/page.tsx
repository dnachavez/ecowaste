'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './profile.module.css';
import { db } from '../../lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';

export default function ProfilePage() {
  const { user } = useAuth();

  // State for modals and toggles
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [textError, setTextError] = useState(false);

  // Edit profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: ''
  });

  const [allBadges, setAllBadges] = useState<any[]>([]);

  const [stats, setStats] = useState({
    xp: 0,
    level: 1,
    badges: [] as string[],
    recyclingCount: 0,
    donationCount: 0,
    projectsCompleted: 0,
    equippedBadge: '' as string
  });

  useEffect(() => {
    if (user) {
      const userRef = ref(db, 'users/' + user.uid);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setProfileForm(prev => ({
            ...prev,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            middleName: data.middleName || '',
            email: user.email || prev.email,
            phone: data.contactNumber || data.phone || '',
            address: data.address || '',
            city: data.city || '',
            zipCode: data.zipCode || ''
          }));
          setStats({
            xp: data.xp || 0,
            level: data.level || 1,
            badges: data.badges || [],
            recyclingCount: data.recyclingCount || 0,
            donationCount: data.donationCount || 0,
            projectsCompleted: data.projectsCompleted || 0,
            equippedBadge: data.equippedBadge || ''
          });
        } else {
          // Initialize from Auth if no DB data
          const names = user.displayName ? user.displayName.split(' ') : [];
          setProfileForm(prev => ({
            ...prev,
            email: user.email || '',
            firstName: names[0] || '',
            lastName: names.length > 1 ? names.slice(1).join(' ') : ''
          }));
        }
      });
    }
  }, [user]);

  // Fetch all badge definitions
  // Fetch all badge definitions
  useEffect(() => {
    const badgesRef = ref(db, 'badges');
    // Fallback data in case of permission denied or empty DB
    // Expanded to include all badges from seedBadges.ts
    const fallbackBadges = [
      { id: 'donation_starter', name: 'Donation Starter', description: 'Donate 1 item', icon: 'hand-holding-heart' },
      { id: 'rising_donor', name: 'Rising Donor', description: 'Complete your first donation', icon: 'hand-holding-heart' },
      { id: 'donation_hero', name: 'Donation Hero', description: 'Donate 5+ items', icon: 'hand-holding-heart' },
      { id: 'donation_champion', name: 'Donation Champion', description: 'Donate 15+ items', icon: 'hand-holding-heart' },
      { id: 'generous_giver', name: 'Generous Giver', description: 'Complete 20 donations', icon: 'hand-holding-heart' },
      { id: 'charity_champion', name: 'Charity Champion', description: 'Complete 30 donations', icon: 'hand-holding-heart' },

      { id: 'recycling_starter', name: 'Recycling Starter', description: 'Recycle 1 item', icon: 'recycle' },
      { id: 'recycling_pro', name: 'Recycling Pro', description: 'Recycle 10 solid wastes', icon: 'recycle' },
      { id: 'recycling_expert', name: 'Recycling Expert', description: 'Recycle 15+ items', icon: 'recycle' },

      { id: 'eco_star', name: 'Eco Star', description: 'Complete a recycling project', icon: 'project-diagram' },
      { id: 'project_master', name: 'Project Master', description: 'Completed 3+ projects', icon: 'project-diagram' },
      { id: 'eco_pro', name: 'Eco Pro', description: 'Complete 20 recycling projects', icon: 'project-diagram' },
      { id: 'zero_waste_hero', name: 'Zero Waste Hero', description: 'Create 25 recycling projects', icon: 'project-diagram' },
      { id: 'earth_saver', name: 'Earth Saver', description: 'Create 30 recycling projects', icon: 'project-diagram' },
      { id: 'eco_legend', name: 'Eco Legend', description: 'Complete 30 recycling projects', icon: 'project-diagram' },

      { id: 'ecowaste_rookie', name: 'EcoWaste Rookie', description: 'Earn 50+ points', icon: 'star' },
      { id: 'ecowaste_master', name: 'EcoWaste Master', description: 'Earn 100+ points', icon: 'star' },
      { id: 'ecowaste_warrior', name: 'EcoWaste Warrior', description: 'Earn 200+ points', icon: 'star' },
      { id: 'ecowaste_legend', name: 'EcoWaste Legend', description: 'Earn 500+ points', icon: 'star' },
      { id: 'ecowaste_beginner', name: 'EcoWaste Beginner', description: 'Complete your first eco activity', icon: 'seedling' },

      { id: 'sierra_madre', name: 'Sierra Madre', description: 'Complete all Donation and Recycling tasks to unlock this legendary badge', icon: 'mountain' },

      // Legacy/Other support
      { id: 'eco_warrior', name: 'Eco Warrior', description: 'Recycled 10+ items', icon: 'recycle' },
      { id: 'generous_soul', name: 'Generous Soul', description: 'Donated 5+ items', icon: 'hand-holding-heart' },
    ];

    const unsubscribe = onValue(badgesRef, (snapshot) => {
      if (snapshot.exists()) {
        const badgesData = snapshot.val();
        const badgesList = Object.entries(badgesData).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        setAllBadges(badgesList);
      } else {
        // If no badges in DB, use fallback
        setAllBadges(fallbackBadges);
      }
    }, (error) => {
      console.warn("Error fetching badges (using fallback):", error);
      setAllBadges(fallbackBadges);
    });
    return () => unsubscribe();
  }, []);

  // Format member since date
  const memberSinceDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'December 2025';

  const openEditModal = () => {
    setShowEditProfileModal(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Update Firebase Auth Profile (Display Name)
      const fullName = `${profileForm.firstName} ${profileForm.middleName ? profileForm.middleName + ' ' : ''}${profileForm.lastName}`.trim();
      if (user.displayName !== fullName) {
        await updateProfile(user, {
          displayName: fullName
        });
      }

      // Update Realtime Database
      const userRef = ref(db, 'users/' + user.uid);
      await update(userRef, {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        middleName: profileForm.middleName,
        fullName: fullName,
        contactNumber: profileForm.phone,
        address: profileForm.address,
        city: profileForm.city,
        zipCode: profileForm.zipCode,
        email: profileForm.email
      });

      setShowEditProfileModal(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile: ", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (feedbackRating === 0) {
      setRatingError(true);
      isValid = false;
    } else {
      setRatingError(false);
    }

    if (feedbackText.trim() === '') {
      setTextError(true);
      isValid = false;
    } else {
      setTextError(false);
    }

    if (!isValid) return;

    setFeedbackSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setFeedbackSubmitting(false);
      setShowThankYou(true);

      setTimeout(() => {
        closeFeedbackModal();
      }, 3000);
    }, 1500);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setShowThankYou(false);
    setFeedbackText('');
    setFeedbackRating(0);
    setRatingError(false);
    setTextError(false);
  };

  const hasBadge = (id: string) => stats.badges.includes(id) || stats.badges.includes(id.toUpperCase());

  const handleEquipBadge = async (badgeId: string) => {
    if (user) {
      try {
        const userRef = ref(db, `users/${user.uid}`);
        const newEquipped = stats.equippedBadge === badgeId ? '' : badgeId;
        await update(userRef, { equippedBadge: newEquipped });
        setStats(prev => ({ ...prev, equippedBadge: newEquipped }));
      } catch (error) {
        console.error('Error equipping badge:', error);
      }
    }
  };

  return (
    <ProtectedRoute>
      <Header />

      <div className={styles.container}>
        <Sidebar />
        <main className={styles.mainContent}>
          {/* Back navigation and page title */}
          <div className={styles.backNavigation}>
            <Link href="/homepage" className={styles.backButton}>
              <i className="fas fa-arrow-left"></i> Back
            </Link>
            <h2 className={styles.pageTitle}>Profile</h2>
          </div>

          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar}>
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'D'}
            </div>
            <div className={styles.profileInfo}>
              <h2>{user?.displayName || 'Guest User'}</h2>
              <p>Member since {memberSinceDate}</p>
              <p><i className="fas fa-map-marker-alt"></i> {profileForm.city || 'No Location'}</p>
              <span className={styles.profileLevel}>Level {stats.level} Eco Warrior</span>
            </div>
            <button
              className={styles.editProfileBtn}
              onClick={openEditModal}
            >
              <i className="fas fa-edit"></i> Edit Profile
            </button>
          </div>

          <div className={styles.userDetails}>
            <h3>Personal Information</h3>
            <div className={styles.detailsGrid}>
              <div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email:</span>
                  <span className={styles.detailValue}>{user?.email || profileForm.email}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Phone:</span>
                  <span className={styles.detailValue}>{profileForm.phone}</span>
                </div>
              </div>
              <div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Address:</span>
                  <span className={styles.detailValue}>{profileForm.address}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Location:</span>
                  <span className={styles.detailValue}>
                    {profileForm.city}, {profileForm.zipCode}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.profileStats}>
            <div className={styles.statCard}>
              <i className="fas fa-recycle"></i>
              <h3>{stats.recyclingCount}</h3>
              <p>Items Recycled</p>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-hand-holding-heart"></i>
              <h3>{stats.donationCount}</h3>
              <p>Items Donated</p>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-tasks"></i>
              <h3>{stats.projectsCompleted}</h3>
              <p>Projects Completed</p>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-star"></i>
              <h3>{stats.xp}</h3>
              <p>Eco Points</p>
            </div>
          </div>

          <div className={styles.profileSection}>
            <div className={styles.sectionHeader}>
              <h3>Eco Badges</h3>
              <span
                className={styles.viewAll}
                onClick={() => setShowAllBadges(!showAllBadges)}
              >
                {showAllBadges ? 'Hide' : 'View All'}
              </span>
            </div>

            <div className={styles.badgesGrid}>
              {allBadges
                .filter(badge => hasBadge(badge.id)) // Only show owned badges
                .slice(0, showAllBadges ? undefined : 5) // Show only 5 unless "View All" is clicked
                .map(badge => (
                  <BadgeItem
                    key={badge.id}
                    icon={badge.icon.replace('fa-', '') /* Simple hack if icon full class is stored, else use as is */}
                    // Assuming icon stored is just the name (e.g. 'recycle') or an emoji. 
                    // If it's an emoji, BadgeItem might need adjustment or we inspect data.
                    // The seeded data uses "icon" field which might be a class or emoji.
                    // Let's pass it as customIcon if it's an emoji or check structure.
                    // The seedBadges.ts shows "icon" as "fas fa-hand-holding-heart" or just emoji in create page.
                    // We'll try to handle both.
                    customIcon={badge.icon.startsWith('http') || badge.icon.length < 5 /* likely emoji */ ? undefined : undefined}
                    // Actually, let's just pass the icon to a modified BadgeItem that handles emoji/classes better?
                    // For now, let's assume it handles it. 
                    // Wait, the seed file shows: icon: "fas fa-hand-holding-heart"
                    // The create page creates: icon: '⭐' (emoji)
                    // The current BadgeItem logic:
                    // {customIcon ? <img ...> : <i className={`fas fa-${icon}`}></i>}
                    // This expects JUST the 'recycle' part if using fontawesome.
                    // But our seed has 'fas fa-recycle'.
                    // We need a smarter BadgeItem or pass props correctly.

                    // Let's pass the raw icon string and let BadgeItem handle it if we modify it, 
                    // OR we modify how we pass it here.

                    // Let's assume for a moment we update BadgeItem below.
                    title={badge.name || badge.title}
                    desc={badge.description}
                    badgeId={badge.id}
                    equipped={stats.equippedBadge === badge.id}
                    onEquip={() => handleEquipBadge(badge.id)}
                    unlocked={true}
                    rawIcon={badge.icon} // passing raw icon to new prop
                  />
                ))
              }
              {allBadges.filter(b => hasBadge(b.id)).length === 0 && (
                <p style={{ color: '#666', gridColumn: '1/-1' }}>No badges earned yet. Complete tasks to earn them!</p>
              )}
            </div>
          </div>

          <div className={styles.profileSection}>
            <div className={styles.sectionHeader}>
              <h3>Recent Activity</h3>
              <span className={styles.viewAll} style={{ cursor: 'pointer' }} onClick={() => setShowAllActivity(!showAllActivity)}>
                {showAllActivity ? 'Hide' : 'View All'}
              </span>
            </div>
            <ul className={styles.recentActivity}>
              {stats.xp > 0 ? (
                <>
                  <li className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <i className="fas fa-star"></i>
                    </div>
                    <div className={styles.activityContent}>
                      <h4>Earned XP</h4>
                      <div className={styles.activityTime}>Total: {stats.xp} XP</div>
                    </div>
                  </li>
                  {showAllActivity && (
                    // Placeholder for more activity if we had a real activity log
                    <li className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        <i className="fas fa-check"></i>
                      </div>
                      <div className={styles.activityContent}>
                        <h4>Joined EcoWaste</h4>
                        <div className={styles.activityTime}>{memberSinceDate}</div>
                      </div>
                    </li>
                  )}
                </>
              ) : (
                <div style={{ color: '#666', padding: '10px' }}>No recent activity</div>
              )}
            </ul>
          </div>
        </main>

        {/* Edit Profile Modal */}
        {showEditProfileModal && (
          <div className={styles.editProfileModal} onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditProfileModal(false);
          }}>
            <div className={styles.editProfileContent}>
              <span className={styles.editProfileCloseBtn} onClick={() => setShowEditProfileModal(false)}>×</span>
              <form className={styles.editProfileForm} onSubmit={handleProfileSubmit}>
                <h3>Edit Your Profile</h3>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={profileForm.firstName}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={profileForm.lastName}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="middleName">Middle Name</label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    value={profileForm.middleName}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={profileForm.address}
                    onChange={handleProfileChange}
                  ></textarea>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={profileForm.city}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="zipCode">ZIP Code</label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={profileForm.zipCode}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>

                <button type="submit" className={styles.editProfileSubmitBtn}>
                  Update Profile
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Feedback Button */}
        <div className={styles.feedbackBtn} onClick={() => setShowFeedbackModal(true)}>💬</div>

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className={styles.feedbackModal} onClick={(e) => {
            if (e.target === e.currentTarget) closeFeedbackModal();
          }}>
            <div className={styles.feedbackContent}>
              <span className={styles.feedbackCloseBtn} onClick={closeFeedbackModal}>×</span>

              {!showThankYou ? (
                <div className={styles.feedbackForm}>
                  <h3>Share Your Feedback</h3>
                  <div className={styles.emojiRating}>
                    {[
                      { r: 1, e: '😞', l: 'Very Sad' },
                      { r: 2, e: '😕', l: 'Sad' },
                      { r: 3, e: '😐', l: 'Neutral' },
                      { r: 4, e: '🙂', l: 'Happy' },
                      { r: 5, e: '😍', l: 'Very Happy' }
                    ].map((item) => (
                      <div
                        key={item.r}
                        className={`${styles.emojiOption} ${feedbackRating == item.r ? styles.selected : ''}`}
                        onClick={() => {
                          setFeedbackRating(item.r);
                          setRatingError(false);
                        }}
                      >
                        <span className={styles.emoji}>{item.e}</span>
                        <span className={styles.emojiLabel}>{item.l}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.errorMessage} style={{ display: ratingError ? 'block' : 'none' }}>
                    Please select a rating
                  </div>

                  <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                  <textarea
                    placeholder="Your feedback helps us make EcoWaste better..."
                    value={feedbackText}
                    onChange={(e) => {
                      setFeedbackText(e.target.value);
                      setTextError(false);
                    }}
                  ></textarea>
                  <div className={styles.errorMessage} style={{ display: textError ? 'block' : 'none' }}>
                    Please provide your feedback
                  </div>

                  <button
                    type="submit"
                    className={styles.feedbackSubmitBtn}
                    onClick={handleFeedbackSubmit}
                    disabled={feedbackSubmitting}
                  >
                    {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    {feedbackSubmitting && <div className={styles.spinner}></div>}
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
      </div>
    </ProtectedRoute>
  );
}

// Helper component for badges
function BadgeItem({ icon, title, desc, badgeId, equipped, onEquip, progress, total, percent, unlocked, customIcon, rawIcon }: { icon?: string, title: string, desc: string, badgeId?: string, equipped?: boolean, onEquip?: () => void, progress?: number, total?: number, percent?: number, unlocked?: boolean, customIcon?: string, rawIcon?: string }) {
  const percentage = percent !== undefined ? percent : (progress !== undefined && total !== undefined ? Math.min(100, (progress / total) * 100) : 100);

  // Icon rendering logic
  let iconElement;
  const iconStr = rawIcon || icon || 'star';

  if (customIcon) {
    iconElement = <img src={customIcon} alt={title} style={{ width: '30px', filter: unlocked ? 'none' : 'grayscale(100%) opacity(0.5)' }} />;
  } else if (iconStr.startsWith('http')) {
    iconElement = <img src={iconStr} alt={title} style={{ width: '30px', filter: unlocked ? 'none' : 'grayscale(100%) opacity(0.5)' }} />;
  } else if (iconStr.includes('fa-')) {
    // Handle fontawesome class string e.g. "fas fa-recycle"
    iconElement = <i className={iconStr}></i>;
  } else if (/^[a-z0-9-]+$/.test(iconStr)) {
    // Handle simple icon name e.g. "recycle" -> "fas fa-recycle"
    iconElement = <i className={`fas fa-${iconStr}`}></i>;
  } else {
    // Handle emoji or other string
    iconElement = <span style={{ fontSize: '24px' }}>{iconStr}</span>;
  }

  return (
    <div className={`${styles.badgeItem} ${!unlocked ? styles.locked : ''}`}>
      <div className={styles.badgeIcon}>
        {iconElement}
      </div>
      <h4>{title}</h4>
      <p>{desc}</p>
      {unlocked === false ? (
        <>
          <div className={styles.badgeProgress}>
            <div className={styles.progressBar} style={{ width: `${percentage}%` }}></div>
          </div>
          <small>{progress} / {total} completed</small>
        </>
      ) : (
        <>
          <div style={{ color: '#82AA52', fontSize: '12px', fontWeight: 'bold', marginTop: '10px', marginBottom: '8px' }}>
            <i className="fas fa-check-circle"></i> Unlocked
          </div>
          {badgeId && onEquip && (
            <button
              onClick={onEquip}
              style={{
                background: equipped ? '#82AA52' : '#ddd',
                color: equipped ? 'white' : '#333',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.3s'
              }}
            >
              {equipped ? '✓ Equipped' : 'Equip Badge'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
