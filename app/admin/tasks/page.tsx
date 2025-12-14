'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminRoute from '../../../components/AdminRoute';
import styles from './tasks.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: string;
  target?: number;
  createdAt: number;
}

export default function TasksManagement() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!user) return;

    const tasksRef = ref(db, 'tasks');
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tasksList = Object.entries(data).map(([key, value]) => {
            const val = value as Omit<Task, 'id'>;
            return {
                id: key,
                ...val
            };
        });
        setTasks(tasksList);
      } else {
        setTasks([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await remove(ref(db, `tasks/${taskId}`));
        alert('Task deleted successfully');
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
      }
    }
  };

  const handleEditClick = (task: Task) => {
    setCurrentTask(task);
    setIsEditModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;

    try {
      const taskRef = ref(db, `tasks/${currentTask.id}`);
      await update(taskRef, {
        title: currentTask.title,
        description: currentTask.description,
        xpReward: Number(currentTask.xpReward),
        type: currentTask.type,
        target: Number(currentTask.target)
      });
      setIsEditModalOpen(false);
      alert('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
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
                    <th>XP Reward</th>
                    <th>Target</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{task.type}</td>
                      <td>{task.xpReward} XP</td>
                      <td>{task.target || 'N/A'}</td>
                      <td>
                        <button 
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleEditClick(task)}
                          title="Edit Task"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete Task"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{textAlign: 'center', padding: '20px'}}>No tasks found</td>
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
                    <input 
                      type="text" 
                      value={currentTask.title} 
                      onChange={e => setCurrentTask({...currentTask, title: e.target.value})}
                      required 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea 
                      value={currentTask.description} 
                      onChange={e => setCurrentTask({...currentTask, description: e.target.value})}
                      required 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Type</label>
                    <select 
                      value={currentTask.type} 
                      onChange={e => setCurrentTask({...currentTask, type: e.target.value})}
                    >
                      <option value="recycle">Recycle</option>
                      <option value="donate">Donate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>XP Reward</label>
                    <input 
                      type="number" 
                      value={currentTask.xpReward} 
                      onChange={e => setCurrentTask({...currentTask, xpReward: Number(e.target.value)})}
                      required 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Target Amount</label>
                    <input 
                      type="number" 
                      value={currentTask.target || 0} 
                      onChange={e => setCurrentTask({...currentTask, target: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                    <button type="submit" className={styles.saveBtn}>Save Changes</button>
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
