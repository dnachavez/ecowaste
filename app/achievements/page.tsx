'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import Image from 'next/image';
import styles from './achievements.module.css';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { ref, onValue, update, get, push } from 'firebase/database';
import { awardXP, getNextLevelXp, redeemReward, equipBorder, AVATAR_REWARDS } from '../../lib/gamification';
import { createNotification } from '../../lib/notifications';

interface Task {
    id: string;
    title: string;
    description: string;
    xpReward?: number;
    badgeId?: string;
    rewardType?: 'xp' | 'badge';
    type: 'recycle' | 'donate' | 'project' | 'other' | 'xp';
    target?: number;
}

export default function Achievements() {
    const { user } = useAuth();
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        donation: true,
        recycling: true,
        points: true,
    });

    const [stats, setStats] = useState({
        xp: 0,
        ecoPoints: 0,
        level: 1,
        badges: [] as string[],
        recyclingCount: 0,
        donationCount: 0,
        projectsCompleted: 0,
        unlockedBorders: [] as string[],
        equippedBorder: ''
    });

    const [tasks, setTasks] = useState<Task[]>([]);
    const [completedTasks, setCompletedTasks] = useState<string[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    // Feedback modal state (kept from original)
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [feedbackError, setFeedbackError] = useState({ rating: false, text: false });

    // Success modal for task actions
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: '',
    });


    useEffect(() => {
        if (!user) return;
        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribeUser = onValue(userRef, snapshot => {
            const data = snapshot.val();
            if (data) {
                setStats({
                    xp: data.xp || 0,
                    ecoPoints: data.ecoPoints || 0,
                    level: data.level || 1,
                    badges: data.badges || [],
                    recyclingCount: data.recyclingCount || 0,
                    donationCount: data.donationCount || 0,
                    projectsCompleted: data.projectsCompleted || 0,
                    unlockedBorders: data.unlockedBorders || [],
                    equippedBorder: data.equippedBorder || ''
                });
                setCompletedTasks(data.completedTasks || []);

                // Migration: Sync ecoPoints with XP if ecoPoints is missing OR (0 and no rewards unlocked)
                // This handles cases where ecoPoints might have been initialized to 0 incorrectly
                const hasRedeemed = Array.isArray(data.unlockedBorders) && data.unlockedBorders.length > 0;
                if (data.xp > 0 && (data.ecoPoints === undefined || (data.ecoPoints === 0 && !hasRedeemed))) {
                    update(userRef, { ecoPoints: data.xp });
                }
            }
        });

        const tasksRef = ref(db, 'tasks');
        const unsubscribeTasks = onValue(tasksRef, snapshot => {
            const data = snapshot.val();
            if (data) {
                const tasksList = Object.entries(data).map(([key, value]) => ({ id: key, ...(value as Omit<Task, 'id'>) }));
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
    }, [user]);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newError = { rating: false, text: false };
        let isValid = true;

        if (feedbackRating === 0) {
            newError.rating = true;
            isValid = false;
        }

        if (feedbackText.trim() === '') {
            newError.text = true;
            isValid = false;
        }

        setFeedbackError(newError);

        if (!isValid) return;
        if (!user) return;

        setIsFeedbackSubmitting(true);

        try {
            const feedbackRef = ref(db, 'feedbacks');
            await push(feedbackRef, {
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                rating: feedbackRating,
                text: feedbackText,
                source: 'achievements',
                createdAt: Date.now(),
                status: 'new'
            });

            setIsFeedbackSubmitting(false);
            setShowThankYou(true);

            setTimeout(() => {
                setIsFeedbackModalOpen(false);
                setShowThankYou(false);
                setFeedbackRating(0);
                setFeedbackText('');
            }, 3000);

        } catch (error) {
            console.error("Error submitting feedback:", error);
            setIsFeedbackSubmitting(false);
            alert("Failed to submit feedback. Please try again.");
        }
    };

    // Sierra Madre requires ALL tasks to be completed
    const mainTasks = tasks;
    const completedMainTasksCount = mainTasks.filter(t => completedTasks.includes(t.id)).length;
    const totalMainTasksCount = mainTasks.length;

    const isSierraUnlocked = stats.badges.some(b => b.toLowerCase() === 'sierra_madre');

    // Guard: only unlock when there is at least one main task and all are completed
    // Guard: only unlock when there is at least one main task and all are completed
    // Fix: Added !loadingTasks check to prevent premature unlock when tasks haven't loaded (length 0 == 0)
    useEffect(() => {
        if (!user || loadingTasks) return;

        // Debug logging
        // console.log(`Checking Sierra Madre: Total: ${totalMainTasksCount}, Completed: ${completedMainTasksCount}`);

        if (
            totalMainTasksCount > 0 &&
            completedMainTasksCount === totalMainTasksCount &&
            !isSierraUnlocked
        ) {
            const unlockSierra = async () => {
                console.log("Unlocking Sierra Madre badge...");
                const userRef = ref(db, `users/${user.uid}`);
                const snap = await get(userRef);
                const data = snap.val();
                const newBadges = (data?.badges || []).slice();
                if (!newBadges.includes('sierra_madre')) {
                    newBadges.push('sierra_madre');
                    await update(userRef, { badges: newBadges });
                    await createNotification(user.uid,
                        '🎉 Legendary Achievement Unlocked!',
                        '👑 Sierra Madre - You completed all main tasks! The legendary badge is yours.',
                        'success',
                    );
                    setSuccessModal({ isOpen: true, title: 'Legendary Badge Unlocked!', message: 'Congratulations! You have unlocked the Sierra Madre Badge.' });
                }
            };
            unlockSierra();
        } else if (
            !loadingTasks &&
            totalMainTasksCount > 0 &&
            completedMainTasksCount < totalMainTasksCount &&
            isSierraUnlocked
        ) {
            // Logic to re-lock if requirements clearly not met
            const relockSierra = async () => {
                console.log("Re-locking Sierra Madre (requirements not met)...");
                const userRef = ref(db, `users/${user.uid}`);
                const snap = await get(userRef);
                const data = snap.val();
                let newBadges = (data?.badges || []).slice();
                if (newBadges.includes('sierra_madre')) {
                    newBadges = newBadges.filter((b: string) => b !== 'sierra_madre');
                    await update(userRef, { badges: newBadges });
                }
            };
            relockSierra();
        }
    }, [completedMainTasksCount, totalMainTasksCount, isSierraUnlocked, user, loadingTasks]);

    const handleClaimTask = async (task: Task) => {
        if (!user) return;
        let canClaim = false;
        let currentProgress = 0;
        switch (task.type) {
            case 'recycle':
                currentProgress = stats.recyclingCount;
                if (task.target && currentProgress >= task.target) canClaim = true;
                break;
            case 'donate':
                currentProgress = stats.donationCount;
                if (task.target && currentProgress >= task.target) canClaim = true;
                break;
            case 'project':
                currentProgress = stats.projectsCompleted;
                if (task.target && currentProgress >= task.target) canClaim = true;
                break;
            case 'xp':
                currentProgress = stats.xp;
                if (task.target && currentProgress >= task.target) canClaim = true;
                break;
            case 'other':
                canClaim = true;
                break;
        }
        if (!canClaim) {
            setSuccessModal({ isOpen: true, title: 'Not Yet!', message: `You haven't met the requirements yet! Current: ${currentProgress} / Target: ${task.target}` });
            return;
        }
        const newBadges = [...stats.badges];
        if (task.rewardType === 'badge' && task.badgeId && !newBadges.includes(task.badgeId)) {
            newBadges.push(task.badgeId);
        }
        const updates: Record<string, unknown> = { completedTasks: [...completedTasks, task.id] };
        if (task.rewardType === 'badge') updates.badges = newBadges;
        await update(ref(db, `users/${user.uid}`), updates);
        if (task.rewardType !== 'badge' && task.xpReward) {
            await awardXP(user.uid, task.xpReward);
        }
        setSuccessModal({ isOpen: true, title: 'Task Completed!', message: task.rewardType === 'badge' ? 'Badge awarded!' : `You earned ${task.xpReward || 0} XP.` });
    };


    const nextLevelXp = getNextLevelXp(stats.level);
    const progressPercent = Math.min(100, (stats.xp / nextLevelXp) * 100);
    const circumference = 2 * Math.PI * 90;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    const donationTasks = tasks.filter(t => t.type === 'donate');
    const recyclingTasks = tasks.filter(t => t.type === 'recycle' || t.type === 'project');
    const pointsTasks = tasks.filter(t => t.type === 'xp');

    const renderTaskList = (list: Task[]) => {
        if (list.length === 0) return <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>No tasks available</div>;
        return (
            <div className={styles.taskList}>
                {list.map(task => {
                    const isCompleted = completedTasks.includes(task.id);
                    const showProgress = task.target && task.target > 1;
                    let currentProgress = 0;
                    switch (task.type) {
                        case 'recycle':
                            currentProgress = stats.recyclingCount;
                            break;
                        case 'donate':
                            currentProgress = stats.donationCount;
                            break;
                        case 'project':
                            currentProgress = stats.projectsCompleted;
                            break;
                        case 'xp':
                            currentProgress = stats.xp;
                            break;
                    }
                    const canClaim =
                        task.type === 'recycle'
                            ? stats.recyclingCount >= (task.target || 0)
                            : task.type === 'donate'
                                ? stats.donationCount >= (task.target || 0)
                                : task.type === 'project'
                                    ? stats.projectsCompleted >= (task.target || 0)
                                    : task.type === 'xp'
                                        ? stats.xp >= (task.target || 0)
                                        : true; // This 'true' case is for 'other' tasks, which are now 'xp'
                    return (
                        <div key={task.id} className={styles.taskItem} style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isCompleted ? 0.6 : 1 }}>
                            <div>
                                <h5 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{task.title}</h5>
                                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{task.description}</p>
                                {showProgress && !isCompleted && (
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                        Progress: {currentProgress} / {task.target || 1}
                                    </div>
                                )}
                                <span style={{ fontSize: '12px', color: '#82AA52', fontWeight: 'bold' }}>{task.rewardType === 'badge' ? '🎖️ Badge Reward' : `+${task.xpReward || 50} XP`}</span>
                            </div>
                            {isCompleted ? (
                                <span style={{ color: '#82AA52', fontWeight: 'bold' }}>Completed ✓</span>
                            ) : (
                                <button onClick={() => canClaim && handleClaimTask(task)} disabled={!canClaim} style={{ background: canClaim ? '#82AA52' : '#ccc', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: canClaim ? 'pointer' : 'not-allowed' }}>
                                    {canClaim ? 'Claim' : 'Locked'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };


    const [showRewardsModal, setShowRewardsModal] = useState(false);
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [rewardActionLoading, setRewardActionLoading] = useState<string | null>(null);

    // Mock Rewards Data
    const BORDERS = [
        { id: 'border_leaf_static', name: 'Nature Guide', cost: 500, type: 'static', preview: '🌿', description: 'A fresh green border for nature lovers.' },
        { id: 'border_water_static', name: 'Ocean Saver', cost: 800, type: 'static', preview: '💧', description: 'Blue as the ocean you save.' },
        { id: 'border_fire_static', name: 'Passion Flame', cost: 1200, type: 'static', preview: '🔥', description: 'For those with a burning passion for change.' },
        { id: 'border_gold_anim', name: 'Golden Eco-Warrior', cost: 2000, type: 'animated', preview: '✨', description: 'Legendary animated border for the elite.' },
    ];

    const handleRedeem = async (reward: typeof BORDERS[0]) => {
        if (!user || rewardActionLoading) return;
        setRewardActionLoading(reward.id);

        try {
            const result = await redeemReward(user.uid, reward.cost, reward.id);
            if (result.success) {
                setStats(prev => ({
                    ...prev,
                    ecoPoints: result.newBalance !== undefined ? result.newBalance : prev.ecoPoints,
                    unlockedBorders: [...(stats.badges || []), reward.id] // Optimistic update (though real sync comes from listener)
                }));
                setSuccessModal({ isOpen: true, title: 'Reward Redeemed!', message: `You have unlocked the ${reward.name} border!` });
            } else {
                setSuccessModal({ isOpen: true, title: 'Redemption Failed', message: result.message || 'Unknown error' });
            }
        } catch (error) {
            console.error(error);
            setSuccessModal({ isOpen: true, title: 'Error', message: 'Something went wrong.' });
        } finally {
            setRewardActionLoading(null);
        }
    };

    const handleEquip = async (borderId: string) => {
        if (!user || rewardActionLoading) return;
        setRewardActionLoading(borderId);

        try {
            const result = await equipBorder(user.uid, borderId);
            if (result.success) {
                // The onValue listener in useEffect should pick this up, but we can optimistically update if needed
                setSuccessModal({ isOpen: true, title: 'Equipped!', message: 'Your new border is active.' });
            } else {
                setSuccessModal({ isOpen: true, title: 'Error', message: 'Failed to equip.' });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRewardActionLoading(null);
        }
    };

    return (
        <ProtectedRoute>
            <div className={styles.pageWrapper}>
                <Header />
                <div className={styles.container}>
                    <Sidebar />
                    <main className={styles.mainContent}>
                        <div className={styles.achievementsHeader}>
                            <h2 style={{ color: '#2e8b57', marginBottom: '10px', fontSize: '18px', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', fontWeight: 700 }}>My Achievements</h2>
                            <p className={styles.subtitle}>Track your eco-friendly progress and accomplishments</p>
                        </div>
                        <div className={styles.achievementsContent}>
                            {/* Level Card */}
                            <div className={styles.levelCard} onClick={() => setShowLevelModal(true)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} title="Click to view Level Rewards">
                                <div className={styles.circularProgress}>
                                    <svg className={styles.progressRing} width="200" height="200">
                                        <circle className={styles.progressRingCircle} stroke="#e0e0e0" strokeWidth="10" fill="transparent" r="90" cx="100" cy="100" />
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
                                        />
                                    </svg>
                                    <div className={styles.circle}>
                                        <div className={styles.circleInner}>
                                            <div className={styles.levelNumber}>{stats.level}</div>
                                            <div className={styles.levelLabel}>LEVEL</div>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.progressText}>{stats.xp}/{nextLevelXp} Eco Points</div>
                                <div className={styles.currentLevel}>Progress to Level {stats.level + 1}</div>
                            </div>
                            {/* Stats Grid */}
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
                                    <div className={styles.statLabel}>Lifetime Eco Points</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statNumber}>{stats.ecoPoints}</div>
                                    <div className={styles.statLabel}>Redeemable Points</div>
                                </div>
                            </div>
                            {/* Tasks Section */}
                            <div className={styles.tasksSection}>
                                <div className={styles.tasksHeader}>
                                    <h3>My Tasks</h3>
                                    <button
                                        className={styles.redeemBtn}
                                        onClick={() => setShowRewardsModal(true)}
                                    >
                                        Redeem Rewards
                                    </button>
                                </div>
                                <p className={styles.tasksSubtitle}>Complete tasks by category to earn more badges and points!</p>
                                <div className={styles.taskCategories}>
                                    <div className={styles.taskCategory}>
                                        <div className={`${styles.categoryHeader} ${expandedCategories['donation'] ? styles.active : ''}`} onClick={() => toggleCategory('donation')}>
                                            <h4>Donation-related Tasks</h4>
                                            <i className={`fas fa-chevron-${expandedCategories['donation'] ? 'up' : 'down'}`} />
                                        </div>
                                        <div className={styles.categoryContent} style={{ display: expandedCategories['donation'] ? 'block' : 'none' }}>
                                            {renderTaskList(donationTasks)}
                                        </div>
                                    </div>
                                    <div className={styles.taskCategory}>
                                        <div className={`${styles.categoryHeader} ${expandedCategories['recycling'] ? styles.active : ''}`} onClick={() => toggleCategory('recycling')}>
                                            <h4>Recycling & Project Tasks</h4>
                                            <i className={`fas fa-chevron-${expandedCategories['recycling'] ? 'up' : 'down'}`} />
                                        </div>
                                        <div className={styles.categoryContent} style={{ display: expandedCategories['recycling'] ? 'block' : 'none' }}>
                                            {renderTaskList(recyclingTasks)}
                                        </div>
                                    </div>
                                    <div className={styles.taskCategory}>
                                        <div className={`${styles.categoryHeader} ${expandedCategories['points'] ? styles.active : ''}`} onClick={() => toggleCategory('points')}>
                                            <h4>Points Status & Milestones</h4>
                                            <i className={`fas fa-chevron-${expandedCategories['points'] ? 'up' : 'down'}`} />
                                        </div>
                                        <div className={styles.categoryContent} style={{ display: expandedCategories['points'] ? 'block' : 'none' }}>
                                            {renderTaskList(pointsTasks)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Sierra Madre Section */}
                            <div className={styles.sierraMadreSection}>
                                <div className={styles.sierraMadreHeader}>
                                    <h3>🏆 Legendary Badge</h3>
                                    <p className={styles.sierraSubtitle}>Complete all donation, recycling and project tasks to unlock the Sierra Madre badge!</p>
                                </div>
                                <div className={`${styles.sierraMadreBadgeContainer} ${!isSierraUnlocked ? styles.locked : ''}`}>
                                    <div className={styles.badgeIconWrapper}>
                                        <div className={`${styles.badgeIcon} ${!isSierraUnlocked ? styles.lockedBadgeIcon : ''}`}>
                                            <Image
                                                src="/sierra_madre_badge.svg"
                                                alt="Sierra Madre Badge"
                                                width={100}
                                                height={100}
                                                style={{ filter: !isSierraUnlocked ? 'grayscale(100%) opacity(0.5)' : 'none' }}
                                            />
                                            {!isSierraUnlocked && <div className={styles.lockOverlay}>🔒</div>}
                                        </div>
                                    </div>
                                    <div className={styles.badgeInfoWrapper}>
                                        <h4 className={styles.badgeTitle}>Sierra Madre</h4>
                                        <p className={styles.badgeDescription}>Complete all Donation and Recycling tasks to unlock this legendary badge</p>
                                        <div className={`${styles.badgeStatus} ${!isSierraUnlocked ? styles.lockedStatus : ''}`} style={{ color: isSierraUnlocked ? '#82AA52' : undefined }}>
                                            {isSierraUnlocked ? (
                                                <><i className="fas fa-check-circle" /> Unlocked</>
                                            ) : (
                                                <><i className="fas fa-lock" /> Locked</>
                                            )}
                                        </div>
                                        {!isSierraUnlocked && (
                                            <div className={styles.badgeProgress}>
                                                <div className={styles.progressBar}>
                                                    <div className={styles.progressFill} style={{ width: `${(completedMainTasksCount / totalMainTasksCount) * 100}%` }} />
                                                </div>
                                                <span className={styles.progressText}>{completedMainTasksCount} / {totalMainTasksCount} Tasks</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Feedback Button */}
                        <div className={styles.feedbackBtn} onClick={() => setIsFeedbackModalOpen(true)}>💬</div>

                        {/* Rewards Modal */}
                        {showRewardsModal && (
                            <div className={styles.rewardsModal}>
                                <div className={styles.rewardsContent}>
                                    <div className={styles.rewardsHeader}>
                                        <h3>Redeem Rewards</h3>
                                        <button className={styles.closeBtn} onClick={() => setShowRewardsModal(false)}>×</button>
                                    </div>
                                    <div style={{ marginBottom: '20px', padding: '10px', background: '#e8f5e9', borderRadius: '8px', color: '#2e8b57', fontWeight: 'bold' }}>
                                        Current Redeemable Points: {stats.ecoPoints}
                                    </div>
                                    <div className={styles.rewardsGrid}>
                                        {BORDERS.map(border => {
                                            const isUnlocked = (stats.unlockedBorders || []).includes(border.id);
                                            const isEquipped = stats.equippedBorder === border.id;
                                            const canAfford = stats.ecoPoints >= border.cost;

                                            return (
                                                <div key={border.id} className={styles.rewardItem}>
                                                    <div className={`${styles.borderPreview} ${styles[border.id]}`}>
                                                        {border.preview}
                                                    </div>
                                                    <div className={styles.rewardInfo}>
                                                        <h4>{border.name}</h4>
                                                        <p className={styles.rewardCost}>{border.cost} Eco Points</p>
                                                    </div>
                                                    {isUnlocked ? (
                                                        isEquipped ? (
                                                            <button className={`${styles.actionBtn} ${styles.equippedBtn}`} disabled>Equipped</button>
                                                        ) : (
                                                            <button
                                                                className={`${styles.actionBtn} ${styles.equipActionBtn}`}
                                                                onClick={() => handleEquip(border.id)}
                                                                disabled={!!rewardActionLoading}
                                                            >
                                                                {rewardActionLoading === border.id ? 'Equipping...' : 'Equip'}
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.redeemActionBtn}`}
                                                            onClick={() => handleRedeem(border)}
                                                            disabled={!canAfford || !!rewardActionLoading}
                                                        >
                                                            {rewardActionLoading === border.id ? 'Redeeming...' : 'Redeem'}
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Feedback Modal */}
                        {isFeedbackModalOpen && (
                            <div className={styles.feedbackModal} style={{ display: 'flex' }}>
                                <div className={styles.feedbackContent}>
                                    <span className={styles.feedbackCloseBtn} onClick={() => setIsFeedbackModalOpen(false)}>×</span>
                                    {!showThankYou ? (
                                        <form className={styles.feedbackForm} onSubmit={handleFeedbackSubmit}>
                                            <h3>Share Your Feedback</h3>
                                            <div className={styles.emojiRating}>
                                                {[1, 2, 3, 4, 5].map(r => (
                                                    <div key={r} className={`${styles.emojiOption} ${feedbackRating === r ? styles.selected : ''}`} onClick={() => setFeedbackRating(r)}>
                                                        <span className={styles.emoji}>{r === 5 ? '😍' : r === 4 ? '🙂' : r === 3 ? '😐' : r === 2 ? '😕' : '😞'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {feedbackError.rating && <div className={styles.errorMessage}>Please select a rating</div>}
                                            <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                                            <textarea placeholder="Your feedback helps us make EcoWaste better..." value={feedbackText} onChange={e => { setFeedbackText(e.target.value); setFeedbackError(prev => ({ ...prev, text: false })); }} />
                                            {feedbackError.text && <div className={styles.errorMessage}>Please provide your feedback</div>}
                                            <button type="submit" className={styles.feedbackSubmitBtn} disabled={isFeedbackSubmitting}>
                                                {isFeedbackSubmitting ? (<><span>Submitting...</span><div className={styles.spinner} /></>) : 'Submit'}
                                            </button>
                                        </form>
                                    ) : (
                                        <div className={styles.thankYouMessage}>
                                            <h3>Thank You!</h3>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Success Modal */}
                        {successModal.isOpen && (
                            <div className={styles.successModalOverlay}>
                                <div className={styles.successModalContent}>
                                    <div className={styles.successIcon}>🎉</div>
                                    <h3>{successModal.title}</h3>
                                    <p>{successModal.message}</p>
                                    <button
                                        className={styles.successCloseBtn}
                                        onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
                                    >
                                        Awesome!
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Level Rewards Modal */}
                        {showLevelModal && (
                            <div className={styles.rewardsModal}>
                                <div className={styles.rewardsContent} style={{ maxWidth: '600px' }}>
                                    <div className={styles.rewardsHeader}>
                                        <h3>Level Progression Rewards</h3>
                                        <button className={styles.closeBtn} onClick={() => setShowLevelModal(false)}>×</button>
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {AVATAR_REWARDS.map((reward) => {
                                                const isUnlocked = stats.level >= reward.level;
                                                return (
                                                    <div key={reward.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '15px',
                                                        padding: '15px',
                                                        background: isUnlocked ? '#e8f5e9' : '#f5f5f5',
                                                        borderRadius: '10px',
                                                        border: isUnlocked ? '1px solid #4caf50' : '1px solid #ddd',
                                                        opacity: isUnlocked ? 1 : 0.7
                                                    }}>
                                                        <div style={{
                                                            fontSize: '30px',
                                                            width: '60px',
                                                            height: '60px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'white',
                                                            borderRadius: '50%',
                                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                                        }}>
                                                            {reward.preview}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <h4 style={{ margin: 0, color: '#333' }}>Level {reward.level}: {reward.name}</h4>
                                                                {!isUnlocked && <span style={{ fontSize: '12px', background: '#ccc', padding: '2px 8px', borderRadius: '10px', color: '#555' }}>Locked</span>}
                                                                {isUnlocked && <span style={{ fontSize: '12px', background: '#4caf50', padding: '2px 8px', borderRadius: '10px', color: 'white' }}>Unlocked</span>}
                                                            </div>
                                                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>{reward.description}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>

                </div>
            </div>
        </ProtectedRoute>
    );
}
