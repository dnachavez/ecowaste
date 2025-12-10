'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './donations.module.css';
import { db } from '../../lib/firebase';
import { ref, query, orderByChild, equalTo, onValue, update, remove, runTransaction, get } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../lib/notifications';

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
  ownerName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  quantity: number;
  urgencyLevel?: string;
  projectId?: string;
  projectTitle?: string;
  deliveryStatus?: string;
  estimatedDeliveryDate?: string;
  estimatedPickupDate?: string;
  processingDate?: string;
  deliveredDate?: string;
  cancelledDate?: string;
  createdAt: number;
}

export default function DonationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('my-donations');
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [requestsForMe, setRequestsForMe] = useState<Request[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  
  // Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequestForStatus, setSelectedRequestForStatus] = useState<Request | null>(null);
  const [editStatusDate, setEditStatusDate] = useState('');
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequestForEdit, setSelectedRequestForEdit] = useState<Request | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUrgency, setEditUrgency] = useState<string>('Low');

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
           const req = {
             id: key,
             ...(value as Omit<Request, 'id'>)
           } as Request;

           // Backfill Project Title if missing
           if (req.projectId && !req.projectTitle) {
               get(ref(db, `projects/${req.projectId}`)).then((snap) => {
                   if (snap.exists()) {
                       update(ref(db, `requests/${key}`), { projectTitle: snap.val().title });
                   }
               });
           }

           return req;
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
           const req = {
             id: key,
             ...(value as Omit<Request, 'id'>)
           } as Request;

           // Backfill Owner Name if missing
           if (req.donationId && !req.ownerName) {
               get(ref(db, `donations/${req.donationId}`)).then((snap) => {
                   if (snap.exists()) {
                       update(ref(db, `requests/${key}`), { ownerName: snap.val().userName });
                   }
               });
           }

           return req;
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

  const handleUpdateStatus = async (request: Request, newStatus: string) => {
    if (newStatus === 'approved') {
        const donationRef = ref(db, `donations/${request.donationId}`);
        
        try {
            await runTransaction(donationRef, (currentDonation) => {
                if (currentDonation) {
                    const currentQty = parseFloat(currentDonation.quantity);
                    if (!isNaN(currentQty)) {
                         const newQty = currentQty - request.quantity;
                         currentDonation.quantity = newQty.toString();
                    }
                }
                return currentDonation;
            });
            
             const requestRef = ref(db, `requests/${request.id}`);
             await update(requestRef, { 
                 status: newStatus,
                 deliveryStatus: 'Pending Item',
                 processingDate: new Date().toISOString()
             });

             await createNotification(
                 request.requesterId,
                 'Request Approved',
                 `Your request for "${request.donationTitle}" has been approved!`,
                 'success',
                 request.id
             );

        } catch (error) {
            console.error("Error updating donation quantity:", error);
            alert("Failed to update donation quantity. Please try again.");
        }
    } else {
        const requestRef = ref(db, `requests/${request.id}`);
        update(requestRef, { status: newStatus })
          .then(() => {
              if (newStatus === 'rejected') {
                  createNotification(
                      request.requesterId,
                      'Request Rejected',
                      `Your request for "${request.donationTitle}" has been rejected.`,
                      'error',
                      request.id
                  );
              }
          })
          .catch((error) => console.error("Error updating status:", error));
    }
  };

  const handleSaveStatusUpdate = async (newStatus: string) => {
    if (!selectedRequestForStatus) return;
    
    try {
        const updates: Partial<Request> = {
            deliveryStatus: newStatus
        };

        let notificationMessage = '';
        let notificationTitle = '';

        if (newStatus === 'Ready for Pickup') {
            if (!editStatusDate) {
                alert("Please select a pickup date.");
                return;
            }
            updates.estimatedPickupDate = new Date(editStatusDate).toISOString();
            notificationTitle = 'Donation Ready for Pickup';
            notificationMessage = `Your request for "${selectedRequestForStatus.donationTitle}" is ready for pickup on ${new Date(editStatusDate).toLocaleDateString()}.`;
        } else if (newStatus === 'In Transit') {
             notificationTitle = 'Donation In Transit';
             notificationMessage = `Your request for "${selectedRequestForStatus.donationTitle}" is now in transit.`;
        } else if (newStatus === 'Delivered') {
            updates.deliveredDate = new Date().toISOString();
            updates.status = 'completed';
            notificationTitle = 'Donation Delivered';
            notificationMessage = `Your request for "${selectedRequestForStatus.donationTitle}" has been delivered!`;
        } else if (newStatus === 'Pending Item' && editStatusDate) {
             updates.estimatedDeliveryDate = new Date(editStatusDate).toISOString();
             notificationTitle = 'Delivery Update';
             notificationMessage = `The estimated delivery date for "${selectedRequestForStatus.donationTitle}" has been updated to ${new Date(editStatusDate).toLocaleDateString()}.`;
        }

        await update(ref(db, `requests/${selectedRequestForStatus.id}`), updates);
        
        if (notificationTitle) {
            await createNotification(
                selectedRequestForStatus.requesterId,
                notificationTitle,
                notificationMessage,
                'success',
                selectedRequestForStatus.id
            );
        }

        setShowStatusModal(false);
        setEditStatusDate('');
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status.");
    }
  };

  const handleEditRequest = (request: Request) => {
    setSelectedRequestForEdit(request);
    setEditQuantity(request.quantity);
    setEditUrgency(request.urgencyLevel || 'Low');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequestForEdit) return;
    
    try {
        const requestRef = ref(db, `requests/${selectedRequestForEdit.id}`);
        await update(requestRef, {
            quantity: editQuantity,
            urgencyLevel: editUrgency
        });
        setShowEditModal(false);
        setSelectedRequestForEdit(null);
    } catch (error) {
        console.error("Error updating request:", error);
        alert("Failed to update request.");
    }
  };

  const handleCancelRequest = async (request: Request) => {
    // Check if status is "Ready for Pickup" or further
    const nonCancellableStatuses = ['Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered'];
    if (request.deliveryStatus && nonCancellableStatuses.includes(request.deliveryStatus)) {
        alert("Cannot cancel request. It is already being processed.");
        return;
    }

    if (confirm("Are you sure you want to cancel this request?")) {
         const requestRef = ref(db, `requests/${request.id}`);
         
         // If it was approved, restore donation quantity
         if (request.status === 'approved') {
              const donationRef = ref(db, `donations/${request.donationId}`);
              
              // We use runTransaction to safely increment
              // Note: We don't await this strictly before updating status, but it's better to do so.
              // However, runTransaction can fail if permissions issues etc. 
              // Let's wrap in try-catch or just fire and forget with log.
              try {
                  await runTransaction(donationRef, (currentDonation) => {
                      if (currentDonation) {
                          const currentQty = parseFloat(currentDonation.quantity);
                          if (!isNaN(currentQty)) {
                               const newQty = currentQty + request.quantity;
                               currentDonation.quantity = newQty.toString();
                          }
                      }
                      return currentDonation;
                  });
              } catch (e) {
                  console.error("Failed to restore quantity", e);
              }
         }

         await update(requestRef, { 
             status: 'cancelled',
             deliveryStatus: 'Cancelled',
             cancelledDate: new Date().toISOString()
         });
         
         // If we are in the modal, close it
         setShowStatusModal(false);
    }
  };

  const handleDeleteRequest = (requestId: string) => {
    if (confirm("Are you sure you want to delete this request?")) {
        const requestRef = ref(db, `requests/${requestId}`);
        remove(requestRef)
            .catch((error) => console.error("Error deleting request:", error));
    }
  };

  const handleDeleteDonation = (donationId: string) => {
    if (confirm("Are you sure you want to delete this donation?")) {
        const donationRef = ref(db, `donations/${donationId}`);
        remove(donationRef)
            .catch((error) => console.error("Error deleting donation:", error));
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
                                        <div className={styles['row-actions']}>
                                            <button 
                                                className={styles['btn-view']}
                                                style={{backgroundColor: '#2e8b57', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px'}}
                                                onClick={() => router.push(`/homepage?donationId=${donation.id}`)}
                                            >
                                                View Details
                                            </button>
                                            <button 
                                                className={styles['btn-delete']}
                                                style={{backgroundColor: '#d32f2f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'}}
                                                onClick={() => handleDeleteDonation(donation.id)}
                                            >
                                                Delete
                                            </button>
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
                                                {request.projectTitle && (
                                                    <div className={styles['meta-item']}>
                                                        <i className="fas fa-project-diagram"></i>
                                                        <span>Project: {request.projectTitle}</span>
                                                    </div>
                                                )}
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
                                            {(request.status === 'approved' || request.status === 'completed') && (
                                                <div className={styles['delivery-info']} style={{marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px'}}>
                                                    <div className={styles['info-item']} style={{marginBottom: '5px'}}>
                                                        <strong>Delivery Status:</strong> {request.deliveryStatus || 'Pending'}
                                                    </div>
                                                    {request.estimatedDeliveryDate && (
                                                        <div className={styles['info-item']}>
                                                            <strong>Est. Delivery:</strong> {new Date(request.estimatedDeliveryDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles['row-actions']}>
                                            {request.status === 'pending' && (
                                                <>
                                                    <button 
                                                        className={styles['btn-approve']}
                                                        onClick={() => handleUpdateStatus(request, 'approved')}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        className={styles['btn-reject']}
                                                        onClick={() => handleUpdateStatus(request, 'rejected')}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {(request.status === 'approved' || request.status === 'completed') && (
                                                 <button
                                                    className={styles['btn-view']}
                                                    style={{backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px'}}
                                                    onClick={() => { setSelectedRequestForStatus(request); setShowStatusModal(true); }}
                                                 >
                                                    View Status
                                                 </button>
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
                                                <h3 className={styles['row-title']}>{request.donationTitle}</h3>
                                                <span className={`${styles['status-badge']} ${styles[`status-${request.status}`]}`}>{request.status}</span>
                                            </div>
                                            <div className={styles['row-meta']}>
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-user"></i>
                                                    <span>Donor: {request.ownerName || 'Unknown'}</span>
                                                </div>
                                                {request.projectTitle && (
                                                    <div className={styles['meta-item']}>
                                                        <i className="fas fa-project-diagram"></i>
                                                        <span>Project: {request.projectTitle}</span>
                                                    </div>
                                                )}
                                                {request.urgencyLevel && (
                                                    <div className={styles['meta-item']}>
                                                        <i className="fas fa-exclamation-circle"></i>
                                                        <span>Urgency: {request.urgencyLevel}</span>
                                                    </div>
                                                )}
                                                <div className={styles['meta-item']}>
                                                    <i className="fas fa-cube"></i>
                                                    <span>Qty: {request.quantity}</span>
                                                </div>
                                                <div className={styles['meta-item']}>
                                                    <i className="far fa-calendar-alt"></i>
                                                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            {(request.status === 'approved' || request.status === 'completed') && (
                                                <div className={styles['delivery-info']} style={{marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px'}}>
                                                    <div className={styles['info-item']}>
                                                        <strong>Delivery Status:</strong> {request.deliveryStatus || 'Pending'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles['row-actions']}>
                                            {request.status === 'pending' && (
                                                <>
                                                    <button 
                                                        className={styles['btn-view']}
                                                        style={{backgroundColor: '#FF9800', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px'}}
                                                        onClick={() => handleEditRequest(request)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className={styles['btn-reject']}
                                                        onClick={() => handleCancelRequest(request)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                            
                                            {(request.status === 'approved' || request.status === 'completed') && (
                                                <button
                                                    className={styles['btn-view']}
                                                    style={{backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'}}
                                                    onClick={() => { setSelectedRequestForStatus(request); setShowStatusModal(true); }}
                                                >
                                                    View Details
                                                </button>
                                            )}

                                            {(request.status === 'rejected' || request.status === 'cancelled') && (
                                                <button 
                                                    className={styles['btn-reject']}
                                                    onClick={() => handleDeleteRequest(request.id)}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            )}
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

            {/* Status Modal (View Details) */}
            {showStatusModal && selectedRequestForStatus && (
                <div className={styles['modal-overlay']}>
                    <div className={styles['modal-content']}>
                        <div className={styles['modal-header']}>
                            <h3>View Details</h3>
                            <button onClick={() => setShowStatusModal(false)} className={styles['close-btn']}>×</button>
                        </div>
                        <div className={styles['modal-body']}>
                            {/* Donation Image */}
                            <div style={{textAlign: 'center', marginBottom: '20px'}}>
                                <img 
                                    src={selectedRequestForStatus.donationImage || '/placeholder-image.png'} 
                                    alt={selectedRequestForStatus.donationTitle} 
                                    style={{width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px'}}
                                />
                                <h4 style={{marginTop: '10px'}}>{selectedRequestForStatus.donationTitle}</h4>
                            </div>

                            {/* Manage Status Section (For Donor) */}
                            {user && selectedRequestForStatus.ownerId === user.uid && selectedRequestForStatus.status !== 'cancelled' && (
                                <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee'}}>
                                    <h4 style={{marginTop: 0, marginBottom: '10px', color: '#2e8b57'}}>Manage Status</h4>
                                    
                                    <div style={{marginBottom: '10px'}}>
                                        <label style={{display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold'}}>Update Status To:</label>
                                        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                                            {['Pending Item', 'Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered'].map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => handleSaveStatusUpdate(status)}
                                                    disabled={status === selectedRequestForStatus.deliveryStatus}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        border: '1px solid #ccc',
                                                        backgroundColor: status === selectedRequestForStatus.deliveryStatus ? '#2e8b57' : 'white',
                                                        color: status === selectedRequestForStatus.deliveryStatus ? 'white' : '#333',
                                                        cursor: status === selectedRequestForStatus.deliveryStatus ? 'default' : 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{marginTop: '15px'}}>
                                        <label style={{display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold'}}>Set Date (for Pickup/Delivery):</label>
                                        <div style={{display: 'flex', gap: '10px'}}>
                                            <input 
                                                type="date" 
                                                value={editStatusDate}
                                                onChange={(e) => setEditStatusDate(e.target.value)}
                                                style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1}}
                                            />
                                            <button
                                                onClick={() => {
                                                    // Determine which date to update based on current or selected status
                                                    // For simplicity, let's say if they pick a date and click "Update Date", it updates the date for the CURRENT status
                                                    if (!editStatusDate) return;
                                                    handleSaveStatusUpdate(selectedRequestForStatus.deliveryStatus || 'Pending Item');
                                                }}
                                                style={{padding: '8px 16px', backgroundColor: '#2e8b57', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                                            >
                                                Update Date
                                            </button>
                                        </div>
                                        <p style={{fontSize: '11px', color: '#666', marginTop: '5px'}}>
                                            * Select a date and click &quot;Update Date&quot; to update the estimated date for the current status.
                                            <br/>
                                            * Or select a date THEN click a new status above (e.g. &quot;Ready for Pickup&quot;) to set the date with the status change.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className={styles['status-timeline']}>
                                {['Pending Item', 'Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered'].map((step, index) => {
                                    const currentStatus = selectedRequestForStatus.deliveryStatus || 'Pending Item';
                                    const statuses = ['Pending Item', 'Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered', 'Cancelled'];
                                    const currentIndex = statuses.indexOf(currentStatus);
                                    const stepIndex = statuses.indexOf(step);
                                    const isCompleted = stepIndex <= currentIndex && currentStatus !== 'Cancelled';
                                    
                                    return (
                                        <div key={step} className={`${styles['timeline-step']} ${isCompleted ? styles['completed'] : ''}`}>
                                            <div className={styles['step-icon']}>
                                                {isCompleted ? <i className="fas fa-check-circle"></i> : <i className="far fa-circle"></i>}
                                            </div>
                                            <div className={styles['step-info']}>
                                                <h4>{step}</h4>
                                                {step === 'Pending Item' && selectedRequestForStatus.processingDate && isCompleted && <span className={styles['step-date']}>{new Date(selectedRequestForStatus.processingDate).toLocaleDateString()}</span>}
                                                {step === 'Ready for Pickup' && selectedRequestForStatus.estimatedPickupDate && <span className={styles['step-date']}>Est: {new Date(selectedRequestForStatus.estimatedPickupDate).toLocaleDateString()}</span>}
                                                {step === 'Delivered' && selectedRequestForStatus.deliveredDate && <span className={styles['step-date']}>Delivered: {new Date(selectedRequestForStatus.deliveredDate).toLocaleDateString()}</span>}
                                                {step === 'Delivered' && !selectedRequestForStatus.deliveredDate && selectedRequestForStatus.estimatedDeliveryDate && <span className={styles['step-date']}>Est: {new Date(selectedRequestForStatus.estimatedDeliveryDate).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {selectedRequestForStatus.deliveryStatus === 'Cancelled' && (
                                    <div className={`${styles['timeline-step']} ${styles['cancelled']}`}>
                                        <div className={styles['step-icon']}><i className="fas fa-times-circle"></i></div>
                                        <div className={styles['step-info']}>
                                            <h4>Cancelled</h4>
                                            {selectedRequestForStatus.cancelledDate && <span className={styles['step-date']}>{new Date(selectedRequestForStatus.cancelledDate).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cancel Button in View Details */}
                             {activeTab === 'my-requests' && selectedRequestForStatus.status !== 'cancelled' && (
                                <div style={{marginTop: '20px', textAlign: 'right'}}>
                                    <button 
                                        className={styles['btn-reject']}
                                        style={{
                                            padding: '10px 20px',
                                            opacity: (['Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered'].includes(selectedRequestForStatus.deliveryStatus || '')) ? 0.5 : 1,
                                            cursor: (['Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered'].includes(selectedRequestForStatus.deliveryStatus || '')) ? 'not-allowed' : 'pointer'
                                        }}
                                        disabled={['Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered'].includes(selectedRequestForStatus.deliveryStatus || '')}
                                        onClick={() => handleCancelRequest(selectedRequestForStatus)}
                                    >
                                        Cancel Request
                                    </button>
                                    {['Ready for Pickup', 'At Sorting Facility', 'In Transit', 'Delivered'].includes(selectedRequestForStatus.deliveryStatus || '') && (
                                        <p style={{fontSize: '12px', color: '#999', marginTop: '5px'}}>
                                            Cannot cancel after processing has started.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Request Modal */}
            {showEditModal && selectedRequestForEdit && (
                <div className={styles['modal-overlay']}>
                    <div className={styles['modal-content']}>
                        <div className={styles['modal-header']}>
                            <h3>Edit Request</h3>
                            <button onClick={() => setShowEditModal(false)} className={styles['close-btn']}>×</button>
                        </div>
                        <div className={styles['modal-body']}>
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Quantity</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(parseInt(e.target.value))}
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                                />
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Urgency Level</label>
                                <select 
                                    value={editUrgency}
                                    onChange={(e) => setEditUrgency(e.target.value)}
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                                <button 
                                    onClick={() => setShowEditModal(false)}
                                    style={{padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', cursor: 'pointer'}}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    style={{padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#2e8b57', color: 'white', cursor: 'pointer'}}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
