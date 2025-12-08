'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './donations.module.css';
import { db } from '../../lib/firebase';
import { ref, query, orderByChild, equalTo, onValue, update, remove } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';

interface Donation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  category: string;
  subCategory: string;
  quantity: string;
  unit: string;
  description: string;
  images: string[];
  createdAt: string;
}

interface Request {
  id: string;
  donationId: string;
  donationTitle: string;
  donationCategory: string;
  donationImage: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  quantity: number;
  urgencyLevel?: string;
  projectId?: string;
  createdAt: number;
}

export default function DonationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-donations');
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [requestsForMe, setRequestsForMe] = useState<Request[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  
  // Load data
  useEffect(() => {
    if (!user) return;

    // 1. Fetch My Donations
    const donationsRef = ref(db, 'donations');
    const myDonationsQuery = query(donationsRef, orderByChild('userId'), equalTo(user.uid));
    
    const unsubscribeDonations = onValue(myDonationsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedDonations = Object.entries(data).map(([key, value]) => {
           return {
             id: key,
             ...(value as Omit<Donation, 'id'>)
           } as Donation;
        });
        setMyDonations(loadedDonations.reverse()); // Newest first
      } else {
        setMyDonations([]);
      }
    });

    // 2. Fetch Requests for My Donations (where ownerId == myId)
    const requestsRef = ref(db, 'requests');
    const requestsForMeQuery = query(requestsRef, orderByChild('ownerId'), equalTo(user.uid));

    const unsubscribeRequestsForMe = onValue(requestsForMeQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedRequests = Object.entries(data).map(([key, value]) => {
           return {
             id: key,
             ...(value as Omit<Request, 'id'>)
           } as Request;
        });
        setRequestsForMe(loadedRequests.reverse());
      } else {
        setRequestsForMe([]);
      }
    });

    // 3. Fetch My Requested Donations (where requesterId == myId)
    const myRequestsQuery = query(requestsRef, orderByChild('requesterId'), equalTo(user.uid));

    const unsubscribeMyRequests = onValue(myRequestsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedRequests = Object.entries(data).map(([key, value]) => {
           return {
             id: key,
             ...(value as Omit<Request, 'id'>)
           } as Request;
        });
        setMyRequests(loadedRequests.reverse());
      } else {
        setMyRequests([]);
      }
    });

    return () => {
      unsubscribeDonations();
      unsubscribeRequestsForMe();
      unsubscribeMyRequests();
    };
  }, [user]);

  const handleUpdateStatus = (requestId: string, newStatus: string) => {
    const requestRef = ref(db, `requests/${requestId}`);
    update(requestRef, { status: newStatus })
      .catch((error) => console.error("Error updating status:", error));
  };

  const handleDeleteRequest = (requestId: string) => {
    if (confirm("Are you sure you want to delete this request?")) {
        const requestRef = ref(db, `requests/${requestId}`);
        remove(requestRef)
            .catch((error) => console.error("Error deleting request:", error));
    }
  };

  const receivedDonations = myRequests.filter(req => req.status === 'approved' || req.status === 'completed');

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
                        {myDonations.length > 0 ? (
                            <div className={styles['donations-list']}>
                                {myDonations.map(donation => (
                                    <div key={donation.id} className={styles['donation-row']}>
                                        <img 
                                            src={(donation.images && donation.images.length > 0) ? donation.images[0] : '/placeholder-image.png'} 
                                            alt={donation.description} 
                                            className={styles['row-image']}
                                        />
                                        <div className={styles['row-content']}>
                                            <div className={styles['row-header']}>
                                                <h3 className={styles['row-title']}>{donation.description.substring(0, 50) + (donation.description.length > 50 ? '...' : '')}</h3>
                                                <span className={styles['category-badge']}>{donation.category}</span>
                                            </div>
                                            <div className={styles['row-meta']}>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-cube"></i>
                                                    <span>{donation.quantity} {donation.unit}</span>
                                                </div>
                                                <div className={styles['meta-item']}>
                                                    <i className="far fa-calendar-alt"></i>
                                                    <span>{new Date(donation.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles['empty-state']}>
                                <i className="fas fa-box-open"></i>
                                <h3>No donations yet</h3>
                                <p>You haven&apos;t created any donations yet. Start by creating your first donation!</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'requests-for-me' && (
                    <div className={styles['tab-content']}>
                         {requestsForMe.length > 0 ? (
                            <div className={styles['donations-list']}>
                                {requestsForMe.map(request => (
                                    <div key={request.id} className={styles['donation-row']}>
                                        <img 
                                            src={request.donationImage || '/placeholder-image.png'} 
                                            alt={request.donationTitle} 
                                            className={styles['row-image']}
                                        />
                                        <div className={styles['row-content']}>
                                            <div className={styles['row-header']}>
                                                <h3 className={styles['row-title']}>Request for: {request.donationTitle}</h3>
                                                <span className={`${styles['status-badge']} ${styles[`status-${request.status}`]}`}>{request.status}</span>
                                            </div>
                                            <div className={styles['row-meta']}>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-user"></i>
                                                    <span>{request.requesterName}</span>
                                                </div>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-cube"></i>
                                                    <span>Qty: {request.quantity}</span>
                                                </div>
                                                {request.urgencyLevel && (
                                                    <div className={styles['meta-item']}>
                                                        <i className="fas fa-exclamation-circle"></i>
                                                        <span>Urgency: {request.urgencyLevel}</span>
                                                    </div>
                                                )}
                                                <div className={styles['meta-item']}>
                                                    <i className="far fa-calendar-alt"></i>
                                                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles['row-actions']}>
                                            {request.status === 'pending' && (
                                                <>
                                                    <button 
                                                        className={styles['btn-approve']}
                                                        onClick={() => handleUpdateStatus(request.id, 'approved')}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        className={styles['btn-reject']}
                                                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                className={styles['btn-reject']} // Reusing reject style (usually red) or maybe create a delete style
                                                style={{backgroundColor: '#d32f2f', marginLeft: '5px'}}
                                                onClick={() => handleDeleteRequest(request.id)}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles['empty-state']}>
                                <i className="fas fa-users"></i>
                                <h3>No requests for your donations</h3>
                                <p>No one has requested your donations yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'my-requests' && (
                    <div className={styles['tab-content']}>
                        {myRequests.length > 0 ? (
                            <div className={styles['donations-list']}>
                                {myRequests.map(request => (
                                    <div key={request.id} className={styles['donation-row']}>
                                        <img 
                                            src={request.donationImage || '/placeholder-image.png'} 
                                            alt={request.donationTitle} 
                                            className={styles['row-image']}
                                        />
                                        <div className={styles['row-content']}>
                                            <div className={styles['row-header']}>
                                                <h3 className={styles['row-title']}>Request for: {request.donationTitle}</h3>
                                                <span className={`${styles['status-badge']} ${styles[`status-${request.status}`]}`}>{request.status}</span>
                                            </div>
                                            <div className={styles['row-meta']}>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-tag"></i>
                                                    <span>{request.donationCategory}</span>
                                                </div>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-cube"></i>
                                                    <span>Qty: {request.quantity}</span>
                                                </div>
                                                <div className={styles['meta-item']}>
                                                    <i className="far fa-calendar-alt"></i>
                                                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles['empty-state']}>
                                <i className="fas fa-hand-paper"></i>
                                <h3>No donation requests</h3>
                                <p>You haven&apos;t requested any donations yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'received-donations' && (
                    <div className={styles['tab-content']}>
                        {receivedDonations.length > 0 ? (
                            <div className={styles['donations-list']}>
                                {receivedDonations.map(request => (
                                    <div key={request.id} className={styles['donation-row']}>
                                        <img 
                                            src={request.donationImage || '/placeholder-image.png'} 
                                            alt={request.donationTitle} 
                                            className={styles['row-image']}
                                        />
                                        <div className={styles['row-content']}>
                                            <div className={styles['row-header']}>
                                                <h3 className={styles['row-title']}>{request.donationTitle}</h3>
                                                <span className={`${styles['status-badge']} ${styles['status-received']}`}>Received</span>
                                            </div>
                                            <div className={styles['row-meta']}>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-tag"></i>
                                                    <span>{request.donationCategory}</span>
                                                </div>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-cube"></i>
                                                    <span>Qty: {request.quantity}</span>
                                                </div>
                                                <div className={styles['meta-item']}>
                                                    <i className="far fa-calendar-alt"></i>
                                                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles['empty-state']}>
                                <i className="fas fa-gift"></i>
                                <h3>No donations received yet</h3>
                                <p>You haven&apos;t received any completed donations yet. Once your approved requests are delivered, they will appear here.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
