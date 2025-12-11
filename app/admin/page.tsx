'use client';

import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import AdminSidebar from '../../components/AdminSidebar';
import AdminRoute from '../../components/AdminRoute';
import styles from './admin.module.css';
import { db } from '../../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';

interface User {
  recyclingCount?: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeTasks: 0,
    totalUsers: 0,
    itemsRecycled: 0,
    totalDonations: 0,
    totalProjects: 0
  });

  useEffect(() => {
    if (!user) return;

    // Fetch stats
    const fetchStats = () => {
        // Users & Recycled Count
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const users = Object.values(data) as User[];
                const totalUsers = users.length;
                const itemsRecycled = users.reduce((acc: number, user: User) => acc + (user.recyclingCount || 0), 0);
                setStats(prev => ({ ...prev, totalUsers, itemsRecycled }));
            }
        });

        // Tasks
        const tasksRef = ref(db, 'tasks');
        onValue(tasksRef, (snapshot) => {
             const data = snapshot.val();
             if (data) setStats(prev => ({ ...prev, activeTasks: Object.keys(data).length }));
        });
        
        // Donations
        const donationsRef = ref(db, 'donations');
        onValue(donationsRef, (snapshot) => {
             const data = snapshot.val();
             if (data) setStats(prev => ({ ...prev, totalDonations: Object.keys(data).length }));
        });

        // Projects
        const projectsRef = ref(db, 'projects');
        onValue(projectsRef, (snapshot) => {
             const data = snapshot.val();
             if (data) setStats(prev => ({ ...prev, totalProjects: Object.keys(data).length }));
        });
    };

    fetchStats();
  }, [user]);

  return (
    <AdminRoute>
      <div className={styles.container}>
         <Header />
         <AdminSidebar />
         <main className={styles.mainContent}>
            <h1 className={styles.title}>Admin Dashboard</h1>
            
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.activeTasks}</div>
                    <div className={styles.statLabel}>Active Tasks</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.totalUsers}</div>
                    <div className={styles.statLabel}>Total Users</div>
                </div>
                 <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.itemsRecycled}</div>
                    <div className={styles.statLabel}>Items Recycled</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.totalDonations}</div>
                    <div className={styles.statLabel}>Total Donations</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.totalProjects}</div>
                    <div className={styles.statLabel}>Total Projects</div>
                </div>
            </div>

            <p>Select an option from the sidebar to manage the system.</p>
         </main>
      </div>
    </AdminRoute>
  );
}
