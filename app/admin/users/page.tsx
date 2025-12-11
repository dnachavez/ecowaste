'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminRoute from '../../../components/AdminRoute';
import styles from './users.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';

interface User {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  level?: number;
  xp?: number;
}

export default function UsersManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data).map(([key, value]) => {
          const userData = value as Record<string, string | number | undefined>;
          return {
            id: key,
            email: String(userData.email || 'N/A'),
            fullName: String(userData.fullName || userData.displayName || 'Anonymous'),
            role: String(userData.role || 'user'),
            level: Number(userData.level || 1),
            xp: Number(userData.xp || 0)
          };
        });
        setUsers(usersList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await remove(ref(db, `users/${userId}`));
        alert('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const handleEditClick = (user: User) => {
      setCurrentUser(user);
      setIsEditModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;

      try {
          const userRef = ref(db, `users/${currentUser.id}`);
          await update(userRef, {
              role: currentUser.role,
              level: Number(currentUser.level),
              xp: Number(currentUser.xp)
          });
          setIsEditModalOpen(false);
          alert('User updated successfully');
      } catch (error) {
          console.error('Error updating user:', error);
          alert('Failed to update user');
      }
  };

  return (
    <AdminRoute>
      <div className={styles.container}>
        <Header />
        <AdminSidebar />
        <main className={styles.mainContent}>
          <h1 className={styles.title}>Manage Users</h1>
          
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Level</th>
                    <th>XP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          backgroundColor: user.role === 'admin' ? '#e2e6ea' : '#d4edda',
                          color: user.role === 'admin' ? '#333' : '#155724',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {user.role?.toUpperCase()}
                        </span>
                      </td>
                      <td>{user.level}</td>
                      <td>{user.xp}</td>
                      <td>
                        <button 
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleEditClick(user)}
                          title="Edit User"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {isEditModalOpen && currentUser && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Edit User</h2>
                <form onSubmit={handleSaveUser}>
                  <div className={styles.formGroup}>
                    <label>Name</label>
                    <input type="text" value={currentUser.fullName} disabled style={{background: '#f8f9fa'}} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input type="text" value={currentUser.email} disabled style={{background: '#f8f9fa'}} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Role</label>
                    <select 
                      value={currentUser.role} 
                      onChange={e => setCurrentUser({...currentUser, role: e.target.value})}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Level</label>
                    <input 
                      type="number" 
                      value={currentUser.level} 
                      onChange={e => setCurrentUser({...currentUser, level: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>XP</label>
                    <input 
                      type="number" 
                      value={currentUser.xp} 
                      onChange={e => setCurrentUser({...currentUser, xp: Number(e.target.value)})}
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
