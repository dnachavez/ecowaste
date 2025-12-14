# EcoWaste Admin Setup Guide - Badges & Tasks

## Overview

This guide explains how to set up badges and tasks in the EcoWaste admin panel. Badges are rewards that users can earn by completing tasks, and they can equip one badge to display beside their username.

## Creating Badges

### Method 1: Create Badge While Creating/Editing a Task (Recommended)

1. Navigate to **Admin → Create Task** or **Admin → Manage Tasks → Edit**
2. Select "Badge" as the Reward Type
3. Click **"+ Create New Badge"** button
4. Fill in:
   - **Badge Name**: e.g., "Eco Warrior"
   - **Badge Description**: e.g., "Complete 5 recycling tasks"
   - **Badge Icon**: Select from 14 emoji options (⭐ 🏆 🎖️ 🥇 🥈 🥉 💚 ♻️ 🌱 🌍 👑 ⚡ 🔥 🎯)
5. Click **"Create Badge"**
6. The badge is now available to assign to the current task

### Method 2: Create Badge in Firebase Console (Advanced)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your EcoWaste project
3. Navigate to **Realtime Database → badges**
4. Click **"+" to add new key**
5. Enter a unique badge ID (e.g., `eco_warrior`)
6. Add the following JSON structure:

```json
{
  "name": "Eco Warrior",
  "description": "Recycled 10+ items",
  "icon": "♻️",
  "createdAt": 1702569600000
}
```

## Creating Tasks

### Navigation
Go to **Admin → Create Task** or **Admin → Manage Tasks → Edit**

### Required Fields

- **Title**: Name of the task (e.g., "Recycle 5 Plastic Bottles")
- **Description**: What the user needs to do
- **Type**: Select from dropdown (Recycle, Donate, Other)
- **Target Amount**: How many items/actions required
- **Reward Type**: 
  - **XP Points**: Give users experience points
  - **Badge**: Award a badge (XP not given with badges)

### XP Reward Tasks

When "XP Points" is selected:
1. Enter the **XP Reward Amount** (e.g., 50 XP)
2. Click **Create Task** or **Save Changes**

Example:
- Task: "Recycle 5 Plastic Bottles"
- Type: Recycle
- Target: 5
- Reward: 50 XP
- Users complete this to earn 50 XP

### Badge Reward Tasks

When "Badge" is selected:
1. Either **select an existing badge** from the dropdown
2. Or click **"+ Create New Badge"** to create a new one
3. Click **Create Task** or **Save Changes**

Example:
- Task: "Become an Eco Warrior"
- Type: Recycle
- Target: 10
- Reward: Badge "Eco Warrior" (♻️)
- Users who complete this earn the Eco Warrior badge

## Viewing Tasks and Badges

### User View (Achievements Page)
1. Users see all active tasks grouped by type
2. They can claim completed tasks
3. Task rewards show as "🎖️ Badge Reward" or "+50 XP"

### Admin View (Manage Tasks)
1. See all created tasks in a scrollable table
2. See reward type (XP amount or Badge name)
3. Edit or delete tasks using action buttons

## Special: Secret Achievement - Sierra Madre

### How It Works
- **Hidden**: Does not appear in user profiles until unlocked
- **Unlock Condition**: User must complete **ALL** available tasks
- **Reward**: Automatic badge award + notification sent to user
- **Display**: Shows in Achievements page with secret badge section when unlocked

### Admin Setup
No setup needed - the system automatically detects when all tasks are complete and awards the badge via notification.

## Badge Visibility Rules

### In User Profile
- **Visible**: Only unlocked badges are shown
- **Secret**: Sierra Madre is hidden until earned
- **Equippable**: Users can click "Equip Badge" to display it beside their username

### In Header
- **Equipped Badge Display**: Shows the equipped badge icon next to username (e.g., "👑 John Doe")
- **Real-time**: Updates across all pages when user equips/unequips

### In Achievements Page
- **All Tasks**: Visible to all users
- **Secret Achievement**: Locked display until completed, then shows with notification

## Task Completion Logic

### Recycling Tasks
- **Action**: Users log recyclables
- **Completion**: When they reach the target amount
- **Reward**: XP or Badge assigned

### Donation Tasks
- **Action**: Users donate through donation system
- **Completion**: When they reach target donations
- **Requirement**: Must verify donation count before claiming
- **Reward**: XP or Badge assigned

### Other Tasks
- **Custom**: Any other type of achievement
- **Completion**: Admin defines criteria
- **Reward**: XP or Badge assigned

## Tips for Admins

1. **Start Simple**: Create basic XP tasks first (5-10 XP each)
2. **Progressive Difficulty**: Increase XP rewards and targets over time
3. **Badge Variety**: Create diverse badges for different user types:
   - Recyclers: "Eco Warrior"
   - Donors: "Generous Soul"
   - Levelers: "Level Masters"
   - All-rounders: "Project Master"
4. **Seasonal Tasks**: Create limited-time tasks for events
5. **Balance**: Don't make targets too high (10-50 items is reasonable)
6. **Clear Descriptions**: Help users understand what they need to do

## Troubleshooting

### Badges Not Showing in Dropdown
- **Problem**: Created badges aren't appearing when creating a task
- **Solution**: Refresh the page - badges load once when page starts

### Tasks Not Appearing in Achievements
- **Problem**: Created tasks don't show for users
- **Solution**: Check Firebase - verify task has `type`, `target`, `rewardType` fields

### Badge Not Awarding
- **Problem**: User completed task but didn't get badge
- **Solution**: 
  - Verify `rewardType` is set to 'badge' (not 'xp')
  - Check `badgeId` field matches badge ID in badges collection
  - Ensure task appears in Achievements page

### Secret Badge Not Unlocking
- **Problem**: User completed all tasks but didn't get notification
- **Solution**:
  - Verify all tasks have `rewardType` field
  - Check user's `completedTasks` array in Firebase matches total tasks
  - Refresh user's browser to sync completion status

## Database Schema Reference

### Badges Structure
```
badges/
├── eco_warrior/
│   ├── name: "Eco Warrior"
│   ├── description: "Recycled 10+ items"
│   ├── icon: "♻️"
│   └── createdAt: 1702569600000
└── generous_soul/
    ├── name: "Generous Soul"
    ├── description: "Donated 5+ items"
    ├── icon: "💚"
    └── createdAt: 1702569600000
```

### Tasks Structure
```
tasks/
├── task1/
│   ├── title: "Recycle 5 Plastic Bottles"
│   ├── description: "Recycle 5 plastic bottles..."
│   ├── type: "recycle"
│   ├── target: 5
│   ├── rewardType: "xp"
│   ├── xpReward: 50
│   └── createdAt: 1702569600000
└── task2/
    ├── title: "Become an Eco Warrior"
    ├── description: "Complete 10 recycling tasks..."
    ├── type: "recycle"
    ├── target: 10
    ├── rewardType: "badge"
    ├── badgeId: "eco_warrior"
    └── createdAt: 1702569600000
```

### User Badge Data Structure
```
users/{uid}/
├── badges: ["eco_warrior", "generous_soul", "sierra_madre"]
├── equippedBadge: "eco_warrior"
├── completedTasks: ["task1", "task2"]
└── xp: 500
```

## Contact & Support

For questions or issues, refer to the main application documentation or contact the development team.
