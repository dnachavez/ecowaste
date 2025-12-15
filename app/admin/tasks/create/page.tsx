'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../../../components/Header';
import AdminSidebar from '../../../../components/AdminSidebar';
import AdminRoute from '../../../../components/AdminRoute';
import styles from './create-task.module.css';
import { useRouter } from 'next/navigation';
import { ref, push, onValue } from 'firebase/database';
import { db } from '../../../../lib/firebase';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function CreateTaskPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    xpReward: 50,
    type: 'recycle',
    target: 1,
    rewardType: 'xp', // 'xp' or 'badge'
    badgeId: ''
  });

  const [badges, setBadges] = useState<Badge[]>([]);
  const [showCreateBadge, setShowCreateBadge] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    icon: '⭐'
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch existing badges
  useEffect(() => {
    const badgesRef = ref(db, 'badges');
    const unsubscribe = onValue(badgesRef, (snapshot) => {
      if (snapshot.exists()) {
        const badgesData = snapshot.val();
        const badgesList = Object.entries(badgesData).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        setBadges(badgesList);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'xpReward' || name === 'target' ? Number(value) : value
    }));
    setError('');
  };

  const handleBadgeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewBadge(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateBadge = async () => {
    if (!newBadge.name.trim() || !newBadge.description.trim()) {
      setError('Badge name and description are required');
      return;
    }

    console.log('handleCreateBadge called', newBadge);
    setError('');

    try {
      const response = await fetch('/api/create-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBadge)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('create-badge response error', data);
        setError(data.error || 'Failed to create badge');
        return;
      }

      console.log('create-badge success', data);
      setFormData(prev => ({
        ...prev,
        badgeId: data.badgeId || ''
      }));
      setNewBadge({ name: '', description: '', icon: '⭐' });
      setShowCreateBadge(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Error creating badge:', err);
      setError('Failed to create badge');
    }
  };

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Task title and description are required.');
      return;
    }

    if (formData.rewardType === 'badge' && !formData.badgeId) {
      setError('Please select or create a badge');
      return;
    }

    try {
      const tasksRef = ref(db, 'tasks');
      const taskData: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        target: formData.target,
        rewardType: formData.rewardType,
        createdAt: Date.now()
      };
      // Clean up undefined/null values
      if (!taskData.target) taskData.target = 1;

      if (formData.rewardType === 'xp') {
        taskData.xpReward = formData.xpReward;
      } else {
        taskData.badgeId = formData.badgeId;
      }
      await push(tasksRef, taskData);
      setSuccess(true);
      // Wait a moment before redirecting so user sees success message
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          xpReward: 50,
          type: 'recycle',
          target: 1,
          rewardType: 'xp',
          badgeId: ''
        });
        router.push('/admin/tasks');
      }, 1000);
    } catch (error) {
      console.error('Error creating task:', error);
      setError('Failed to create task. Check console for details.');
    }
  };


  const badgeIcons = ['⭐', '🏆', '🎖️', '🥇', '🥈', '🥉', '💚', '♻️', '🌱', '🌍', '👑', '⚡', '🔥', '🎯'];

  return (
    <AdminRoute>
      <Header />

      <div className={styles.container}>
        <AdminSidebar />
        <main className={styles.mainContent}>
          <h1 className={styles.title}>Create New Task</h1>

          {success && <div className={styles.success}>Task created successfully!</div>}
          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Task Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="e.g. Recycle 5 Plastic Bottles"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className={styles.textarea}
                placeholder="Describe what the user needs to do..."
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className={styles.select}>
                <option value="recycle">Recycle</option>
                <option value="donate">Donate</option>
                <option value="xp">Points</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Target Quantity (if applicable)</label>
              <input
                type="number"
                name="target"
                value={formData.target}
                onChange={handleChange}
                min="1"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Reward Type</label>
              <div className={styles.rewardTypeContainer}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="rewardType"
                    value="xp"
                    checked={formData.rewardType === 'xp'}
                    onChange={handleChange}
                  />
                  <span>XP Points</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="rewardType"
                    value="badge"
                    checked={formData.rewardType === 'badge'}
                    onChange={handleChange}
                  />
                  <span>Badge</span>
                </label>
              </div>
            </div>

            {formData.rewardType === 'xp' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>XP Reward Amount</label>
                <input
                  type="number"
                  name="xpReward"
                  value={formData.xpReward}
                  onChange={handleChange}
                  min="10"
                  step="10"
                  className={styles.input}
                />
              </div>
            )}

            {formData.rewardType === 'badge' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Select or Create Badge</label>
                {badges.length > 0 && (
                  <select
                    name="badgeId"
                    value={formData.badgeId}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">-- Select Badge --</option>
                    {badges.map(badge => (
                      <option key={badge.id} value={badge.id}>
                        {badge.icon} {badge.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateBadge(!showCreateBadge)}
                  className={styles.secondaryButton}
                  style={{ marginTop: '10px' }}
                >
                  {showCreateBadge ? 'Cancel' : '+ Create New Badge'}
                </button>

                {showCreateBadge && (
                  <div className={styles.badgeCreationBox} style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Badge Name</label>
                      <input
                        type="text"
                        name="name"
                        value={newBadge.name}
                        onChange={handleBadgeInputChange}
                        className={styles.input}
                        placeholder="e.g. Recycling Champion"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Badge Description</label>
                      <textarea
                        name="description"
                        value={newBadge.description}
                        onChange={handleBadgeInputChange}
                        className={styles.textarea}
                        placeholder="Describe what this badge represents..."
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Badge Icon</label>
                      <div className={styles.iconSelector}>
                        {badgeIcons.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setNewBadge(prev => ({ ...prev, icon }))}
                            className={`${styles.iconButton} ${newBadge.icon === icon ? styles.selected : ''}`}
                            title={icon}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '24px' }}>
                        Selected: {newBadge.icon}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateBadge}
                      className={styles.button}
                      style={{ marginTop: '15px' }}
                    >
                      Create Badge
                    </button>
                  </div>
                )}
              </div>
            )}

            <button type="submit" className={styles.button}>Create Task</button>
          </form>
        </main>
      </div>
    </AdminRoute>
  );
}
