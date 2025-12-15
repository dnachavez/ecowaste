'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar'; // Assuming this exists or using Sidebar
import ProtectedRoute from '../../../components/ProtectedRoute'; // Or AdminRoute if you have one
import { db } from '../../../lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import styles from './feedback.module.css'; // You'll need to create this CSS file

interface Feedback {
    id: string;
    userId: string;
    userName: string;
    rating: number;
    text: string;
    createdAt: number;
    status: 'new' | 'read' | 'archived';
}

export default function AdminFeedback() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [filterRating, setFilterRating] = useState<string>('All');
    const [sortOrder, setSortOrder] = useState<string>('newest');

    useEffect(() => {
        const feedbackRef = ref(db, 'feedbacks');
        const unsubscribe = onValue(feedbackRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedFeedbacks = Object.entries(data).map(([key, value]) => ({
                    id: key,
                    ...(value as Omit<Feedback, 'id'>)
                }));
                setFeedbacks(loadedFeedbacks);
            } else {
                setFeedbacks([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const filteredFeedbacks = useMemo(() => {
        let result = [...feedbacks];

        // Filter
        if (filterRating !== 'All') {
            const rating = parseInt(filterRating);
            result = result.filter(f => f.rating === rating);
        }

        // Sort
        result.sort((a, b) => {
            if (sortOrder === 'newest') return b.createdAt - a.createdAt;
            if (sortOrder === 'oldest') return a.createdAt - b.createdAt;
            if (sortOrder === 'highest') return b.rating - a.rating;
            if (sortOrder === 'lowest') return a.rating - b.rating;
            return 0;
        });

        return result;
    }, [feedbacks, filterRating, sortOrder]);

    const stats = useMemo(() => {
        if (feedbacks.length === 0) return { avg: 0, count: 0 };
        const sum = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
        return {
            avg: (sum / feedbacks.length).toFixed(1),
            count: feedbacks.length
        };
    }, [feedbacks]);

    return (
        <ProtectedRoute>
            <Header />
            <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f8' }}>
                <AdminSidebar />  {/* Use AdminSidebar if available */}
                <div style={{ flex: 1, padding: '30px' }}>
                    <h1 style={{ color: '#2e8b57', marginBottom: '20px' }}>User Feedback</h1>

                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ margin: 0, color: '#666', fontSize: '14px' }}>Total Feedback</h3>
                            <p style={{ margin: '10px 0 0', fontSize: '24px', fontWeight: 'bold' }}>{stats.count}</p>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ margin: 0, color: '#666', fontSize: '14px' }}>Average Rating</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.avg}</span>
                                <span style={{ color: '#f1c40f' }}>★</span>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
                        <div>
                            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by Rating:</label>
                            <select
                                value={filterRating}
                                onChange={(e) => setFilterRating(e.target.value)}
                                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value="All">All Ratings</option>
                                <option value="5">5 Stars (Very Happy)</option>
                                <option value="4">4 Stars (Happy)</option>
                                <option value="3">3 Stars (Neutral)</option>
                                <option value="2">2 Stars (Sad)</option>
                                <option value="1">1 Star (Very Sad)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Sort by:</label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="highest">Highest Rating</option>
                                <option value="lowest">Lowest Rating</option>
                            </select>
                        </div>
                    </div>

                    {/* Feedback List */}
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                                <tr>
                                    <th style={{ padding: '15px', textAlign: 'left', width: '20%' }}>User</th>
                                    <th style={{ padding: '15px', textAlign: 'center', width: '15%' }}>Rating</th>
                                    <th style={{ padding: '15px', textAlign: 'left', width: '45%' }}>Feedback</th>
                                    <th style={{ padding: '15px', textAlign: 'right', width: '20%' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFeedbacks.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No feedback found.</td>
                                    </tr>
                                ) : (
                                    filteredFeedbacks.map(f => (
                                        <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    {f.userAvatar && (f.userAvatar.startsWith('http') || f.userAvatar.startsWith('/')) ? (
                                                        <img src={f.userAvatar} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#2e8b57', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                                            {f.userName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span>{f.userName}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                {Array(f.rating).fill('⭐').join('')}
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                {f.text}
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'right', color: '#666' }}>
                                                {new Date(f.createdAt).toLocaleDateString()} {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
