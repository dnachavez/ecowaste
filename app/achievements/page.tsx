'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import Image from 'next/image';
import styles from './achievements.module.css';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { awardXP, getNextLevelXp, incrementAction } from '../../lib/gamification';
import { createNotification } from '../../lib/notifications';

interface Task {
    id: string;
    title: string;
    description: string;
    xpReward?: number;
    badgeId?: string;
    rewardType?: 'xp' | 'badge';
    type: 'recycle' | 'donate' | 'other';
    target?: number;
    pickupDate?: string;
    deliveryDate?: string;
}

export default function Achievements() {
    const { user } = useAuth();
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'donation': true,
        'recycling': true,
        'other': true
    });
    
    // User Stats
    const [stats, setStats] = useState({
        xp: 0,
        level: 1,
        badges: [] as string[],
        recyclingCount: 0,
        donationCount: 0,
        projectsCompleted: 0
    });
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [completedTasks, setCompletedTasks] = useState<string[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    // Feedback Modal State (kept from original)
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [feedbackError, setFeedbackError] = useState({ rating: false, text: false });

    useEffect(() => {
        if (user) {
            // Fetch User Stats
            const userRef = ref(db, `users/${user.uid}`);
            const unsubscribeUser = onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setStats({
                        xp: data.xp || 0,
                        level: data.level || 1,
                        badges: data.badges || [],
                        recyclingCount: data.recyclingCount || 0,
                        donationCount: data.donationCount || 0,
                        projectsCompleted: data.projectsCompleted || 0 // Assuming this field exists
                    });
                    setCompletedTasks(data.completedTasks || []);
                }
            });

            // Fetch Tasks
            const tasksRef = ref(db, 'tasks');
            const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const tasksList = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...(value as Omit<Task, 'id'>)
                    }));
                    setTasks(tasksList);
                } else {
                    setTasks([]);
                }
                setLoadingTasks(false);
            });

            return () => {
                unsubscribeUser();
                unsubscribeTasks();
            };
        }
    }, [user]);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleClaimTask = async (task: Task) => {
        if (!user) return;
        
        try {
            // Handle badge rewards
            let xpToAward = task.rewardType === 'badge' ? 0 : (task.xpReward || 50);
            let badgeToAward = task.rewardType === 'badge' ? task.badgeId : null;

            // Logic based on task type
            if (task.type === 'recycle') {
                if (task.rewardType === 'badge') {
                    // For badge rewards, just award the badge
                    const newBadges = [...stats.badges];
                    if (badgeToAward && !newBadges.includes(badgeToAward)) {
                        newBadges.push(badgeToAward);
                    }
                    await update(ref(db, `users/${user.uid}`), {
                        badges: newBadges,
                        completedTasks: [...completedTasks, task.id]
                    });
                } else {
                    await incrementAction(user.uid, 'recycle', task.target || 1, xpToAward);
                    await update(ref(db, `users/${user.uid}`), {
                        completedTasks: [...completedTasks, task.id]
                    });
                }
            } else if (task.type === 'donate') {
                if (task.target && stats.donationCount < task.target) {
                    alert(`You need to donate ${task.target - stats.donationCount} more items to claim this reward!`);
                    return;
                }
                if (task.rewardType === 'badge') {
                    const newBadges = [...stats.badges];
                    if (badgeToAward && !newBadges.includes(badgeToAward)) {
                        newBadges.push(badgeToAward);
                    }
                    await update(ref(db, `users/${user.uid}`), {
                        badges: newBadges,
                        completedTasks: [...completedTasks, task.id]
                    });
                } else {
                    await awardXP(user.uid, xpToAward);
                    await update(ref(db, `users/${user.uid}`), {
                        completedTasks: [...completedTasks, task.id]
                    });
                }
            } else {
                // For other tasks
                if (task.rewardType === 'badge') {
                    const newBadges = [...stats.badges];
                    if (badgeToAward && !newBadges.includes(badgeToAward)) {
                        newBadges.push(badgeToAward);
                    }
                    await update(ref(db, `users/${user.uid}`), {
                        badges: newBadges,
                        completedTasks: [...completedTasks, task.id]
                    });
                } else {
                    await awardXP(user.uid, xpToAward);
                    await update(ref(db, `users/${user.uid}`), {
                        completedTasks: [...completedTasks, task.id]
                    });
                }
            }

            // Check if all tasks are completed for secret achievement
            const newCompleted = [...completedTasks, task.id];
            if (newCompleted.length === tasks.length && tasks.length > 0) {
                // All tasks completed - award secret badge via notification
                const { createNotification } = await import('../../lib/notifications');
                
                // Award the badge
                const userRef = ref(db, `users/${user.uid}`);
                const currentData = (await import('firebase/database').then(m => m.get(userRef))).val();
                const newBadges = currentData?.badges || [];
                if (!newBadges.includes('sierra_madre')) {
                    newBadges.push('sierra_madre');
                }
                
                await update(userRef, {
                    badges: newBadges
                });

                // Send notification about secret achievement
                await createNotification(user.uid, {
                    title: '🎉 Secret Achievement Unlocked!',
                    message: '👑 Sierra Madre - You completed all tasks! A legendary badge has been awarded.',
                    type: 'success'
                });

                alert(`Task Completed! ${task.rewardType === 'badge' ? 'Badge awarded!' : `You earned ${task.xpReward} XP.`}\n\n🎉 Secret Achievement Unlocked: Sierra Madre Badge!`);
            } else {
                alert(`Task Completed! ${task.rewardType === 'badge' ? 'Badge awarded!' : `You earned ${task.xpReward} XP.`}`);
            }
        } catch (error) {
            console.error('Error completing task:', error);
            alert('Something went wrong. Please try again.');
        }
    };

    // Derived values
    const nextLevelXp = getNextLevelXp(stats.level);
    const progressPercent = Math.min(100, (stats.xp / nextLevelXp) * 100);
    const circumference = 2 * Math.PI * 90; // r=90
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    const hasSierraMadre = stats.badges.includes('sierra_madre') || stats.badges.includes('SIERRA_MADRE');

    // Group tasks
    const donationTasks = tasks.filter(t => t.type === 'donate');
    const recyclingTasks = tasks.filter(t => t.type === 'recycle');
    const otherTasks = tasks.filter(t => t.type !== 'donate' && t.type !== 'recycle');

    // Helper to render task list
    const renderTaskList = (list: Task[]) => {
        if (list.length === 0) return <div style={{padding: '15px', color: '#666', textAlign: 'center'}}>No tasks available</div>;
        
        return (
            <div className={styles.taskList}>
                {list.map(task => {
                    const isCompleted = completedTasks.includes(task.id);
                    const isBadgeReward = task.rewardType === 'badge';
                    return (
                        <div key={task.id} className={styles.taskItem} style={{
                            padding: '15px', 
                            borderBottom: '1px solid #eee', 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: isCompleted ? 0.6 : 1
                        }}>
                            <div>
                                <h5 style={{margin: '0 0 5px 0', fontSize: '16px'}}>{task.title}</h5>
                                <p style={{margin: 0, fontSize: '14px', color: '#666'}}>{task.description}</p>
                                {(task.pickupDate || task.deliveryDate) && (
                                    <div style={{marginTop: '5px', fontSize: '12px', color: '#555'}}>
                                        {task.pickupDate && <span style={{marginRight: '10px'}}>Pickup: {task.pickupDate}</span>}
                                        {task.deliveryDate && <span>Delivery: {task.deliveryDate}</span>}
                                    </div>
                                )}
                                <span style={{fontSize: '12px', color: '#82AA52', fontWeight: 'bold'}}>
                                    {isBadgeReward ? '🎖️ Badge Reward' : `+${task.xpReward || 50} XP`}
                                </span>
                            </div>
                            {isCompleted ? (
                                <span style={{color: '#82AA52', fontWeight: 'bold'}}>Completed ✓</span>
                            ) : (
                                <button 
                                    onClick={() => handleClaimTask(task)}
                                    style={{
                                        background: '#82AA52', 
                                        color: 'white', 
                                        border: 'none', 
                                        padding: '8px 16px', 
                                        borderRadius: '20px', 
                                        cursor: 'pointer'
                                    }}
                                >
                                    Claim
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... (keep existing feedback logic)
        const errors = {
            rating: feedbackRating === 0,
            text: feedbackText.trim() === ''
        };
        setFeedbackError(errors);
        if (errors.rating || errors.text) return;
        setIsFeedbackSubmitting(true);
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
                                    strokeDasharray={circumference} 
                                    strokeDashoffset={strokeDashoffset}
                                ></circle>
                            </svg>
                            <div className={styles.circle}>
                                <div className={styles.circleInner}>
                                    <div className={styles.levelNumber}>{stats.level}</div>
                                    <div className={styles.levelLabel}>LEVEL</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.progressText}>{stats.xp}/{nextLevelXp} XP</div>
                        <div className={styles.currentLevel}>Progress to Level {stats.level + 1}</div>
                    </div>

                    {/* Stats */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>{stats.projectsCompleted}</div>
                            <div className={styles.statLabel}>Projects Completed</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>{stats.badges.length}</div>
                            <div className={styles.statLabel}>Badges Earned</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>{stats.donationCount}</div>
                            <div className={styles.statLabel}>Total Donations</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>{stats.recyclingCount}</div>
                            <div className={styles.statLabel}>Items Recycled</div>
                        </div>
                         <div className={styles.statItem}>
                            <div className={styles.statNumber}>{stats.xp}</div>
                            <div className={styles.statLabel}>Total XP</div>
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
                                    <i className={`fas fa-chevron-${expandedCategories['donation'] ? 'up' : 'down'}`}></i>
                                </div>
                                <div className={styles.categoryContent} style={{ display: expandedCategories['donation'] ? 'block' : 'none' }}>
                                    {renderTaskList(donationTasks)}
                                </div>
                            </div>
                            
                            <div className={styles.taskCategory}>
                                <div 
                                    className={`${styles.categoryHeader} ${expandedCategories['recycling'] ? styles.active : ''}`}
                                    onClick={() => toggleCategory('recycling')}
                                >
                                    <h4>Recycling Tasks</h4>
                                    <i className={`fas fa-chevron-${expandedCategories['recycling'] ? 'up' : 'down'}`}></i>
                                </div>
                                <div className={styles.categoryContent} style={{ display: expandedCategories['recycling'] ? 'block' : 'none' }}>
                                    {renderTaskList(recyclingTasks)}
                                </div>
                            </div>
                            
                            <div className={styles.taskCategory}>
                                <div 
                                    className={`${styles.categoryHeader} ${expandedCategories['other'] ? styles.active : ''}`}
                                    onClick={() => toggleCategory('other')}
                                >
                                    <h4>Other Tasks</h4>
                                    <i className={`fas fa-chevron-${expandedCategories['other'] ? 'up' : 'down'}`}></i>
                                </div>
                                <div className={styles.categoryContent} style={{ display: expandedCategories['other'] ? 'block' : 'none' }}>
                                    {renderTaskList(otherTasks)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sierra Madre Badge Section */}
                    <div className={styles.sierraMadreSection}>
                        <div className={styles.sierraMadreHeader}>
                            <h3>🏆 Secret Badge</h3>
                            <p className={styles.sierraSubtitle}>Reach Level 5 to unlock the legendary Sierra Madre badge!</p>
                        </div>
                        <div className={`${styles.sierraMadreBadgeContainer} ${!hasSierraMadre ? styles.locked : ''}`}>
                            <div className={styles.badgeIconWrapper}>
                                <div className={`${styles.badgeIcon} ${!hasSierraMadre ? styles.lockedBadgeIcon : ''}`}>
                                    <Image 
                                        src="/sierra_madre_badge.svg" 
                                        alt="Sierra Madre Badge" 
                                        width={100} 
                                        height={100}
                                        style={{ filter: !hasSierraMadre ? 'grayscale(100%) opacity(0.5)' : 'none' }}
                                    />
                                    {!hasSierraMadre && <div className={styles.lockOverlay}>🔒</div>}
                                </div>
                            </div>
                            <div className={styles.badgeInfoWrapper}>
                                <h4 className={styles.badgeTitle}>Sierra Madre</h4>
                                <p className={styles.badgeDescription}>Reach Level 5 to unlock this legendary badge</p>
                                <div className={`${styles.badgeStatus} ${!hasSierraMadre ? styles.lockedStatus : ''}`} style={{color: hasSierraMadre ? '#82AA52' : undefined}}>
                                    {hasSierraMadre ? (
                                        <><i className="fas fa-check-circle"></i> Unlocked</>
                                    ) : (
                                        <><i className="fas fa-lock"></i> Reach Level 5 to unlock</>
                                    )}
                                </div>
                                {!hasSierraMadre && (
                                    <div className={styles.badgeProgress}>
                                        <div className={styles.badgeProgressText}>Current Level: {stats.level}/5</div>
                                        <div className={styles.badgeProgressBar}>
                                            <div className={styles.badgeProgressFill} style={{width: `${Math.min(100, (stats.level / 5) * 100)}%`}}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Feedback Button (kept from original) */}
            <div className={styles.feedbackBtn} onClick={() => setIsFeedbackModalOpen(true)}>💬</div>

            {/* Feedback Modal (kept from original) */}
            {isFeedbackModalOpen && (
                <div className={styles.feedbackModal} style={{display: 'flex'}}>
                    <div className={styles.feedbackContent}>
                        <span className={styles.feedbackCloseBtn} onClick={() => setIsFeedbackModalOpen(false)}>×</span>
                        {!showThankYou ? (
                            <form className={styles.feedbackForm} onSubmit={handleFeedbackSubmit}>
                                <h3>Share Your Feedback</h3>
                                <div className={styles.emojiRating}>
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <div key={rating} className={`${styles.emojiOption} ${feedbackRating === rating ? styles.selected : ''}`} onClick={() => setFeedbackRating(rating)}>
                                            <span className={styles.emoji}>{rating === 5 ? '😍' : rating === 4 ? '🙂' : rating === 3 ? '😐' : rating === 2 ? '😕' : '😞'}</span>
                                        </div>
                                    ))}
                                </div>
                                <textarea placeholder="Your feedback..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}></textarea>
                                <button type="submit" className={styles.feedbackSubmitBtn} disabled={isFeedbackSubmitting}>Submit</button>
                            </form>
                        ) : (
                             <div className={styles.thankYouMessage} style={{display: 'block'}}><h3>Thank You!</h3></div>
                        )}
                    </div>
                </div>
            )}
        </div>
        </div>
        </ProtectedRoute>
    );
}
