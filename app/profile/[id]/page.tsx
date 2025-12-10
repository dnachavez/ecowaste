'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import styles from '../profile.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue } from 'firebase/database';

interface FirebaseUser {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    avatar?: string;
    city?: string;
    // Add other fields as needed
}

export default function OtherUserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const [userData, setUserData] = useState<FirebaseUser | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
        const userRef = ref(db, 'users/' + userId);
        const unsubscribe = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUserData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    fullName: data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : 'Eco User'),
                    email: data.email || '',
                    city: data.city || 'Unknown Location',
                    avatar: data.avatar
                });
            } else {
                 setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }
  }, [userId]);

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
              {userData.avatar && (userData.avatar.startsWith('http') || userData.avatar.startsWith('/')) ? (
                  <img src={userData.avatar} alt={userData.fullName} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              ) : (
                  userData.fullName ? userData.fullName.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <div className={styles.profileInfo}>
              <h2>{userData.fullName}</h2>
              <p><i className="fas fa-map-marker-alt"></i> {userData.city}</p>
              <span className={styles.profileLevel}>Level 1 Eco Warrior</span>
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
              {/* Visible Badges - Static for now as in main profile */}
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
            </div>
            <ul className={styles.recentActivity}>
               <li className={styles.activityItem}>
                 <div style={{ padding: '10px', color: '#888' }}>No recent activity to show.</div>
               </li>
            </ul>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}

// Helper component for badges
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
