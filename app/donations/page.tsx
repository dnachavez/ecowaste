'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './donations.module.css';

export default function DonationsPage() {
  const [activeTab, setActiveTab] = useState('my-donations');

  const descriptions: { [key: string]: string } = {
    "my-donations": "Here are all the donations you created. You can manage them here.",
    "requests-for-me": "These are requests from other users for your donations.",
    "my-requests": "These are the donation requests you have made to other donors.",
    "received-donations": "These are the donations you have successfully received."
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Header />
        <Sidebar />
            
        <main className={styles['donations-container']}>
            <div className={styles['page-header']}>
                <h2 className={styles['page-title']}>Donation Management</h2>
            </div>
            <p className={styles['page-description']}>
                {descriptions[activeTab]}
            </p>

            <div className={styles['tabs-container']}>
                <div className={styles['tabs']}>
                    <button 
                        className={`${styles['tab-btn']} ${activeTab === 'my-donations' ? styles['tab-btn-active'] : ''}`}
                        onClick={() => setActiveTab('my-donations')}
                    >
                        My Donations
                    </button>
                    <button 
                        className={`${styles['tab-btn']} ${activeTab === 'requests-for-me' ? styles['tab-btn-active'] : ''}`}
                        onClick={() => setActiveTab('requests-for-me')}
                    >
                        Requests for My Donations
                    </button>
                    <button 
                        className={`${styles['tab-btn']} ${activeTab === 'my-requests' ? styles['tab-btn-active'] : ''}`}
                        onClick={() => setActiveTab('my-requests')}
                    >
                        My Requested Donations
                    </button>
                    <button 
                        className={`${styles['tab-btn']} ${activeTab === 'received-donations' ? styles['tab-btn-active'] : ''}`}
                        onClick={() => setActiveTab('received-donations')}
                    >
                        Received Donations
                    </button>
                </div>
            </div>

            <div className={styles['tab-content-wrapper']}>
                {activeTab === 'my-donations' && (
                    <div className={styles['tab-content']}>
                        <div className={styles['donations-grid']}>
                            <div className={styles['empty-state']}>
                                <i className="fas fa-box-open"></i>
                                <h3>No donations yet</h3>
                                <p>You haven&apos;t created any donations yet. Start by creating your first donation!</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'requests-for-me' && (
                    <div className={styles['tab-content']}>
                        <div className={styles['empty-state']}>
                            <i className="fas fa-users"></i>
                            <h3>No requests for your donations</h3>
                            <p>No one has requested your donations yet.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'my-requests' && (
                    <div className={styles['tab-content']}>
                        <div className={styles['empty-state']}>
                            <i className="fas fa-hand-paper"></i>
                            <h3>No donation requests</h3>
                            <p>You haven&apos;t requested any donations yet.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'received-donations' && (
                    <div className={styles['tab-content']}>
                        <div className={styles['empty-state']}>
                            <i className="fas fa-gift"></i>
                            <h3>No donations received yet</h3>
                            <p>You haven&apos;t received any completed donations yet. Once your approved requests are delivered, they will appear here.</p>
                        </div>
                    </div>
                )}
            </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
