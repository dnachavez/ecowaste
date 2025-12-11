import { db } from './firebase';
import { ref, get, update, child } from 'firebase/database';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Path to icon
  condition: string;
}

export const BADGES: Record<string, Badge> = {
  SIERRA_MADRE: {
    id: 'sierra_madre',
    name: 'Sierra Madre',
    description: 'Reached Level 5! An elite eco-guardian.',
    icon: '/sierra_madre_badge.svg',
    condition: 'Reach Level 5'
  },
  ECO_WARRIOR: {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Recycled 10+ items.',
    icon: '/badges/eco_warrior.svg', // We might need to create this or use a placeholder
    condition: 'Recycle 10 items'
  },
  GENEROUS_SOUL: {
    id: 'generous_soul',
    name: 'Generous Soul',
    description: 'Donated 5+ items.',
    icon: '/badges/generous_soul.svg', // We might need to create this or use a placeholder
    condition: 'Donate 5 items'
  }
};

export interface UserStats {
  xp: number;
  level: number;
  recyclingCount: number;
  donationCount: number;
  badges: string[]; // Array of badge IDs
}

export const LEVEL_CAP = 50;
export const XP_PER_LEVEL_BASE = 100;

export const calculateLevel = (xp: number): number => {
  // Simple linear progression for now: Level = 1 + floor(xp / 100)
  // Or maybe a bit more complex: 
  // 0-100: Lvl 1
  // 101-250: Lvl 2 (150 diff)
  // etc.
  
  // Let's stick to simple: Level N requires (N-1) * 100 XP total?
  // No, let's say Level = 1 + floor(xp / 100).
  return 1 + Math.floor(xp / 100);
};

export const getNextLevelXp = (level: number): number => {
  return level * 100;
};

export const awardXP = async (userId: string, amount: number) => {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) return;
  
  const userData = snapshot.val();
  const currentXP = userData.xp || 0;
  const currentLevel = userData.level || 1;
  
  const newXP = currentXP + amount;
  const calculatedLevel = calculateLevel(newXP);
  
  const updates: Record<string, number> = {
    xp: newXP
  };

  if (calculatedLevel > currentLevel) {
    updates.level = calculatedLevel;
    // Check for level-based badges
    if (calculatedLevel >= 5) {
       await checkAndAwardBadge(userId, 'SIERRA_MADRE', userData.badges || []);
    }
  }

  await update(userRef, updates);
  return { newXP, newLevel: calculatedLevel, leveledUp: calculatedLevel > currentLevel };
};

export const incrementAction = async (userId: string, action: 'recycle' | 'donate' | 'project', count: number = 1, customXp?: number) => {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) return;
  
  const userData = snapshot.val();
  
  let currentCount = 0;
  let field = '';
  
  if (action === 'recycle') {
      currentCount = userData.recyclingCount || 0;
      field = 'recyclingCount';
  } else if (action === 'donate') {
      currentCount = userData.donationCount || 0;
      field = 'donationCount';
  } else if (action === 'project') {
      currentCount = userData.projectsCompleted || 0;
      field = 'projectsCompleted';
  }
  
  const newCount = currentCount + count;
  
  const updates: Record<string, number> = {
    [field]: newCount
  };

  // Award XP
  if (action !== 'project' || customXp !== undefined) {
      let xpReward = 0;
      if (customXp !== undefined) {
          xpReward = customXp;
      } else {
          xpReward = action === 'recycle' ? 10 * count : 20 * count;
      }
      
      updates.xp = (userData.xp || 0) + xpReward;
      
      const currentLevel = userData.level || 1;
      const newLevel = calculateLevel(updates.xp);
      if (newLevel > currentLevel) {
          updates.level = newLevel;
      }
  }

  await update(userRef, updates);

  // Check for badges
  const currentBadges = userData.badges || [];
  
  if (action === 'recycle' && newCount >= 10) {
    await checkAndAwardBadge(userId, 'ECO_WARRIOR', currentBadges);
  }
  
  if (action === 'donate' && newCount >= 5) {
    await checkAndAwardBadge(userId, 'GENEROUS_SOUL', currentBadges);
  }
  
  if (action === 'project' && newCount >= 3) {
      // Assuming we might have a project badge later
      // await checkAndAwardBadge(userId, 'PROJECT_MASTER', currentBadges);
  }

  // Also check level badge if level changed (only relevant if we updated XP/level above, or generally check)
  // Since we might not update level for project here (as we might call awardXP separately), 
  // we should just check the current level from DB if we didn't update it, or use the new one.
  // But wait, if we didn't update level, we can't check it easily without re-fetching or using logic.
  // Safe to just check if we have a new level from above logic.
  if (updates.level && updates.level >= 5) {
      await checkAndAwardBadge(userId, 'SIERRA_MADRE', currentBadges);
  }
};

const checkAndAwardBadge = async (userId: string, badgeId: string, currentBadges: string[]) => {
  if (!currentBadges.includes(badgeId)) {
    const newBadges = [...currentBadges, badgeId];
    await update(ref(db, `users/${userId}`), {
      badges: newBadges
    });
    // Ideally trigger a notification here
  }
};
