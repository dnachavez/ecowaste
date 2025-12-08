'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './profile.module.css';

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
    firstName: 'Dan Glyde',
    lastName: 'Chavez',
    middleName: 'Funtilar',
    email: 'superdanglyde.yt@gmail.com',
    phone: '09942816658',
    address: 'Downsview, Nivel Hills, Lahug',
    city: 'Cebu City',
    zipCode: '6000'
  });

  const openEditModal = () => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: user.displayName ? user.displayName.split(' ')[0] : prev.firstName,
        lastName: user.displayName && user.displayName.split(' ').length > 1 ? user.displayName.split(' ').slice(1).join(' ') : prev.lastName,
      }));
    }
    setShowEditProfileModal(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate update
    console.log('Updating profile:', profileForm);
    setShowEditProfileModal(false);
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

  return (
    <ProtectedRoute>
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
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
              <h2>{user?.displayName || 'Dan Glyde Funtilar Chavez'}</h2>
              <p>Member since December 2025</p>
              <p><i className="fas fa-map-marker-alt"></i> {profileForm.city}</p>
              <span className={styles.profileLevel}>Level 1 Eco Warrior</span>
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
              <h3>0</h3>
              <p>Items Recycled</p>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-hand-holding-heart"></i>
              <h3>0</h3>
              <p>Items Donated</p>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-tasks"></i>
              <h3>0</h3>
              <p>Projects Completed</p>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-star"></i>
              <h3>0</h3>
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
              {/* Visible Badges */}
              <BadgeItem icon="recycle" title="Recycling Pro" desc="Recycled 10+ items" progress={0} total={10} />
              <BadgeItem icon="hand-holding-heart" title="Donation Hero" desc="Donated 5+ items" progress={0} total={5} />
              <BadgeItem icon="project-diagram" title="Project Master" desc="Completed 3+ projects" progress={0} total={3} />
              <BadgeItem icon="seedling" title="EcoWaste Beginner" desc="Completed your first eco activity" progress={0} total={1} />
              <BadgeItem icon="hand-holding-heart" title="Rising Donor" desc="Completed your first donation" progress={0} total={1} />
              
              {/* Hidden Badges */}
              {showAllBadges && (
                <>
                  <BadgeItem icon="star" title="Eco Star" desc="Completed a recycling project" progress={0} total={1} />
                  <BadgeItem icon="hand-holding-heart" title="Donation Starter" desc="Donated 1 item" progress={0} total={1} />
                  <BadgeItem icon="gift" title="Donation Champion" desc="Donated 15+ items" progress={0} total={15} />
                  <BadgeItem icon="hands-helping" title="Generous Giver" desc="Completed 20 donations" progress={0} total={20} />
                  <BadgeItem icon="award" title="Charity Champion" desc="Completed 30 donations" progress={0} total={30} />
                  <BadgeItem icon="recycle" title="Recycling Starter" desc="Recycled 1 item" progress={0} total={1} />
                  <BadgeItem icon="recycle" title="Recycling Expert" desc="Recycled 15+ items" progress={0} total={15} />
                  <BadgeItem icon="project-diagram" title="Zero Waste Hero" desc="Created 25 recycling projects" progress={1} total={25} percent={4} />
                  <BadgeItem icon="globe" title="Earth Saver" desc="Created 30 recycling projects" progress={1} total={30} percent={3.33} />
                  <BadgeItem icon="seedling" title="Eco Pro" desc="Completed 20 recycling projects" progress={0} total={20} />
                  <BadgeItem icon="trophy" title="EcoLegend" desc="Completed 30 recycling projects" progress={0} total={1} />
                  <BadgeItem icon="star" title="EcoWaste Rookie" desc="Earned 50+ points" progress={0} total={50} />
                  <BadgeItem icon="medal" title="EcoWaste Master" desc="Earned 100+ points" progress={0} total={100} />
                  <BadgeItem icon="trophy" title="EcoWaste Warrior" desc="Earned 200+ points" progress={0} total={200} />
                  <BadgeItem icon="crown" title="EcoWaste Legend" desc="Earned 500+ points" progress={0} total={500} />
                  {/* Sierra Madre Badge - custom image */}
                  <div className={`${styles.badgeItem} ${styles.locked}`}>
                    <div className={styles.badgeIcon}>
                      <img src="/sierra_madre_badge.svg" alt="Sierra Madre" style={{width: '30px', filter: 'brightness(0) invert(1)'}} onError={(e) => {e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML = '<i class="fas fa-mountain"></i>'}} />
                    </div>
                    <h4>Sierra Madre</h4>
                    <p>Complete all achievement tasks to unlock this legendary badge</p>
                    <div className={styles.badgeProgress}>
                      <div className={styles.progressBar} style={{ width: '0%' }}></div>
                    </div>
                    <small>0 / 1 completed</small>
                  </div>
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
              <li className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  <i className="fas fa-project-diagram"></i>
                </div>
                <div className={styles.activityContent}>
                  <h4>In progress project: Plastic Bottle Vase</h4>
                  <div className={styles.activityTime}>1 day ago</div>
                </div>
              </li>
            </ul>
          </div>
        </main>
      </div>

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

// Helper component for badges to reduce repetition
function BadgeItem({ icon, title, desc, progress, total, percent }: { icon: string, title: string, desc: string, progress: number, total: number, percent?: number }) {
  const percentage = percent !== undefined ? percent : (progress / total) * 100;
  
  return (
    <div className={`${styles.badgeItem} ${styles.locked}`}>
      <div className={styles.badgeIcon}>
        <i className={`fas fa-${icon}`}></i>
      </div>
      <h4>{title}</h4>
      <p>{desc}</p>
      <div className={styles.badgeProgress}>
        <div className={styles.progressBar} style={{ width: `${percentage}%` }}></div>
      </div>
      <small>{progress} / {total} completed</small>
    </div>
  );
}
