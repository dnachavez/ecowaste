
import { db } from './firebase';
import { ref, set, push, remove } from 'firebase/database';

export const seedBadges = async () => {
    const tasksRef = ref(db, 'tasks');

    // Clear existing tasks matches specific logic if needed, but for now we'll overwrite or just clear all
    await remove(tasksRef);

    const badges = [
        // --- Donation Tasks ---
        {
            title: "Donation Starter",
            description: "Donate 1 item",
            type: "donate",
            target: 1,
            xpReward: 50,
            rewardType: "badge",
            badgeId: "donation_starter",
            icon: "fas fa-hand-holding-heart" // Placeholder for UI mapping
        },
        {
            title: "Rising Donor",
            description: "Complete your first donation",
            type: "donate",
            target: 1,
            xpReward: 50,
            rewardType: "badge",
            badgeId: "rising_donor"
        },
        {
            title: "Donation Hero",
            description: "Donate 5+ items",
            type: "donate",
            target: 5,
            xpReward: 100,
            rewardType: "badge",
            badgeId: "donation_hero"
        },
        {
            title: "Donation Champion",
            description: "Donate 15+ items",
            type: "donate",
            target: 15,
            xpReward: 200,
            rewardType: "badge",
            badgeId: "donation_champion"
        },
        {
            title: "Generous Giver",
            description: "Complete 20 donations",
            type: "donate",
            target: 20,
            xpReward: 300,
            rewardType: "badge",
            badgeId: "generous_giver"
        },
        {
            title: "Charity Champion",
            description: "Complete 30 donations",
            type: "donate",
            target: 30,
            xpReward: 500,
            rewardType: "badge",
            badgeId: "charity_champion"
        },

        // --- Recycling Tasks (Items) ---
        {
            title: "Recycling Starter",
            description: "Recycle 1 item",
            type: "recycle",
            target: 1,
            xpReward: 50,
            rewardType: "badge",
            badgeId: "recycling_starter"
        },
        {
            title: "Recycling Pro",
            description: "Recycle 10 solid wastes",
            type: "recycle",
            target: 10,
            xpReward: 150,
            rewardType: "badge",
            badgeId: "recycling_pro"
        },
        {
            title: "Recycling Expert",
            description: "Recycle 15+ items",
            type: "recycle",
            target: 15,
            xpReward: 250,
            rewardType: "badge",
            badgeId: "recycling_expert"
        },

        // --- Project Tasks ---
        {
            title: "Eco Star",
            description: "Complete a recycling project",
            type: "project",
            target: 1,
            xpReward: 100,
            rewardType: "badge",
            badgeId: "eco_star"
        },
        {
            title: "Project Master",
            description: "Complete 3+ projects",
            type: "project",
            target: 3,
            xpReward: 200,
            rewardType: "badge",
            badgeId: "project_master"
        },
        {
            title: "Eco Pro",
            description: "Complete 20 recycling projects",
            type: "project",
            target: 20,
            xpReward: 400,
            rewardType: "badge",
            badgeId: "eco_pro"
        },
        {
            title: "Zero Waste Hero",
            description: "Create 25 recycling projects",
            type: "project",
            target: 25,
            xpReward: 500,
            rewardType: "badge",
            badgeId: "zero_waste_hero"
        },
        {
            title: "Earth Saver",
            description: "Create 30 recycling projects",
            type: "project",
            target: 30,
            xpReward: 600,
            rewardType: "badge",
            badgeId: "earth_saver"
        },
        {
            title: "EcoLegend",
            description: "Complete 30 recycling projects",
            type: "project",
            target: 30,
            xpReward: 600,
            rewardType: "badge",
            badgeId: "eco_legend"
        },

        // --- Other Tasks (Points/XP based) ---
        {
            title: "EcoWaste Rookie",
            description: "Earn 50+ points",
            type: "xp", // New type for XP checks
            target: 50,
            xpReward: 0, // Badge only? Or bonus XP?
            rewardType: "badge",
            badgeId: "ecowaste_rookie"
        },
        {
            title: "EcoWaste Master",
            description: "Earn 100+ points",
            type: "xp",
            target: 100,
            rewardType: "badge",
            badgeId: "ecowaste_master"
        },
        {
            title: "EcoWaste Warrior",
            description: "Earn 200+ points",
            type: "xp",
            target: 200,
            rewardType: "badge",
            badgeId: "ecowaste_warrior"
        },
        {
            title: "EcoWaste Legend",
            description: "Earn 500+ points",
            type: "xp",
            target: 500,
            rewardType: "badge",
            badgeId: "ecowaste_legend"
        },
        {
            title: "EcoWaste Beginner",
            description: "Complete your first eco activity",
            type: "other",
            target: 1,
            rewardType: "badge",
            badgeId: "ecowaste_beginner"
        }
    ];

    for (const badge of badges) {
        await push(tasksRef, badge);
    }

    return "Tasks seeded successfully!";
};
