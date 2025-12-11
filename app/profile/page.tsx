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

  const [stats, setStats] = useState({
    xp: 0,
    level: 1,
    badges: [] as string[],
    recyclingCount: 0,
    donationCount: 0,
    projectsCompleted: 0
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
                    projectsCompleted: data.projectsCompleted || 0
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

  return (
    <ProtectedRoute>
    <div className={styles.container}>
      <Header />
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
              {/* Main Badges */}
              <BadgeItem 
                icon="mountain" 
                title="Sierra Madre" 
                desc="Reached Level 5" 
                progress={stats.level} 
                total={5} 
                unlocked={hasBadge('sierra_madre') || stats.level >= 5}
                customIcon="/sierra_madre_badge.svg"
              />
              <BadgeItem 
                icon="recycle" 
                title="Eco Warrior" 
                desc="Recycled 10+ items" 
                progress={stats.recyclingCount} 
                total={10} 
                unlocked={hasBadge('eco_warrior') || stats.recyclingCount >= 10} 
              />
              <BadgeItem 
                icon="hand-holding-heart" 
                title="Generous Soul" 
                desc="Donated 5+ items" 
                progress={stats.donationCount} 
                total={5} 
                unlocked={hasBadge('generous_soul') || stats.donationCount >= 5} 
              />
              
              {/* Additional Badges (Placeholders or Future) */}
              {showAllBadges && (
                <>
                  <BadgeItem icon="project-diagram" title="Project Master" desc="Completed 3+ projects" progress={stats.projectsCompleted} total={3} unlocked={stats.projectsCompleted >= 3} />
                  <BadgeItem icon="star" title="Eco Star" desc="Earned 100 XP" progress={stats.xp} total={100} unlocked={stats.xp >= 100} />
                </>
              )}
            </div>
          </div>

          <div className={styles.profileSection}>
            <div className={styles.sectionHeader}>
              <h3>Recent Activity</h3>
              <a href="#" className={styles.viewAll}>View All</a>
            </div>
            <ul className={styles.recentActivity}>
                {stats.xp > 0 ? (
                    <li className={styles.activityItem}>
                        <div className={styles.activityIcon}>
                            <i className="fas fa-star"></i>
                        </div>
                        <div className={styles.activityContent}>
                            <h4>Earned XP</h4>
                            <div className={styles.activityTime}>Total: {stats.xp} XP</div>
                        </div>
                    </li>
                ) : (
                    <div style={{color: '#666', padding: '10px'}}>No recent activity</div>
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
function BadgeItem({ icon, title, desc, progress, total, percent, unlocked, customIcon }: { icon: string, title: string, desc: string, progress: number, total: number, percent?: number, unlocked: boolean, customIcon?: string }) {
  const percentage = percent !== undefined ? percent : Math.min(100, (progress / total) * 100);
  
  return (
    <div className={`${styles.badgeItem} ${!unlocked ? styles.locked : ''}`}>
      <div className={styles.badgeIcon}>
        {customIcon ? (
             <img src={customIcon} alt={title} style={{width: '30px', filter: unlocked ? 'none' : 'grayscale(100%) opacity(0.5)'}} />
        ) : (
             <i className={`fas fa-${icon}`}></i>
        )}
      </div>
      <h4>{title}</h4>
      <p>{desc}</p>
      {unlocked ? (
           <div style={{color: '#82AA52', fontSize: '12px', fontWeight: 'bold', marginTop: '10px'}}>
             <i className="fas fa-check-circle"></i> Unlocked
           </div>
      ) : (
        <>
            <div className={styles.badgeProgress}>
                <div className={styles.progressBar} style={{ width: `${percentage}%` }}></div>
            </div>
            <small>{progress} / {total} completed</small>
        </>
      )}
    </div>
  );
}
