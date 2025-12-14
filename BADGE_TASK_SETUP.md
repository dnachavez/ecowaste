# Badge and Task Setup Guide

## Overview
This guide shows how to set up badges and their corresponding tasks in Firebase for the EcoWaste app.

## Badges to Create

Create these badges in Firebase at `badges/`:

```json
{
  "sierra_madre": {
    "name": "Sierra Madre",
    "description": "Reached Level 5 - You've climbed the eco mountain!",
    "icon": "👑",
    "createdAt": 1702550000000
  },
  "eco_warrior": {
    "name": "Eco Warrior",
    "description": "Recycled 10+ items - You're a recycling champion!",
    "icon": "♻️",
    "createdAt": 1702550000000
  },
  "generous_soul": {
    "name": "Generous Soul",
    "description": "Donated 5+ items - Your generosity knows no bounds!",
    "icon": "💚",
    "createdAt": 1702550000000
  },
  "project_master": {
    "name": "Project Master",
    "description": "Completed 3+ projects - A true eco builder!",
    "icon": "🏆",
    "createdAt": 1702550000000
  },
  "eco_star": {
    "name": "Eco Star",
    "description": "Earned 100 XP - You're shining bright!",
    "icon": "⭐",
    "createdAt": 1702550000000
  },
  "donation_hero": {
    "name": "Donation Hero",
    "description": "Donated 15+ items - A true hero of giving!",
    "icon": "🎁",
    "createdAt": 1702550000000
  },
  "recycling_pro": {
    "name": "Recycling Pro",
    "description": "Recycled 25+ items - You're a recycling expert!",
    "icon": "🌍",
    "createdAt": 1702550000000
  }
}
```

## Tasks to Create

Create these tasks in Firebase at `tasks/` with badge rewards:

### Task 1: Recycle 10 Items
```json
{
  "title": "Recycle 10 Items",
  "description": "Recycle 10 items to earn the Eco Warrior badge",
  "type": "recycle",
  "target": 10,
  "rewardType": "badge",
  "badgeId": "eco_warrior",
  "createdAt": 1702550000000
}
```

### Task 2: Donate 5 Items
```json
{
  "title": "Donate 5 Items",
  "description": "Donate 5 items to earn the Generous Soul badge",
  "type": "donate",
  "target": 5,
  "rewardType": "badge",
  "badgeId": "generous_soul",
  "createdAt": 1702550000000
}
```

### Task 3: Complete 3 Projects
```json
{
  "title": "Complete 3 Projects",
  "description": "Complete 3 recycling projects to earn the Project Master badge",
  "type": "other",
  "target": 3,
  "rewardType": "badge",
  "badgeId": "project_master",
  "createdAt": 1702550000000
}
```

### Task 4: Earn 100 XP
```json
{
  "title": "Earn 100 XP",
  "description": "Earn 100 XP to become an Eco Star",
  "type": "other",
  "target": 100,
  "rewardType": "badge",
  "badgeId": "eco_star",
  "createdAt": 1702550000000
}
```

### Task 5: Donate 15 Items
```json
{
  "title": "Donate 15 Items",
  "description": "Donate 15 items to earn the Donation Hero badge",
  "type": "donate",
  "target": 15,
  "rewardType": "badge",
  "badgeId": "donation_hero",
  "createdAt": 1702550000000
}
```

### Task 6: Recycle 25 Items
```json
{
  "title": "Recycle 25 Items",
  "description": "Recycle 25 items to earn the Recycling Pro badge",
  "type": "recycle",
  "target": 25,
  "rewardType": "badge",
  "badgeId": "recycling_pro",
  "createdAt": 1702550000000
}
```

## How to Add These to Firebase

### Option 1: Using Firebase Console
1. Go to Firebase Console → Realtime Database
2. Click on "badges" node (create if doesn't exist)
3. Add each badge with the structure above
4. Repeat for "tasks" node

### Option 2: Using Admin CLI (if available)
```bash
firebase database:set /badges --data '<paste JSON here>'
firebase database:set /tasks --data '<paste JSON here>'
```

## Feature Summary

### For Users:
- ✅ Only see **unlocked** badges in their profile (locked badges hidden)
- ✅ **Equip** a badge to display beside their name
- ✅ Equipped badge shows across the app where their username appears
- ✅ Click "Equip Badge" button to toggle equipping

### For Admins:
- ✅ **Create Tasks** with either XP or Badge rewards
- ✅ **Edit Tasks** to change reward type and amount/badge
- ✅ **Manage Tasks** view shows reward info (badge name or XP amount)
- ✅ Dynamically select from existing badges when editing

## User Badge Unlocking Logic

Badges unlock automatically when users reach:
- **Sierra Madre**: Reach Level 5
- **Eco Warrior**: Recycle 10+ items
- **Generous Soul**: Donate 5+ items
- **Project Master**: Complete 3+ projects
- **Eco Star**: Earn 100+ XP
- **Donation Hero**: Donate 15+ items (task-based)
- **Recycling Pro**: Recycle 25+ items (task-based)

Completion is tracked automatically via task system and user stats.
