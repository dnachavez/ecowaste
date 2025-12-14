# EcoWaste Badges & Tasks System - Visual Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ECOWASTE APP                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ADMIN PANEL                          USER DASHBOARD         │
│  ├─ Create Task ◄──────────────────► Achievements Page     │
│  │  ├─ Task Title                      ├─ My Tasks           │
│  │  ├─ Reward Type:                    │  ├─ Donation      │
│  │  │  ├─ XP Points (50, 100, etc)    │  ├─ Recycling     │
│  │  │  └─ Badge (with creation)       │  └─ Other         │
│  │  └─ Create Badge in-place           ├─ Secret Badge     │
│  │     ├─ Name                         └─ Profile Link     │
│  │     ├─ Description                                       │
│  │     └─ Icon (14 emoji options)      USER PROFILE         │
│  │                                      ├─ My Badges        │
│  └─ Manage Tasks                       │  ├─ Show Unlocked │
│     ├─ View all tasks                  │  └─ Equip Badge   │
│     ├─ Scrollable table                ├─ Statistics       │
│     ├─ Edit any task                   └─ Header Display   │
│     └─ Delete tasks                       └─ Badge Icon    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
              │                              │
              └──────────────────────────────┘
                          ▼
                    FIREBASE DB
                    ├─ tasks/
                    │  ├─ task1 {title, type, rewardType, ...}
                    │  └─ task2 {title, type, badgeId, ...}
                    ├─ badges/
                    │  ├─ eco_warrior {name, icon, ...}
                    │  └─ sierra_madre {name, icon, ...}
                    └─ users/{uid}/
                       ├─ badges: []
                       ├─ equippedBadge
                       ├─ completedTasks: []
                       └─ xp
```

---

## Task Flow Diagram

```
┌─────────────────┐
│   Admin Panel   │
│  Create Task    │
└────────┬────────┘
         │
         ▼
  ┌─────────────┐
  │ Choose Type │◄─── Recycle / Donate / Other
  └──────┬──────┘
         │
         ▼
  ┌──────────────────┐
  │ Choose Reward    │
  │  XP or Badge?    │
  └────────┬─────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
  XP TASK    BADGE TASK
    │             │
    │      ┌──────┴──────────┐
    │      ▼                 ▼
    │   Existing Badge   Create New Badge
    │      │                 │
    │      └────────┬────────┘
    │             │
    └─────────┬───┴─────────────┐
              ▼                 ▼
        ┌──────────┐      ┌──────────┐
        │ Save to  │      │ Save to  │
        │ Firebase │      │ Firebase │
        └──────────┘      └──────────┘
              │                 │
              └────────┬────────┘
                       ▼
                  ┌──────────┐
                  │ Firebase │
                  │ tasks/   │
                  └──────────┘
```

---

## User Task Completion Flow

```
USER COMPLETES TASK
        │
        ▼
┌───────────────────┐
│  Click "Claim"    │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
  XP TASK   BADGE TASK
    │           │
    ├─→ Award XP ├─→ Add Badge to User
    │           │
    └─────┬─────┘
          ▼
    UPDATE USER DATA
    ├─ xp += amount
    ├─ badges.push(badgeId)
    └─ completedTasks.push(taskId)
          │
          ▼
    ┌──────────────────────┐
    │ Check: All Tasks     │
    │ Completed?           │
    └──────┬───────────────┘
           │
        YES│    NO
        ▼  └──────┐
    ┌─────────────────┐      ▼
    │ SECRET UNLOCK!  │   ┌─────────┐
    │ Sierra Madre    │   │ Complete│
    │ Badge Awarded   │   │ Message │
    │ Notification    │   └─────────┘
    │ + Alert         │
    └─────────────────┘
```

---

## Badge Display Flow

```
USER EQUIPS BADGE
        │
        ▼
┌─────────────────────┐
│ Set equippedBadge   │
│ in user/{uid}       │
└──────────┬──────────┘
           │
           ▼
REAL-TIME LISTENER
UPDATES ACROSS APP
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
HEADER  PROFILE  BADGE
NAME    PAGE    ICON
"👑      Shows   Shows
 John"   Icon    Icon
