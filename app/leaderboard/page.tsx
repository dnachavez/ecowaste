'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './leaderboard.module.css';

export default function Leaderboard() {
  const { user } = useAuth();
  
  // Feedback state
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

  const leaderboardData = [
    { id: 4, rank: 1, name: 'Hanner', points: 810, avatar: 'H' },
    { id: 8, rank: 2, name: 'Princess Kenshi', points: 40, avatar: 'P' },
    { id: 18, rank: 3, name: 'Princess', points: 40, avatar: 'P' },
    { id: 12, rank: 4, name: 'Haruka', points: 20, avatar: 'H' },
    { id: 19, rank: 5, name: 'Shem John', points: 20, avatar: 'S' },
    { id: 21, rank: 6, name: 'Lucas', points: 20, avatar: 'L' },
  ];

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
    <div className={styles.container}>
      <Header />
      <Sidebar />

      <main className={styles.mainContent}>
        <div className={styles.leaderboardContainer}>
            <h2 className={styles.leaderboardTitle}>Community Leaderboard</h2>
            <p className={styles.leaderboardSubtitle}>Top contributors making a difference for our planet</p>
            
            <table className={styles.leaderboardTable}>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>User</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboardData.map((user) => (
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
                    ))}
                </tbody>
            </table>
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
