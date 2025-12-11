'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminRoute from '../../../components/AdminRoute';
import styles from './donations.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';

interface Donation {
  id: string;
  category: string;
  description: string;
  quantity: string;
  userName: string;
  status: string;
  createdAt: string;
}

export default function DonationsManagement() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null);

  useEffect(() => {
    if (!user) return;

    const donationsRef = ref(db, 'donations');
    const unsubscribe = onValue(donationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const donationsList = Object.entries(data).map(([key, value]) => {
            const val = value as Record<string, string | number | undefined>;
            return {
                id: key,
                category: String(val.category || 'Unknown'),
                description: String(val.description || ''),
                quantity: String(val.quantity || '0'),
                userName: String(val.userName || 'Anonymous'),
                status: String(val.status || 'Listed'),
                createdAt: val.createdAt ? new Date(val.createdAt).toLocaleDateString() : 'N/A'
            };
        });
        setDonations(donationsList.reverse());
      } else {
        setDonations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteDonation = async (donationId: string) => {
    if (confirm('Are you sure you want to delete this donation listing? This action cannot be undone.')) {
      try {
        await remove(ref(db, `donations/${donationId}`));
        alert('Donation listing deleted successfully');
      } catch (error) {
        console.error('Error deleting donation:', error);
        alert('Failed to delete donation');
      }
    }
  };

  const handleEditClick = (donation: Donation) => {
      setCurrentDonation(donation);
      setIsEditModalOpen(true);
  };

  const handleSaveDonation = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentDonation) return;

      try {
          const donationRef = ref(db, `donations/${currentDonation.id}`);
          await update(donationRef, {
              category: currentDonation.category,
              description: currentDonation.description,
              quantity: currentDonation.quantity,
              status: currentDonation.status
          });
          setIsEditModalOpen(false);
          alert('Donation updated successfully');
      } catch (error) {
          console.error('Error updating donation:', error);
          alert('Failed to update donation');
      }
  };

  return (
    <AdminRoute>
      <div className={styles.container}>
        <Header />
        <AdminSidebar />
        <main className={styles.mainContent}>
          <h1 className={styles.title}>Manage Donations</h1>
          
          {loading ? (
            <p>Loading donations...</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Donor</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map(donation => (
                    <tr key={donation.id}>
                      <td>{donation.category}</td>
                      <td>
                          {donation.description.length > 30 
                            ? donation.description.substring(0, 30) + '...' 
                            : donation.description}
                      </td>
                      <td>{donation.quantity}</td>
                      <td>{donation.userName}</td>
                      <td>{donation.createdAt}</td>
                      <td>
                        <button 
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleEditClick(donation)}
                          title="Edit Donation"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteDonation(donation.id)}
                          title="Delete Donation"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {donations.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>No donations found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {isEditModalOpen && currentDonation && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Edit Donation</h2>
                <form onSubmit={handleSaveDonation}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select 
                      value={currentDonation.category} 
                      onChange={e => setCurrentDonation({...currentDonation, category: e.target.value})}
                    >
                      <option value="Plastic">Plastic</option>
                      <option value="Paper">Paper</option>
                      <option value="Glass">Glass</option>
                      <option value="Metal">Metal</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea 
                      value={currentDonation.description} 
                      onChange={e => setCurrentDonation({...currentDonation, description: e.target.value})}
                      required 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Quantity</label>
                    <input 
                      type="text" 
                      value={currentDonation.quantity} 
                      onChange={e => setCurrentDonation({...currentDonation, quantity: e.target.value})}
                      required 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select 
                      value={currentDonation.status} 
                      onChange={e => setCurrentDonation({...currentDonation, status: e.target.value})}
                    >
                      <option value="Listed">Listed</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
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