```

---

## Task Types & Their Mechanics

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK TYPES                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  RECYCLE TASKS                DONATE TASKS                   │
│  ├─ User logs recyclables     ├─ Donations tracked          │
│  ├─ Target met = Completable  │  via Donation system       │
│  ├─ XP awarded on claim       ├─ User must meet target      │
│  └─ Badge awarded on claim    ├─ Verified before claim     │
│                               └─ Award XP/Badge on claim   │
│                                                               │
│  OTHER TASKS                                                 │
│  ├─ Custom actions                                           │
│  ├─ Flexible criteria                                        │
│  ├─ Admin defines completion                                │
│  └─ XP or Badge reward                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Badge System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    BADGE LIFECYCLE                            │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  CREATION                 ASSIGNMENT              EARNING     │
│  ├─ Admin creates         ├─ Assign to task      ├─ User     │
│  │  ├─ Name              │  in task form        │  completes │
│  │  ├─ Description       │  (edit/create)       │  task      │
│  │  └─ Icon (emoji)      └─ Save task           └─ Badge    │
│  └─ Stored in badges/       to Firebase            awarded   │
│     collection                                                │
│                                                                │
│  DISPLAY & EQUIP                                              │
│  ├─ User profile shows only unlocked badges                   │
│  ├─ User can "Equip Badge" to make it active                  │
│  ├─ Equipped badge icon shows in header                       │
│  └─ Icon visible on all pages when equipped                   │
│                                                                │
│  SPECIAL: SECRET BADGE (sierra_madre)                         │
│  ├─ Hidden until ALL tasks completed                          │
│  ├─ Auto-awarded with notification                            │
│  ├─ Shows special unlock message                              │
│  └─ Can be equipped like any other badge                      │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## User Interface Components

### Admin: Create/Edit Task Form
```
┌─────────────────────────────────────────────┐
│ TASK FORM                                   │
├─────────────────────────────────────────────┤
│                                             │
│  Title: [________________]                 │
│  Description: [_________________]          │
│  Type: [▼ Recycle] [Donate] [Other]       │
│  Target: [__]                              │
│                                             │
│  ◉ XP Points           ○ Badge             │
│                                             │
│  IF XP SELECTED:         IF BADGE:        │
│  XP Amount: [50]         Badge: [▼___]    │
│                          [+ Create New]    │
│                          ┌─────────────┐   │
│                          │ Badge Name  │   │
│                          │ Description │   │
│                          │ Icon: [⭐]  │   │
│                          │ [Create]    │   │
│                          └─────────────┘   │
│                                             │
│ [CANCEL]  [CREATE/SAVE]                   │
└─────────────────────────────────────────────┘
```

### User: Task List (Scrollable)
```
┌──────────────────────────────────────────┐
│ 📋 RECYCLING TASKS              [scroll]  │
├──────────────────────────────────────────┤
│                                          │
│ Recycle 5 Plastic Bottles               │
│ Collect and recycle 5 items             │
│ +50 XP              [Claim]             │
├──────────────────────────────────────────┤
│ Become an Eco Warrior                   │
│ Complete 5 recycling tasks              │
│ 🎖️ Badge Reward     [Claim]             │
├──────────────────────────────────────────┤
│ (more items...) ↓                        │
│                                          │
└──────────────────────────────────────────┘
```

### User: Profile Badges
```
┌──────────────────────────────────────────┐
│ MY ACHIEVEMENTS - BADGES                 │
├──────────────────────────────────────────┤
│                                          │
│  ┌─────────┐  ┌─────────┐               │
│  │   ♻️    │  │   💚    │               │
│  │ Eco     │  │Generous │               │
│  │Warrior  │  │  Soul   │               │
│  │[Equip]  │  │[Equip]  │               │
│  └─────────┘  └─────────┘               │
│                                          │
│ [View All >]                             │
│                                          │
└──────────────────────────────────────────┘
```

### Header: Equipped Badge
```
┌────────────────────────────────────────────┐
│ ECOWASTE     [Notification]  [👑 Shem John]│
│ 🌿                           [Dropdown ▼]  │
└────────────────────────────────────────────┘
```

---

## Data Model Visualization

### Badges Collection
```
badges/
├─ eco_warrior
│  ├─ name: "Eco Warrior"
│  ├─ description: "Recycled 10+ items"
│  ├─ icon: "♻️"
│  └─ createdAt: 1702569600000
│
├─ generous_soul
│  ├─ name: "Generous Soul"
│  ├─ description: "Donated 5+ items"
│  ├─ icon: "💚"
│  └─ createdAt: 1702569600000
│
└─ sierra_madre [SECRET]
   ├─ name: "Sierra Madre"
   ├─ description: "Completed all tasks"
   ├─ icon: "👑"
   └─ createdAt: 1702569600000
```

### Tasks Collection
```
tasks/
├─ task_001 [XP REWARD]
│  ├─ title: "Recycle 3 Items"
│  ├─ description: "..."
│  ├─ type: "recycle"
│  ├─ target: 3
│  ├─ rewardType: "xp"
│  ├─ xpReward: 25
│  └─ createdAt: 1702569600000
│
├─ task_002 [BADGE REWARD]
│  ├─ title: "Become an Eco Warrior"
│  ├─ description: "..."
│  ├─ type: "recycle"
│  ├─ target: 10
│  ├─ rewardType: "badge"
│  ├─ badgeId: "eco_warrior"
│  └─ createdAt: 1702569600000
│
└─ task_003
   └─ ...
```

### User Data (Relevant Fields)
```
users/{uid}/
├─ xp: 500
├─ level: 3
├─ badges: ["eco_warrior", "generous_soul"]
├─ equippedBadge: "eco_warrior"
├─ completedTasks: ["task_001", "task_002"]
├─ recyclingCount: 15
├─ donationCount: 8
└─ projectsCompleted: 2
```

---

## Key Emoji Icons

```
System Icons:
⭐ Generic Badge        🏆 Achievement/Trophy
🎖️ Military Medal      🥇 Gold Medal
🥈 Silver Medal         🥉 Bronze Medal
💚 Heart (Generosity)   ♻️ Recycle Symbol
🌱 Seedling/Growth      🌍 Earth/Planet
👑 Crown (Exclusive)    ⚡ Lightning/Power
🔥 Fire/Hot             🎯 Target/Goal

Task Categories:
♻️ Recycling Tasks      💚 Donation Tasks
🎯 Challenge Tasks      🏆 Special Badges
```

---

## Feature Summary

| Feature | Implemented | Status |
|---------|-------------|--------|
| Badge Creation | ✅ | In Create & Edit Task Forms |
| Task Creation | ✅ | XP or Badge Rewards |
| Task Display | ✅ | Admin & Achievements Page |
| Badge Equipping | ✅ | Toggle in Profile |
| Header Display | ✅ | Equipped Badge Icon |
| Scrollable Lists | ✅ | Admin & Achievements |
| Secret Achievement | ✅ | Sierra Madre on All Tasks Complete |
| Notifications | ✅ | Firebase Notifications |
| Real-time Sync | ✅ | Live Updates Across App |

---

**Last Updated**: December 14, 2025  
**Version**: 1.0  
**Status**: ✅ Complete
