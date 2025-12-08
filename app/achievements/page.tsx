'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import Image from 'next/image';
import styles from './achievements.module.css';

export default function Achievements() {
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    
    // Feedback Modal State
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [feedbackError, setFeedbackError] = useState({ rating: false, text: false });

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const errors = {
            rating: feedbackRating === 0,
            text: feedbackText.trim() === ''
        };
        
        setFeedbackError(errors);

        if (errors.rating || errors.text) return;

        setIsFeedbackSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            setIsFeedbackSubmitting(false);
            setShowThankYou(true);
            
            setTimeout(() => {
                setIsFeedbackModalOpen(false);
                setShowThankYou(false);
                setFeedbackText('');
                setFeedbackRating(0);
            }, 3000);
        }, 1500);
    };

    return (
        <ProtectedRoute>
        <div className={styles.pageWrapper}>
        <div className={styles.container}>
            <Header />
            <Sidebar />

            <main className={styles.mainContent}>
                <div className={styles.achievementsHeader}>
                    <h2 style={{ color: '#2e8b57', marginBottom: '10px', fontSize: '18px', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', fontWeight: 700 }}>My Achievements</h2>
                    <p className={styles.subtitle}>Track your eco-friendly progress and accomplishments</p>
                </div>

                <div className={styles.achievementsContent}>
                    {/* Level Card */}
                    <div className={styles.levelCard}>
                        <div className={styles.circularProgress}>
                            <svg className={styles.progressRing} width="200" height="200">
                                <circle className={styles.progressRingCircle} stroke="#e0e0e0" strokeWidth="10" fill="transparent" r="90" cx="100" cy="100"></circle>
                                <circle 
                                    className={styles.progressRingProgress} 
                                    stroke="#82AA52" 
                                    strokeWidth="10" 
                                    fill="transparent" 
                                    r="90" 
                                    cx="100" 
                                    cy="100" 
                                    strokeDasharray="565.48" 
                                    strokeDashoffset="565.48"
                                ></circle>
                            </svg>
                            <div className={styles.circle}>
                                <div className={styles.circleInner}>
                                    <div className={styles.levelNumber}>1</div>
                                    <div className={styles.levelLabel}>LEVEL</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.progressText}>0/25 pts</div>
                        <div className={styles.currentLevel}>Progress to Level 2</div>
                    </div>

                    {/* Stats */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>0</div>
                            <div className={styles.statLabel}>Projects Completed</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>0</div>
                            <div className={styles.statLabel}>Achievements Earned</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>0</div>
                            <div className={styles.statLabel}>Badges Earned</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>0</div>
                            <div className={styles.statLabel}>Total Donations</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>0</div>
                            <div className={styles.statLabel}>Total Items Recycled</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>0</div>
                            <div className={styles.statLabel}>Total Points</div>
                        </div>
                    </div>

                    {/* Tasks */}
                    <div className={styles.tasksSection}>
                        <div className={styles.tasksHeader}><h3>My Tasks</h3></div>
                        <p className={styles.tasksSubtitle}>Complete tasks by category to earn more badges and points!</p>

                        <div className={styles.taskCategories}>
                            <div className={styles.taskCategory}>
                                <div 
                                    className={`${styles.categoryHeader} ${expandedCategories['donation'] ? styles.active : ''}`}
                                    onClick={() => toggleCategory('donation')}
                                >
                                    <h4>Donation-related Tasks</h4>
                                    <i className="fas fa-chevron-down"></i>
                                </div>
                                <div className={styles.categoryContent} style={{ display: expandedCategories['donation'] ? 'block' : 'none' }}>
                                    {/* Task content would go here */}
                                    <div style={{padding: '15px', color: '#666', textAlign: 'center'}}>No tasks available</div>
                                </div>
                            </div>
                            
                            <div className={styles.taskCategory}>
                                <div 
                                    className={`${styles.categoryHeader} ${expandedCategories['project'] ? styles.active : ''}`}
                                    onClick={() => toggleCategory('project')}
                                >
                                    <h4>Project Creation Tasks</h4>
                                    <i className="fas fa-chevron-down"></i>
                                </div>
                                <div className={styles.categoryContent} style={{ display: expandedCategories['project'] ? 'block' : 'none' }}>
                                    <div style={{padding: '15px', color: '#666', textAlign: 'center'}}>No tasks available</div>
                                </div>
                            </div>
                            
                            <div className={styles.taskCategory}>
                                <div 
                                    className={`${styles.categoryHeader} ${expandedCategories['recycling'] ? styles.active : ''}`}
                                    onClick={() => toggleCategory('recycling')}
                                >
                                    <h4>Recycling Project Completion Tasks</h4>
                                    <i className="fas fa-chevron-down"></i>
                                </div>
                                <div className={styles.categoryContent} style={{ display: expandedCategories['recycling'] ? 'block' : 'none' }}>
                                    <div style={{padding: '15px', color: '#666', textAlign: 'center'}}>No tasks available</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sierra Madre Badge Section */}
                    <div className={styles.sierraMadreSection}>
                        <div className={styles.sierraMadreHeader}>
                            <h3>🏆 Secret Badge</h3>
                            <p className={styles.sierraSubtitle}>Complete all tasks to unlock the legendary Sierra Madre badge!</p>
                        </div>
                        <div className={`${styles.sierraMadreBadgeContainer} ${styles.locked}`}>
                            <div className={styles.badgeIconWrapper}>
                                <div className={`${styles.badgeIcon} ${styles.lockedBadgeIcon}`}>
                                    <Image 
                                        src="/sierra_madre_badge.svg" 
                                        alt="Sierra Madre Badge" 
                                        width={100} 
                                        height={100}
                                        style={{ filter: 'grayscale(100%) opacity(0.5)' }}
                                    />
                                    <div className={styles.lockOverlay}>🔒</div>
                                </div>
                            </div>
                            <div className={styles.badgeInfoWrapper}>
                                <h4 className={styles.badgeTitle}>Sierra Madre</h4>
                                <p className={styles.badgeDescription}>Complete all achievement tasks to unlock this legendary badge</p>
                                <div className={`${styles.badgeStatus} ${styles.lockedStatus}`}>
                                    <i className="fas fa-lock"></i> Complete all tasks to unlock
                                </div>
                                <div className={styles.badgeProgress}>
                                    <div className={styles.badgeProgressText}>Progress: 0/0 tasks completed</div>
                                    <div className={styles.badgeProgressBar}>
                                        <div className={styles.badgeProgressFill} style={{width: '0%'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Feedback Button */}
            <div className={styles.feedbackBtn} onClick={() => setIsFeedbackModalOpen(true)}>💬</div>

            {/* Feedback Modal */}
            {isFeedbackModalOpen && (
                <div className={styles.feedbackModal} style={{display: 'flex'}}>
                    <div className={styles.feedbackContent}>
                        <span className={styles.feedbackCloseBtn} onClick={() => setIsFeedbackModalOpen(false)}>×</span>
                        
                        {!showThankYou ? (
                            <form className={styles.feedbackForm} onSubmit={handleFeedbackSubmit}>
                                <h3>Share Your Feedback</h3>
                                <div className={styles.emojiRating}>
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <div 
                                            key={rating}
                                            className={`${styles.emojiOption} ${feedbackRating === rating ? styles.selected : ''}`}
                                            onClick={() => setFeedbackRating(rating)}
                                        >
                                            <span className={styles.emoji}>
                                                {rating === 1 && '😞'}
                                                {rating === 2 && '😕'}
                                                {rating === 3 && '😐'}
                                                {rating === 4 && '🙂'}
                                                {rating === 5 && '😍'}
                                            </span>
                                            <span className={styles.emojiLabel}>
                                                {rating === 1 && 'Very Sad'}
                                                {rating === 2 && 'Sad'}
                                                {rating === 3 && 'Neutral'}
                                                {rating === 4 && 'Happy'}
                                                {rating === 5 && 'Very Happy'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {feedbackError.rating && <div style={{color: '#e74c3c', fontSize: '13px', marginTop: '-15px', marginBottom: '15px'}}>Please select a rating</div>}
                                
                                <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                                <textarea 
                                    placeholder="Your feedback helps us make EcoWaste better..."
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                ></textarea>
                                {feedbackError.text && <div style={{color: '#e74c3c', fontSize: '13px', marginTop: '-15px', marginBottom: '15px'}}>Please provide your feedback</div>}
                                
                                <button type="submit" className={styles.feedbackSubmitBtn} disabled={isFeedbackSubmitting}>
                                    {isFeedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </form>
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
        </div>
        </ProtectedRoute>
    );
}
