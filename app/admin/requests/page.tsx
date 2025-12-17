'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminRoute from '../../../components/AdminRoute';
import styles from './requests.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue, update, remove, get } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';
import { incrementAction } from '../../../lib/gamification';

interface UserData {
  fullName?: string;
  displayName?: string;
  email?: string;
}

interface DonationData {
  category?: string;
  description?: string;
  quantity?: string;
}

interface Request {
  id: string;
  donationId: string;
  requesterId: string;
  ownerId: string;
  status: string;
  deliveryStatus?: string;
  quantityClaim: number;
  pickupDate?: string;
  deliveryDate?: string;
  createdAt: number;
}

export default function RequestsManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [usersData, setUsersData] = useState<Record<string, UserData>>({});
  const [donationsData, setDonationsData] = useState<Record<string, DonationData>>({});
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<Request | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch Users
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setUsersData(snapshot.val());
      }
    });

    // Fetch Donations
    const donationsRef = ref(db, 'donations');
    onValue(donationsRef, (snapshot) => {
      if (snapshot.exists()) {
        setDonationsData(snapshot.val());
      }
    });

    // Fetch Requests
    const requestsRef = ref(db, 'requests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsList = Object.entries(data).map(([key, value]) => {
          const val = value as any;
          return {
            id: key,
            ...val,
            // Handle potential missing quantityClaim by checking quantity
            quantityClaim: val.quantityClaim || val.quantity || 0
          };
        });
        setRequests(requestsList.reverse());
      } else {
        setRequests([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleEditClick = (request: Request) => {
    setCurrentRequest(request);
    setIsEditModalOpen(true);
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      try {
        await remove(ref(db, `requests/${requestId}`));
        alert('Request deleted successfully');
      } catch (error) {
        console.error('Error deleting request:', error);
        alert('Failed to delete request');
      }
    }
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRequest) return;

    try {
      const originalRequest = requests.find(r => r.id === currentRequest.id);

      // Auto-complete logic: If Delivery Status is Delivered, request must be completed.
      let newStatus = currentRequest.status;
      let newDeliveryStatus = currentRequest.deliveryStatus || '';

      if (newDeliveryStatus === 'Delivered') {
        newStatus = 'completed';
      }

      // Reciprocal: If status is completed, force delivery status to Delivered
      if (newStatus === 'completed') {
        newDeliveryStatus = 'Delivered';
      }

      const isCompleting = newStatus === 'completed' && originalRequest?.status !== 'completed';

      const updates: Partial<Request> = {
        pickupDate: currentRequest.pickupDate || '',
        deliveryDate: currentRequest.deliveryDate || '',
        status: newStatus,
        deliveryStatus: newDeliveryStatus
      };

      if (newStatus === 'completed' && !updates.deliveryDate) {
        updates.deliveryDate = new Date().toISOString();
      }

      const requestRef = ref(db, `requests/${currentRequest.id}`);
      await update(requestRef, updates);

      if (isCompleting) {
        // Award XP to donor
        await incrementAction(currentRequest.ownerId, 'donate', 1);
      }

      setIsEditModalOpen(false);
      alert('Request updated successfully');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request');
    }
  };

  const handleSyncDonationCounts = async () => {
    if (!confirm('This will recalculate "Total Donations" for ALL users based on their ACTIVE LISTINGS in "My Donations". This aligns the count with the "My Donations" tab. Continue?')) return;

    setLoading(true);
    try {
      // 1. Fetch all donations (Listings)
      const donationsRef = ref(db, 'donations');
      const snap = await import('firebase/database').then(m => m.get(donationsRef));
      const donationsData = snap.val() || {};

      // 2. Count listings per user
      const userDonationCounts: Record<string, number> = {};

      Object.values(donationsData).forEach((donation: any) => {
        if (donation.userId) {
          userDonationCounts[donation.userId] = (userDonationCounts[donation.userId] || 0) + 1;
        }
      });

      // 3. Update Users
      const usersRef = ref(db, 'users');
      const usersSnap = await import('firebase/database').then(m => m.get(usersRef));
      const usersData = usersSnap.val() || {};

      const updatePromises = Object.keys(usersData).map(async (userId) => {
        const correctCount = userDonationCounts[userId] || 0;
        const currentCount = usersData[userId].donationCount;

        if (currentCount !== correctCount) {
          await update(ref(db, `users/${userId}`), { donationCount: correctCount });
          return 1;
        }
        return 0;
      });

      const results = await Promise.all(updatePromises);
      const updatedCount = results.reduce((a: number, b) => a + b, 0);

      alert(`Sync Complete! Updated donation counts for ${updatedCount} users.`);

    } catch (error) {
      console.error("Error syncing donation counts:", error);
      alert("Failed to sync donation counts.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminRoute>
      <Header />

      <div className={styles.container}>
        <AdminSidebar />
        <main className={styles.mainContent}>
          <div className={styles.headerActions} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 className={styles.title} style={{ margin: 0 }}>Manage Requests</h1>
            <button
              onClick={handleSyncDonationCounts}
              className={styles.saveBtn}
              style={{ backgroundColor: '#ff9800', marginLeft: '15px' }}
            >
              <i className="fas fa-sync" style={{ marginRight: '8px' }}></i>
              Sync Donation Counts
            </button>
          </div>

          {loading ? (
            <p>Loading requests...</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Donator</th>
                    <th>Requester</th>
                    <th>Solid Waste</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Delivery Status</th>
                    <th>Pickup Date</th>
                    <th>Delivery Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(request => {
                    const donator = usersData[request.ownerId]?.fullName || usersData[request.ownerId]?.displayName || 'Unknown';
                    const requester = usersData[request.requesterId]?.fullName || usersData[request.requesterId]?.displayName || 'Unknown';
                    const donation = donationsData[request.donationId];
                    const solidWaste = donation
                      ? `${donation.category || 'Unknown'} - ${donation.description || ''}`
                      : 'Unknown Item';

                    return (
                      <tr key={request.id}>
                        <td>{donator}</td>
                        <td>{requester}</td>
                        <td>{solidWaste}</td>
                        <td>{request.quantityClaim}</td>
                        <td>{request.status}</td>
                        <td>{request.deliveryStatus || '-'}</td>
                        <td>{request.pickupDate || 'N/A'}</td>
                        <td>{request.deliveryDate || 'N/A'}</td>
                        <td>
                          <button
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            onClick={() => handleEditClick(request)}
                            title="Edit Dates"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDeleteRequest(request.id)}
                            title="Delete Request"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>No requests found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {isEditModalOpen && currentRequest && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Update Request Logistics</h2>
                <form onSubmit={handleSaveRequest}>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      value={currentRequest.status}
                      onChange={e => setCurrentRequest({ ...currentRequest, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Delivery Status (Managed by Donor)</label>
                    <input
                      type="text"
                      value={currentRequest.deliveryStatus || 'Pending'}
                      disabled
                      className={styles.readOnlyInput}
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Pickup Date</label>
                    <input
                      type="date"
                      value={currentRequest.pickupDate || ''}
                      onChange={e => setCurrentRequest({ ...currentRequest, pickupDate: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Delivery Date (Set by Donor)</label>
                    <input
                      type="date"
                      value={currentRequest.deliveryDate || ''}
                      disabled
                      className={styles.readOnlyInput}
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
