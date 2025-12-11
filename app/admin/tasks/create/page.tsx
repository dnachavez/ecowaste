'use client';

import React, { useState } from 'react';
import Header from '../../../../components/Header';
import AdminSidebar from '../../../../components/AdminSidebar';
import AdminRoute from '../../../../components/AdminRoute';
import styles from './create-task.module.css';
import { db } from '../../../../lib/firebase';
import { ref, push } from 'firebase/database';

export default function CreateTaskPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    xpReward: 50,
    type: 'recycle',
    target: 1
  });
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: name === 'xpReward' || name === 'target' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const tasksRef = ref(db, 'tasks');
        await push(tasksRef, {
            ...formData,
            createdAt: Date.now()
        });
        setSuccess(true);
        setFormData({
            title: '',
            description: '',
            xpReward: 50,
            type: 'recycle',
            target: 1
        });
        setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task');
    }
  };

  return (
    <AdminRoute>
        <div className={styles.container}>
            <Header />
            <AdminSidebar />
            <main className={styles.mainContent}>
                <h1 className={styles.title}>Create New Task</h1>
                
                {success && <div className={styles.success}>Task created successfully!</div>}

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
                            <option value="other">Other</option>
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
                        <label className={styles.label}>XP Reward</label>
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

                    <button type="submit" className={styles.button}>Create Task</button>
                </form>
            </main>
        </div>
    </AdminRoute>
  );
}
