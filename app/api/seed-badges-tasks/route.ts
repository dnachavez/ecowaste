import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin SDK
let adminApp = getApps()[0];
if (!adminApp) {
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const allBadges = [
  { key: 'recycling_pro', name: 'Recycling Pro', description: 'Recycled 10+ items', icon: '♻️' },
  { key: 'donation_hero', name: 'Donation Hero', description: 'Donated 5+ items', icon: '💚' },
  { key: 'project_master', name: 'Project Master', description: 'Completed 3+ projects', icon: '🏆' },
  { key: 'ecowaste_beginner', name: 'EcoWaste Beginner', description: 'Completed your first eco activity', icon: '🌱' },
  { key: 'rising_donor', name: 'Rising Donor', description: 'Completed your first donation', icon: '💚' },
  { key: 'eco_star', name: 'Eco Star', description: 'Completed a recycling project', icon: '⭐' },
  { key: 'donation_starter', name: 'Donation Starter', description: 'Donated 1 item', icon: '💝' },
  { key: 'donation_champion', name: 'Donation Champion', description: 'Donated 15+ items', icon: '🎁' },
  { key: 'generous_giver', name: 'Generous Giver', description: 'Completed 20 donations', icon: '💚' },
  { key: 'charity_champion', name: 'Charity Champion', description: 'Completed 30 donations', icon: '👑' },
  { key: 'recycling_starter', name: 'Recycling Starter', description: 'Recycled 1 item', icon: '♻️' },
  { key: 'recycling_expert', name: 'Recycling Expert', description: 'Recycled 15+ items', icon: '♻️' },
  { key: 'zero_waste_hero', name: 'Zero Waste Hero', description: 'Created 25 recycling projects', icon: '🏗️' },
  { key: 'earth_saver', name: 'Earth Saver', description: 'Created 30 recycling projects', icon: '🌍' },
  { key: 'eco_pro', name: 'Eco Pro', description: 'Completed 20 recycling projects', icon: '🌿' },
  { key: 'ecolegend', name: 'EcoLegend', description: 'Completed 30 recycling projects', icon: '🏆' },
  { key: 'ecowaste_rookie', name: 'EcoWaste Rookie', description: 'Earned 50+ points', icon: '⭐' },
  { key: 'ecowaste_master', name: 'EcoWaste Master', description: 'Earned 100+ points', icon: '🐻' },
  { key: 'ecowaste_warrior', name: 'EcoWaste Warrior', description: 'Earned 200+ points', icon: '🏆' },
  { key: 'ecowaste_legend', name: 'EcoWaste Legend', description: 'Earned 500+ points', icon: '👑' },
  { key: 'sierra_madre', name: 'Sierra Madre', description: 'SECRET: Complete all achievement tasks', icon: '👑' }
];

const allTasks = [
  { title: 'Recycle 10 Items', description: 'Recycle 10 items to earn Recycling Pro badge', type: 'recycle', target: 10, rewardType: 'badge', badgeKey: 'recycling_pro' },
  { title: 'Donate 5 Items', description: 'Donate 5 items to earn Donation Hero badge', type: 'donate', target: 5, rewardType: 'badge', badgeKey: 'donation_hero' },
  { title: 'Complete 3 Projects', description: 'Finish 3 projects to earn Project Master badge', type: 'other', target: 3, rewardType: 'badge', badgeKey: 'project_master' },
  { title: 'First Eco Activity', description: 'Complete your first eco activity to earn EcoWaste Beginner badge', type: 'other', target: 1, rewardType: 'badge', badgeKey: 'ecowaste_beginner' },
  { title: 'First Donation', description: 'Complete your first donation to earn Rising Donor badge', type: 'donate', target: 1, rewardType: 'badge', badgeKey: 'rising_donor' },
  { title: 'Complete 1 Recycling Project', description: 'Complete a recycling project to earn Eco Star badge', type: 'other', target: 1, rewardType: 'badge', badgeKey: 'eco_star' },
  { title: 'Donate 1 Item', description: 'Donate 1 item to earn Donation Starter badge', type: 'donate', target: 1, rewardType: 'badge', badgeKey: 'donation_starter' },
  { title: 'Donate 15 Items', description: 'Donate 15 items to earn Donation Champion badge', type: 'donate', target: 15, rewardType: 'badge', badgeKey: 'donation_champion' },
  { title: 'Complete 20 Donations', description: 'Complete 20 donations to earn Generous Giver badge', type: 'donate', target: 20, rewardType: 'badge', badgeKey: 'generous_giver' },
  { title: 'Complete 30 Donations', description: 'Complete 30 donations to earn Charity Champion badge', type: 'donate', target: 30, rewardType: 'badge', badgeKey: 'charity_champion' },
  { title: 'Recycle 1 Item', description: 'Recycle 1 item to earn Recycling Starter badge', type: 'recycle', target: 1, rewardType: 'badge', badgeKey: 'recycling_starter' },
  { title: 'Recycle 15 Items', description: 'Recycle 15 items to earn Recycling Expert badge', type: 'recycle', target: 15, rewardType: 'badge', badgeKey: 'recycling_expert' },
  { title: 'Create 25 Recycling Projects', description: 'Create 25 recycling projects to earn Zero Waste Hero badge', type: 'other', target: 25, rewardType: 'badge', badgeKey: 'zero_waste_hero' },
  { title: 'Create 30 Recycling Projects', description: 'Create 30 recycling projects to earn Earth Saver badge', type: 'other', target: 30, rewardType: 'badge', badgeKey: 'earth_saver' },
  { title: 'Complete 20 Recycling Projects', description: 'Complete 20 recycling projects to earn Eco Pro badge', type: 'other', target: 20, rewardType: 'badge', badgeKey: 'eco_pro' },
  { title: 'Complete 30 Recycling Projects', description: 'Complete 30 recycling projects to earn EcoLegend badge', type: 'other', target: 30, rewardType: 'badge', badgeKey: 'ecolegend' },
  { title: 'Earn 50 XP', description: 'Earn 50 XP to earn EcoWaste Rookie badge', type: 'other', target: 50, rewardType: 'badge', badgeKey: 'ecowaste_rookie' },
  { title: 'Earn 100 XP', description: 'Earn 100 XP to earn EcoWaste Master badge', type: 'other', target: 100, rewardType: 'badge', badgeKey: 'ecowaste_master' },
  { title: 'Earn 200 XP', description: 'Earn 200 XP to earn EcoWaste Warrior badge', type: 'other', target: 200, rewardType: 'badge', badgeKey: 'ecowaste_warrior' },
  { title: 'Earn 500 XP', description: 'Earn 500 XP to earn EcoWaste Legend badge', type: 'other', target: 500, rewardType: 'badge', badgeKey: 'ecowaste_legend' },
  { title: 'Complete All Tasks', description: 'Complete all achievement tasks to unlock SECRET badge: Sierra Madre', type: 'other', target: 20, rewardType: 'badge', badgeKey: 'sierra_madre' }
];

export async function POST(request: NextRequest) {
  try {
    if (!adminApp) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const db = getDatabase(adminApp);

    // Read existing badges
    const badgesSnapshot = await db.ref('badges').get();
    const existingBadges = badgesSnapshot.val() || {};
    const badgeIdMap: Record<string, string> = {};

    // Create badges (skip duplicates by name)
    for (const b of allBadges) {
      const foundKey = Object.keys(existingBadges).find(
        (k) => existingBadges[k].name === b.name
      );
      if (foundKey) {
        badgeIdMap[b.key] = foundKey;
        continue;
      }
      const newBadgeRef = db.ref('badges').push();
      await newBadgeRef.set({
        name: b.name,
        description: b.description,
        icon: b.icon,
        createdAt: Date.now()
      });
      badgeIdMap[b.key] = newBadgeRef.key || '';
    }

    // Read existing tasks
    const tasksSnapshot = await db.ref('tasks').get();
    const existingTasks = tasksSnapshot.val() || {};
    const existingTitles = new Set(
      Object.values(existingTasks).map((t: any) => t.title)
    );

    // Create tasks (skip duplicates by title)
    for (const t of allTasks) {
      if (existingTitles.has(t.title)) continue;

      const taskData: any = {
        title: t.title,
        description: t.description,
        type: t.type,
        target: t.target,
        rewardType: t.rewardType,
        createdAt: Date.now()
      };

      const badgeId = badgeIdMap[t.badgeKey];
      if (badgeId) {
        taskData.badgeId = badgeId;
      }

      await db.ref('tasks').push().set(taskData);
    }

    return NextResponse.json({
      success: true,
      message: 'All 21 badges and their tasks have been created!'
    });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to seed badges/tasks' },
      { status: 500 }
    );
  }
}
