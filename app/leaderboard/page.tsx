'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './leaderboard.module.css';
import { db } from '../../lib/firebase';
import { ref, onValue } from 'firebase/database';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  points: number;
  avatar: string;
}

export default function Leaderboard() {
  const { } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [textError, setTextError] = useState(false);

  useEffect(() => {
    // Fetch Users, Donations, and Projects to calculate points
    const usersRef = ref(db, 'users');
    const donationsRef = ref(db, 'donations');
    const projectsRef = ref(db, 'projects');

    let usersData: Record<string, { fullName?: string }> = {};
    let donationsData: Record<string, { userId?: string }> = {};
    let projectsData: Record<string, { authorId?: string; status?: string }> = {};
    const dataLoaded = { users: false, donations: false, projects: false };

    const calculateLeaderboard = (
      users: Record<string, { fullName?: string }>,
      donations: Record<string, { userId?: string }>,
      projects: Record<string, { authorId?: string; status?: string }>
    ) => {
      const userPoints: Record<string, number> = {};
  
      // Initialize users with 0 points
      Object.keys(users).forEach(userId => {
        userPoints[userId] = 0;
      });
  
      // Calculate points from Donations (e.g., 10 points per donation)
      Object.values(donations).forEach((donation) => {
        if (donation.userId && userPoints[donation.userId] !== undefined) {
          userPoints[donation.userId] += 10;
        }
      });
  
      // Calculate points from Completed Projects (e.g., 20 points per completed project)
      Object.values(projects).forEach((project) => {
        if (project.authorId && project.status === 'completed' && userPoints[project.authorId] !== undefined) {
          userPoints[project.authorId] += 20;
        }
      });
  
      // Convert to array and sort
      const rankedUsers = Object.entries(userPoints)
        .map(([userId, points]) => {
          const userInfo = users[userId];
          const fullName = userInfo.fullName || 'Unknown User';
          return {
            id: userId,
            name: fullName,
            points: points,
            avatar: fullName.charAt(0).toUpperCase()
          };
        })
        .filter(user => user.points > 0) // Exclude users with 0 points
        .sort((a, b) => b.points - a.points) // Sort descending
        .slice(0, 10) // Top 10
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }));
  
      setLeaderboardData(rankedUsers);
    };

    const checkAndCalculate = () => {
      if (dataLoaded.users && dataLoaded.donations && dataLoaded.projects) {
        calculateLeaderboard(usersData, donationsData, projectsData);
        setLoading(false);
      }
    };

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      usersData = snapshot.val() || {};
      dataLoaded.users = true;
      checkAndCalculate();
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false); // Stop loading on error
    });

    const unsubscribeDonations = onValue(donationsRef, (snapshot) => {
      donationsData = snapshot.val() || {};
      dataLoaded.donations = true;
      checkAndCalculate();
    }, (error) => {
      console.error("Error fetching donations:", error);
      setLoading(false);
    });

    const unsubscribeProjects = onValue(projectsRef, (snapshot) => {
      projectsData = snapshot.val() || {};
      dataLoaded.projects = true;
      checkAndCalculate();
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeDonations();
      unsubscribeProjects();
    };
  }, []);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let valid = true;
    if (rating === 0) {
      setRatingError(true);
      valid = false;
    } else {
      setRatingError(false);
    }
    
    if (feedbackText.trim() === '') {
      setTextError(true);
      valid = false;
    } else {
      setTextError(false);
    }
    
    if (!valid) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Reset and close after 3 seconds
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setSubmitSuccess(false);
        setRating(0);
        setFeedbackText('');
      }, 3000);
    }, 1500);
  };

  /* Removed static leaderboardData */


  const getRankClass = (rank: number) => {
    if (rank === 1) return styles.rankFirst;
    if (rank === 2) return styles.rankSecond;
    if (rank === 3) return styles.rankThird;
    return '';
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className={`${styles.rankBadge} ${styles.rank1}`}>
          <i className="fas fa-trophy"></i>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className={`${styles.rankBadge} ${styles.rank2}`}>
          <i className="fas fa-trophy"></i>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className={`${styles.rankBadge} ${styles.rank3}`}>
          <i className="fas fa-trophy"></i>
        </div>
      );
    }
    return <span className={styles.rankNumber}>{rank}</span>;
  };

  return (
    <ProtectedRoute>
      <Header />

      <div className={styles.container}>
      <Sidebar />

      <main className={styles.mainContent}>
        <div className={styles.leaderboardContainer}>
            <h2 className={styles.leaderboardTitle}>Community Leaderboard</h2>
            <p className={styles.leaderboardSubtitle}>Top contributors making a difference for our planet</p>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading leaderboard...</div>
            ) : (
            <table className={styles.leaderboardTable}>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>User</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboardData.length > 0 ? (
                        leaderboardData.map((user) => (
                            <tr key={user.id} className={getRankClass(user.rank)}>
                                <td className={styles.rank}>
                                    <div className={styles.rankContainer}>
                                        {renderRankBadge(user.rank)}
                                    </div>
                                </td>
                                <td className={styles.userInfo}>
                                    <div className={styles.userLinkWrapper}>
                                        <Link href={`/profile/${user.id}`} className={styles.userLink}>
                                            <div className={styles.tableProfilePic}>
                                                {user.avatar}
                                            </div>
                                            <span className={styles.userName}>{user.name}</span>
                                        </Link>
                                    </div>
                                </td>
                                <td className={styles.points}>
                                    <div className={styles.pointsContainer}>
                                        <span className={styles.pointsValue}>{user.points}</span>
                                        <span className={styles.pointsLabel}>pts</span>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>No contributors yet. Be the first!</td>
                        </tr>
                    )}
                </tbody>
            </table>
            )}
        </div>
      </main>

      {/* Feedback Button */}
      <div className={styles.feedbackBtn} onClick={() => setIsFeedbackOpen(true)}>💬</div>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className={styles.feedbackModal} onClick={(e) => {
          if (e.target === e.currentTarget) setIsFeedbackOpen(false);
        }}>
          <div className={styles.feedbackContent}>
            <span className={styles.feedbackCloseBtn} onClick={() => setIsFeedbackOpen(false)}>×</span>
            
            {!submitSuccess ? (
              <div className={styles.feedbackForm}>
                <h3>Share Your Feedback</h3>
                <div className={styles.emojiRating}>
                  {[
                    { r: 1, e: '😞', l: 'Very Sad' },
                    { r: 2, e: '😕', l: 'Sad' },
                    { r: 3, e: '😐', l: 'Neutral' },
                    { r: 4, e: '🙂', l: 'Happy' },
                    { r: 5, e: '😍', l: 'Very Happy' }
                  ].map((option) => (
                    <div 
                      key={option.r} 
                      className={`${styles.emojiOption} ${rating === option.r ? styles.selected : ''}`}
                      onClick={() => {
                        setRating(option.r);
                        setRatingError(false);
                      }}
                    >
                      <span className={styles.emoji}>{option.e}</span>
                      <span className={styles.emojiLabel}>{option.l}</span>
                    </div>
                  ))}
                </div>
                {ratingError && <div className={styles.errorMessage} style={{display: 'block'}}>Please select a rating</div>}
                
                <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                <textarea 
                  placeholder="Your feedback helps us make EcoWaste better..."
                  value={feedbackText}
                  onChange={(e) => {
                    setFeedbackText(e.target.value);
                    setTextError(false);
                  }}
                ></textarea>
                {textError && <div className={styles.errorMessage} style={{display: 'block'}}>Please provide your feedback</div>}
                
                <button 
                  type="submit" 
                  className={styles.feedbackSubmitBtn} 
                  onClick={handleFeedbackSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      Submitting... <div className={styles.spinner}></div>
                    </>
                  ) : 'Submit Feedback'}
                </button>
              </div>
            ) : (
              <div className={styles.thankYouMessage} style={{display: 'block'}}>
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
