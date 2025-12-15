'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminRoute from '../../../components/AdminRoute';
import styles from './tasks.module.css';
import { db } from '../../../lib/firebase';
import { seedBadges } from '../../../lib/seedBadges';
import { useAuth } from '../../../context/AuthContext';

export default function TasksManagement() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribeTasks: (() => void) | undefined;
    let unsubscribeBadges: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const { ref, onValue } = await import('firebase/database');

        // Tasks listener
        const tasksRef = ref(db, 'tasks');
        unsubscribeTasks = onValue(tasksRef, (snapshot) => {
          if (snapshot.exists()) {
            const rawData = snapshot.val();
            // console.log("Tasks raw data:", rawData); // Debug log
            const tasksList = Object.entries(rawData).map(([key, val]: [string, any]) => ({
              id: key,
              ...val
            }));
            setTasks(tasksList);
          } else {
            console.log("No tasks found in DB");
            setTasks([]);
          }
          setLoading(false); // Set loading to false after tasks are fetched
        }, (error) => {
          console.error("Error fetching tasks:", error);
          setLoading(false);
        });

        // Badges listener
        const badgesRef = ref(db, 'badges');
        unsubscribeBadges = onValue(badgesRef, (snapshot) => {
          if (snapshot.exists()) {
            const badgesList = Object.entries(snapshot.val()).map(([key, val]: [string, any]) => ({
              id: key,
              ...val
            }));
            setBadges(badgesList);
          } else {
            setBadges([]);
          }
        }, (error) => {
          console.error("Error fetching badges:", error);
        });

      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) { setupListeners(); }
  }, [user]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [showCreateBadge, setShowCreateBadge] = useState(false);
  const [newBadge, setNewBadge] = useState({ name: '', description: '', icon: '⭐' });

  const handleEditClick = (task: any) => {
    setCurrentTask(task);
    setIsEditModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const { ref, remove, set } = await import('firebase/database');
      await remove(ref(db, `tasks/${taskId}`));
      alert('Task deleted');
    } catch (e) {
      console.error(e);
      alert('Error deleting task');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { ref, update } = await import('firebase/database');
      await update(ref(db, `tasks/${currentTask.id}`), currentTask);
      setIsEditModalOpen(false);
      setCurrentTask(null);
      alert('Task updated');
    } catch (err) {
      console.error(err);
      alert('Error updating task');
    }
  };

  const handleCreateBadge = async () => {
    if (!newBadge.name || !newBadge.description || !newBadge.icon) {
      alert('Please fill in all badge fields.');
      return;
    }
    try {
      const { ref, push } = await import('firebase/database');
      const newBadgeRef = push(ref(db, 'badges'));
      await set(newBadgeRef, newBadge);
      alert('Badge created successfully!');
      setNewBadge({ name: '', description: '', icon: '⭐' });
      setShowCreateBadge(false);
    } catch (error) {
      console.error('Error creating badge:', error);
      alert('Failed to create badge.');
    }
  };


  return (
    <AdminRoute>
      <Header />

      <div className={styles.container}>
        <AdminSidebar />
        <main className={styles.mainContent}>
          <div className={styles.pageHeader}>
            <h1 className={styles.title}>Manage Tasks</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/admin/tasks/create" className={styles.createBtn}>
                <i className="fas fa-plus"></i> Create Task
              </Link>
            </div>
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
                      <td>
                        {task.type === 'xp' ? 'Points' :
                          task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                      </td>
                      <td>
                        {task.rewardType === 'badge' ? (
                          <>
                            <span>Badge: {badges.find((b) => b.id === task.badgeId)?.name || (task.badgeId ? `ID: ${task.badgeId}` : 'Unknown')}</span>
                            {task.xpReward > 0 && <span style={{ display: 'block', fontSize: '12px', color: '#666' }}>+ {task.xpReward} XP</span>}
                          </>
                        ) : (
                          `${task.xpReward || 50} XP`
                        )}
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
                    <option value="recycle">Recycle</option>
                    <option value="donate">Donate</option>
                    <option value="xp">Points</option>
                    {/* Only show 'other' if the task is already type 'other', to allow migration away */}
                    {currentTask.type === 'other' && <option value="other">Other (Legacy)</option>}
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
  )
}
        </main >
      </div >
    </AdminRoute >
  );
}
