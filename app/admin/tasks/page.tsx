'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminRoute from '../../../components/AdminRoute';
import styles from './tasks.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue, remove, update, push, get } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  xpReward?: number;
  badgeId?: string;
  rewardType?: 'xp' | 'badge';
  type: string;
  target?: number;
  createdAt: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function TasksManagement() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [showCreateBadge, setShowCreateBadge] = useState(false);
  const [newBadge, setNewBadge] = useState({ name: '', description: '', icon: '⭐' });

  useEffect(() => {
    if (!user) return;

    const tasksRef = ref(db, 'tasks');
    const badgesRef = ref(db, 'badges');

    const unsubscribeTasks = onValue(
      tasksRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const tasksList = Object.entries(data).map(([key, value]) => ({ id: key, ...(value as any) }));
          setTasks(tasksList as Task[]);
        } else {
          setTasks([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        setLoading(false);
      }
    );

    const unsubscribeBadges = onValue(badgesRef, (snapshot) => {
      if (snapshot.exists()) {
        const badgesData = snapshot.val();
        const badgesList = Object.entries(badgesData).map(([key, value]: [string, any]) => ({ id: key, ...value }));
        setBadges(badgesList as Badge[]);
      } else {
        setBadges([]);
      }
    });

    return () => {
      unsubscribeTasks();
      unsubscribeBadges();
    };
  }, [user]);

  // Debug: log badges/tasks to help find mismatches between task.badgeId and badges
  useEffect(() => {
    console.log('Admin tasks page - badges', badges);
  }, [badges]);

  useEffect(() => {
    console.log('Admin tasks page - tasks', tasks);
  }, [tasks]);

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await remove(ref(db, `tasks/${taskId}`));
      alert('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleEditClick = (task: Task) => {
    setCurrentTask(task);
    setIsEditModalOpen(true);
  };

  const handleCreateBadge = async () => {
    if (!newBadge.name.trim() || !newBadge.description.trim()) {
      alert('Badge name and description are required');
      return;
    }
    try {
      const badgesRef = ref(db, 'badges');
      const newBadgeRef = await push(badgesRef, { ...newBadge, createdAt: Date.now() });
      if (currentTask && newBadgeRef.key) setCurrentTask({ ...currentTask, badgeId: newBadgeRef.key });
      setNewBadge({ name: '', description: '', icon: '⭐' });
      setShowCreateBadge(false);
      alert('Badge created successfully!');
    } catch (error) {
      console.error('Error creating badge:', error);
      alert('Failed to create badge');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    try {
      const taskRef = ref(db, `tasks/${currentTask.id}`);
      const updateData: any = {
        title: currentTask.title,
        description: currentTask.description,
        type: currentTask.type,
        target: Number(currentTask.target || 0),
        rewardType: currentTask.rewardType || 'xp'
      };
      if (currentTask.rewardType === 'xp') {
        updateData.xpReward = Number((currentTask as any).xpReward || 50);
        delete updateData.badgeId;
      } else {
        updateData.badgeId = currentTask.badgeId;
        delete updateData.xpReward;
      }
      await update(taskRef, updateData);
      setIsEditModalOpen(false);
      alert('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  return (
    <AdminRoute>
      <div className={styles.container}>
        <Header />
        <AdminSidebar />
        <main className={styles.mainContent}>
          <div className={styles.pageHeader}>
            <h1 className={styles.title}>Manage Tasks</h1>
            <Link href="/admin/tasks/create" className={styles.createBtn}>
              <i className="fas fa-plus"></i> Create Task
            </Link>
          </div>

          {loading ? (
            <p>Loading tasks...</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Reward</th>
                    <th>Target</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{task.type}</td>
                      <td>
                        {task.rewardType === 'badge' ? `Badge: ${badges.find((b) => b.id === task.badgeId)?.name || 'Unknown'}` : `${task.xpReward || 50} XP`}
                      </td>
                      <td>{task.target || 'N/A'}</td>
                      <td>
                        <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => handleEditClick(task)} title="Edit Task">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteTask(task.id)} title="Delete Task">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {isEditModalOpen && currentTask && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Edit Task</h2>
                <form onSubmit={handleSaveTask}>
                  <div className={styles.formGroup}>
                    <label>Title</label>
                    <input type="text" value={currentTask.title} onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea value={currentTask.description} onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Type</label>
                    <select value={currentTask.type} onChange={(e) => setCurrentTask({ ...currentTask, type: e.target.value })}>
                      <option value="recycle">Recycle</option>
                      <option value="donate">Donate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Target Amount</label>
                    <input type="number" value={currentTask.target || 0} onChange={(e) => setCurrentTask({ ...currentTask, target: Number(e.target.value) })} />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Reward Type</label>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                        <input type="radio" name="rewardType" value="xp" checked={(currentTask.rewardType || 'xp') === 'xp'} onChange={() => setCurrentTask({ ...currentTask, rewardType: 'xp' })} />
                        <span>XP Points</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                        <input type="radio" name="rewardType" value="badge" checked={(currentTask.rewardType || 'xp') === 'badge'} onChange={() => setCurrentTask({ ...currentTask, rewardType: 'badge' })} />
                        <span>Badge</span>
                      </label>
                    </div>
                  </div>

                  {(currentTask.rewardType || 'xp') === 'xp' && (
                    <div className={styles.formGroup}>
                      <label>XP Reward Amount</label>
                      <input type="number" value={(currentTask as any).xpReward || 50} onChange={(e) => setCurrentTask({ ...currentTask, xpReward: Number(e.target.value) } as any)} min={10} step={10} required />
                    </div>
                  )}

                  {(currentTask.rewardType || 'xp') === 'badge' && (
                    <div>
                      <div className={styles.formGroup}>
                        <label>Select Badge</label>
                        <select value={currentTask.badgeId || ''} onChange={(e) => setCurrentTask({ ...currentTask, badgeId: e.target.value })} required>
                          <option value="">-- Select Badge --</option>
                          {badges.map((badge) => (
                            <option key={badge.id} value={badge.id}>
                              {badge.icon} {badge.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button type="button" className={styles.secondaryButton} onClick={() => setShowCreateBadge(!showCreateBadge)}>
                        {showCreateBadge ? '✕ Cancel' : '+ Create New Badge'}
                      </button>

                      {showCreateBadge && (
                        <div className={styles.badgeCreationBox}>
                          <h4>Create New Badge</h4>
                          <div className={styles.formGroup}>
                            <label>Badge Name</label>
                            <input type="text" placeholder="e.g., Eco Warrior" value={newBadge.name} onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })} />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Badge Description</label>
                            <textarea placeholder="e.g., Complete 5 recycling tasks" value={newBadge.description} onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })} />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Badge Icon</label>
                            <div className={styles.iconSelector}>
                              {['⭐', '🏆', '🎖️', '🥇', '🥈', '🥉', '💚', '♻️', '🌱', '🌍', '👑', '⚡', '🔥', '🎯'].map((icon) => (
                                <button key={icon} type="button" className={`${styles.iconButton} ${newBadge.icon === icon ? styles.selected : ''}`} onClick={() => setNewBadge({ ...newBadge, icon })}>
                                  {icon}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button type="button" className={styles.saveBtn} onClick={handleCreateBadge}>
                            Create Badge
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setIsEditModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className={styles.saveBtn}>
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </AdminRoute>
  );
}
