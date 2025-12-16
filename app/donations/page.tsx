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
import { incrementAction } from '../../lib/gamification';

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
    materialId?: string;
    deliveryStatus?: string;
    estimatedDeliveryDate?: string;
    estimatedPickupDate?: string;
    pickupDate?: string;
    deliveryDate?: string;
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

    // Feedback state
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [ratingError, setRatingError] = useState(false);
    const [textError, setTextError] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRequestForEdit, setSelectedRequestForEdit] = useState<Request | null>(null);
    const [editQuantity, setEditQuantity] = useState<number>(1);
    const [editUrgency, setEditUrgency] = useState<string>('Low');

    // Approval Modal State
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<Request | null>(null);
    const [approvalDate, setApprovalDate] = useState<string>('');

    // Receiver Confirmation Modal State
    const [showReceiverConfirmationModal, setShowReceiverConfirmationModal] = useState(false);
    const [selectedRequestForConfirmation, setSelectedRequestForConfirmation] = useState<Request | null>(null);

    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let valid = true;
        if (rating === 0) {
            setRatingError(true);
            valid = false;
        } else {
            setRatingError(false);
        }

        if (feedbackText.trim() === '') {
            setTextError(true);
            valid = false;
        } else {
            setTextError(false);
        }

        if (!valid) return;

        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitSuccess(true);

            // Reset and close after 3 seconds
            setTimeout(() => {
                setIsFeedbackOpen(false);
                setSubmitSuccess(false);
                setRating(0);
                setFeedbackText('');
            }, 3000);
        }, 1500);
    };

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
                const loadedRequests = Object.entries(data).map(([key, value]) => ({
                    id: key,
                    ...(value as Omit<Request, 'id'>)
                } as Request));

                // Resolve requester names by reading users/{requesterId} and backfill the requests if needed
                (async () => {
                    const resolved = await Promise.all(loadedRequests.map(async (req) => {
                        try {
                            if (req.requesterId) {
                                const userSnap = await get(ref(db, `users/${req.requesterId}`));
                                if (userSnap.exists()) {
                                    const userData = userSnap.val();
                                    const preferredName = userData.fullName || userData.displayName || userData.userName || userData.name || '';
                                    if (preferredName && preferredName !== req.requesterName) {
                                        // Update the requests node so future reads have the correct name
                                        try {
                                            await update(ref(db, `requests/${req.id}`), { requesterName: preferredName });
                                            req.requesterName = preferredName;
                                        } catch (e) {
                                            // If update fails, still set locally so UI shows correct name
                                            req.requesterName = preferredName;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Failed to resolve requester name for request', req.id, e);
                        }
                        return req;
                    }));

                    setRequestsForMe(resolved.reverse());
                })();
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
        console.log('[APPROVAL] Starting approval process for request:', { requestId: request.id, newStatus, donationId: request.donationId, projectId: request.projectId });

        if (newStatus === 'approved') {
            setSelectedRequestForApproval(request);
            setApprovalDate(new Date().toISOString().split('T')[0]); // Default to today
            setShowApprovalModal(true);
            return;
        }

        if (newStatus === 'rejected') {
            const requestRef = ref(db, `requests/${request.id}`);
            try {
                await update(requestRef, { status: newStatus });
                await createNotification(
                    request.requesterId,
                    'Request Rejected',
                    `Your request for "${request.donationTitle}" has been rejected.`,
                    'error',
                    request.id
                );
            } catch (error) {
                console.error("Error updating status or sending notification:", error);
            }
        } else {
            // Updated logic for completion and other statuses
            const updates: Record<string, unknown> = { status: newStatus };

            if (newStatus === 'completed') {
                updates.deliveryStatus = 'Delivered';
                updates.deliveredDate = new Date().toISOString();

                // Increment donation count for the DONOR (owner)
                // Note: incrementAction handles XP/EcoPoints awarding too
                try {
                    console.log(`[DONATION_COMPLETE] Awarding points to donor: ${request.ownerId}`);
                    await incrementAction(request.ownerId, 'donate', 1);
                } catch (e) {
                    console.error("Error incrementing donor stats:", e);
                }
            }

            const requestRef = ref(db, `requests/${request.id}`);
            update(requestRef, updates)
                .then(async () => {
                    // Notification Logic
                    if (newStatus === 'completed') {
                        // Notify Donor that their item was received
                        await createNotification(
                            request.ownerId,
                            'Donation Received',
                            `Good news! ${request.requesterName} has received your donation "${request.donationTitle}". You earned Eco Points!`,
                            'success',
                            request.id
                        );
                    }
                })
                .catch((error) => console.error("Error updating status:", error));
        }
    };

    // Existing logic for approval moved here
    const confirmApproval = async () => {
        if (!selectedRequestForApproval || !approvalDate) return;

        const request = selectedRequestForApproval;
        const newStatus = 'approved';

        const donationRef = ref(db, `donations/${request.donationId}`);
        // ... rest of approval logic from original handleUpdateStatus ...
        const qtyToSubtract = Number(request.quantity) || 0;

        // Try safe transaction first, fallback to single-get+update if transaction fails.
        try {
            const donationTxResult = await runTransaction(donationRef, (currentDonation) => {
                if (currentDonation) {
                    const currentQty = Number(currentDonation.quantity) || 0;
                    const newQty = currentQty - qtyToSubtract;
                    currentDonation.quantity = newQty.toString();
                }
                return currentDonation;
            });
            console.log('[DONATION_UPDATE] runTransaction result:', { committed: donationTxResult?.committed, value: donationTxResult?.snapshot?.val() });
        } catch (txErr) {
            console.error('[DONATION_UPDATE] runTransaction failed, attempting fallback update:', txErr);
            try {
                const snap = await get(donationRef);
                if (snap.exists()) {
                    const currentQty = Number(snap.val().quantity) || 0;
                    const newQty = currentQty - qtyToSubtract;
                    await update(donationRef, { quantity: newQty.toString() });
                } else {
                    console.warn('Donation not found for fallback:', request.donationId);
                }
            } catch (fallbackErr) {
                console.error('Fallback donation update failed:', fallbackErr);
            }
        }

        // Proceed to update request status even if donation quantity update had issues
        const requestRef = ref(db, `requests/${request.id}`);
        try {
            await update(requestRef, {
                status: newStatus,
                deliveryStatus: 'Scheduled', // Changed from Pending Item
                deliveryDate: approvalDate, // Set the date from modal
                processingDate: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to update request status after approval:', err);
        }

        // ... project material update ...
        if (request.projectId && request.quantity) {
            // ... (copy existing project update logic) ...
            console.log('[MATERIAL_UPDATE] Starting material update for request:', { projectId: request.projectId, quantity: request.quantity, donationTitle: request.donationTitle });
            try {
                const projectRef = ref(db, `projects/${request.projectId}`);
                const projectSnap = await get(projectRef);
                const snapshot = projectSnap.val();

                if (snapshot && snapshot.materials) {
                    const materials = snapshot.materials;
                    let targetMaterialId: string | null = null;

                    // Strategy 1: Direct ID Match
                    if (request.materialId && materials[request.materialId]) {
                        targetMaterialId = request.materialId;
                    }

                    // Strategy 2: Name Match (Fallback)
                    if (!targetMaterialId) {
                        for (const matId in materials) {
                            const material = materials[matId];
                            const matName = (material.name || '').toString().toLowerCase();
                            const reqTitle = (request.donationTitle || '').toString().toLowerCase();
                            if (matName.includes(reqTitle) || reqTitle.includes(matName)) {
                                targetMaterialId = matId;
                                break;
                            }
                        }
                    }

                    if (targetMaterialId) {
                        const materialAcquiredRef = ref(db, `projects/${request.projectId}/materials/${targetMaterialId}/acquired`);
                        const added = Number(request.quantity) || 0;
                        try {
                            await runTransaction(materialAcquiredRef, (current) => {
                                return (Number(current) || 0) + added;
                            });
                        } catch (txErr) {
                            const matSnap = await get(ref(db, `projects/${request.projectId}/materials/${targetMaterialId}/acquired`));
                            const cur = matSnap.exists() ? Number(matSnap.val()) || 0 : 0;
                            await update(ref(db, `projects/${request.projectId}/materials/${targetMaterialId}`), { acquired: cur + added });
                        }
                    }
                }
            } catch (err) {
                console.error('[MATERIAL_UPDATE] Failed to update project material after approval:', err);
            }
        }

        try {
            await createNotification(
                request.requesterId,
                'Request Approved',
                `Your request for "${request.donationTitle}" has been approved! Delivery scheduled for ${new Date(approvalDate).toLocaleDateString()}.`,
                'success',
                request.id
            );
        } catch (nErr) {
            console.error('[APPROVAL] Failed to create approval notification:', nErr);
        }

        setShowApprovalModal(false);
        setSelectedRequestForApproval(null);
    };

    const handleMarkAsReceived = (request: Request) => {
        setSelectedRequestForConfirmation(request);
        setShowReceiverConfirmationModal(true);
    };

    const confirmReceipt = () => {
        if (selectedRequestForConfirmation) {
            handleUpdateStatus(selectedRequestForConfirmation, 'completed');
            setShowReceiverConfirmationModal(false);
            setSelectedRequestForConfirmation(null);
        }
    };

    const handlePingRequester = async (request: Request) => {
        try {
            await createNotification(
                request.requesterId,
                'Delivery Confirmation Needed',
                `The donor (${request.ownerName || 'Donor'}) is asking if you have received the donation "${request.donationTitle}". Please mark it as received if you have.`,
                'warning',
                request.id
            );
            alert('Ping sent successfully!');
        } catch (e) {
            console.error('Failed to ping requester:', e);
            alert('Failed to send ping.');
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
            <Header />

            <div className={styles.container}>
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
                                                        style={{ backgroundColor: '#2e8b57', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}
                                                        onClick={() => router.push(`/homepage?donationId=${donation.id}`)}
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        className={styles['btn-delete']}
                                                        style={{ backgroundColor: '#d32f2f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
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
                                                        <div className={styles['delivery-info']} style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                                            <div className={styles['info-item']} style={{ marginBottom: '5px' }}>
                                                                <strong>Delivery Status:</strong> {request.deliveryStatus || 'Pending'}
                                                            </div>
                                                            {(request.pickupDate || request.estimatedPickupDate) && (
                                                                <div className={styles['info-item']} style={{ marginBottom: '5px' }}>
                                                                    <strong>Pickup Date:</strong> {new Date(request.pickupDate || request.estimatedPickupDate || '').toLocaleDateString()}
                                                                </div>
                                                            )}
                                                            {(request.deliveryDate || request.estimatedDeliveryDate) && (
                                                                <div className={styles['info-item']}>
                                                                    <strong>Delivery Date:</strong> {new Date(request.deliveryDate || request.estimatedDeliveryDate || '').toLocaleDateString()}
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
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            <button
                                                                className={styles['btn-view']}
                                                                style={{ backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                                                onClick={() => { setSelectedRequestForStatus(request); setShowStatusModal(true); }}
                                                            >
                                                                View Status
                                                            </button>
                                                            {request.status === 'approved' && request.deliveryDate && new Date(request.deliveryDate) < new Date() && (
                                                                <button
                                                                    className={styles['btn-view']}
                                                                    style={{ backgroundColor: '#FF9800', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                                                    onClick={() => handlePingRequester(request)}
                                                                >
                                                                    Ping Requester
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* delete button removed per UX request */}
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
                                                        <div className={styles['delivery-info']} style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                                            <div className={styles['info-item']} style={{ marginBottom: '5px' }}>
                                                                <strong>Delivery Status:</strong> {request.deliveryStatus || 'Pending'}
                                                            </div>
                                                            {(request.deliveryDate || request.estimatedDeliveryDate) && (
                                                                <div className={styles['info-item']}>
                                                                    <strong>Delivery Date:</strong> {new Date(request.deliveryDate || request.estimatedDeliveryDate || '').toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles['row-actions']}>
                                                    {request.status === 'pending' && (
                                                        <>
                                                            <button
                                                                className={styles['btn-view']}
                                                                style={{ backgroundColor: '#FF9800', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
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
                                                        <>
                                                            <button
                                                                className={styles['btn-view']}
                                                                style={{ backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                                                                onClick={() => { setSelectedRequestForStatus(request); setShowStatusModal(true); }}
                                                            >
                                                                View Details
                                                            </button>
                                                            {request.status === 'approved' && (
                                                                <button
                                                                    className={styles['btn-view']}
                                                                    style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                                                    onClick={() => handleMarkAsReceived(request)}
                                                                >
                                                                    Mark as Received
                                                                </button>
                                                            )}
                                                        </>
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
                                    <h3 style={{ color: '#2e8b57', margin: 0 }}>View Details</h3>
                                    <button onClick={() => setShowStatusModal(false)} className={styles['close-btn']}>×</button>
                                </div>
                                <div className={styles['modal-body']}>
                                    {/* Donation Image */}
                                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                        <img
                                            src={selectedRequestForStatus.donationImage || '/placeholder-image.png'}
                                            alt={selectedRequestForStatus.donationTitle}
                                            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                                        />
                                        <h4 style={{ marginTop: '10px', fontSize: '18px', color: '#333' }}>{selectedRequestForStatus.donationTitle}</h4>
                                    </div>

                                    <div className={styles['status-section']} style={{ padding: '15px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '20px' }}>
                                        {user?.uid === selectedRequestForStatus.ownerId ? (
                                            // DONOR VIEW
                                            <>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Status</h4>
                                                <p style={{
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    color: selectedRequestForStatus.status === 'completed' ? '#4caf50' : '#ff9800'
                                                }}>
                                                    {selectedRequestForStatus.status === 'completed'
                                                        ? "(Received by the requester)"
                                                        : "(Not yet received by the requester)"}
                                                </p>

                                                {/* Ping Logic for Donor inside Modal */}
                                                {selectedRequestForStatus.status === 'approved' &&
                                                    selectedRequestForStatus.deliveryDate &&
                                                    new Date(selectedRequestForStatus.deliveryDate) < new Date() && (
                                                        <div style={{ marginTop: '15px' }}>
                                                            <p style={{ fontSize: '14px', color: '#d32f2f', marginBottom: '8px' }}>
                                                                <i className="fas fa-exclamation-circle"></i> Delivery date exceeded.
                                                            </p>
                                                            <button
                                                                onClick={() => handlePingRequester(selectedRequestForStatus)}
                                                                style={{
                                                                    background: '#FF9800',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '8px 16px',
                                                                    borderRadius: '20px',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '600',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px'
                                                                }}
                                                            >
                                                                <i className="fas fa-bell"></i> Ping Requester
                                                            </button>
                                                        </div>
                                                    )}
                                            </>
                                        ) : (
                                            // REQUESTER VIEW
                                            <>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Status</h4>
                                                <p style={{
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    color: '#2196F3'
                                                }}>
                                                    {selectedRequestForStatus.status === 'approved'
                                                        ? "On the way"
                                                        : selectedRequestForStatus.status === 'completed'
                                                            ? "Received"
                                                            : selectedRequestForStatus.status}
                                                </p>
                                                {selectedRequestForStatus.status === 'approved' && (
                                                    <p style={{ fontSize: '13px', color: '#777', marginTop: '5px' }}>
                                                        Your donation request has been approved and is on its way.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Additional Info */}
                                    {(selectedRequestForStatus.deliveryDate || selectedRequestForStatus.pickupDate) && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ marginBottom: '5px' }}>
                                                <strong>Scheduled Date:</strong> {new Date(selectedRequestForStatus.deliveryDate || selectedRequestForStatus.pickupDate || '').toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}

                                    {/* Cancel Button (Requester Only) - Disabled/Hidden if approved */}
                                    {user?.uid === selectedRequestForStatus.requesterId && selectedRequestForStatus.status === 'pending' && (
                                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                            <button
                                                className={styles['btn-reject']}
                                                onClick={() => handleCancelRequest(selectedRequestForStatus)}
                                            >
                                                Cancel Request
                                            </button>
                                        </div>
                                    )}
                                    {user?.uid === selectedRequestForStatus.requesterId && selectedRequestForStatus.status === 'approved' && (
                                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                            <button
                                                className={styles['btn-confirm']}
                                                style={{ background: '#4caf50', padding: '10px 20px', borderRadius: '25px' }}
                                                onClick={() => {
                                                    setShowStatusModal(false);
                                                    handleMarkAsReceived(selectedRequestForStatus);
                                                }}
                                            >
                                                Mark as Received
                                            </button>
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
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editQuantity}
                                            onChange={(e) => setEditQuantity(parseInt(e.target.value))}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Urgency Level</label>
                                        <select
                                            value={editUrgency}
                                            onChange={(e) => setEditUrgency(e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button
                                            onClick={() => setShowEditModal(false)}
                                            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#2e8b57', color: 'white', cursor: 'pointer' }}
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

            {/* Feedback Button */}
            <div className={styles.feedbackBtn} onClick={() => setIsFeedbackOpen(true)}>💬</div>

            {/* Feedback Modal */}
            {
                isFeedbackOpen && (
                    <div className={styles.feedbackModal} onClick={(e) => {
                        if (e.target === e.currentTarget) setIsFeedbackOpen(false);
                    }}>
                        <div className={styles.feedbackContent}>
                            <span className={styles.feedbackCloseBtn} onClick={() => setIsFeedbackOpen(false)}>×</span>

                            {!submitSuccess ? (
                                <div className={styles.feedbackForm}>
                                    <h3>Share Your Feedback</h3>
                                    <div className={styles.emojiRating}>
                                        {[
                                            { r: 1, e: '😞', l: 'Very Sad' },
                                            { r: 2, e: '😕', l: 'Sad' },
                                            { r: 3, e: '😐', l: 'Neutral' },
                                            { r: 4, e: '🙂', l: 'Happy' },
                                            { r: 5, e: '😍', l: 'Very Happy' }
                                        ].map((option) => (
                                            <div
                                                key={option.r}
                                                className={`${styles.emojiOption} ${rating === option.r ? styles.selected : ''}`}
                                                onClick={() => {
                                                    setRating(option.r);
                                                    setRatingError(false);
                                                }}
                                            >
                                                <span className={styles.emoji}>{option.e}</span>
                                                <span className={styles.emojiLabel}>{option.l}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {ratingError && <div className={styles.errorMessage} style={{ display: 'block' }}>Please select a rating</div>}

                                    <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                                    <textarea
                                        placeholder="Your feedback helps us make EcoWaste better..."
                                        value={feedbackText}
                                        onChange={(e) => {
                                            setFeedbackText(e.target.value);
                                            setTextError(false);
                                        }}
                                    ></textarea>
                                    {textError && <div className={styles.errorMessage} style={{ display: 'block' }}>Please provide your feedback</div>}

                                    <button
                                        type="submit"
                                        className={styles.feedbackSubmitBtn}
                                        onClick={handleFeedbackSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                Submitting... <div className={styles.spinner}></div>
                                            </>
                                        ) : 'Submit Feedback'}
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.thankYouMessage} style={{ display: 'block' }}>
                                    <span className={styles.thankYouEmoji}>🎉</span>
                                    <h3>Thank You!</h3>
                                    <p>We appreciate your feedback and will use it to improve EcoWaste.</p>
                                    <p>Your opinion matters to us!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            {showApprovalModal && (
                <div className={styles['modal-overlay']}>
                    <div className={styles['modal-content']}>
                        <h3>Approve Donation Request</h3>
                        <p>Set a delivery/pickup date for this donation.</p>

                        <div className={styles['form-group']}>
                            <label>Delivery/Pickup Date</label>
                            <input
                                type="date"
                                value={approvalDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setApprovalDate(e.target.value)}
                                className={styles['form-input']}
                            />
                        </div>

                        <div className={styles['modal-actions']}>
                            <button
                                className={styles['btn-cancel']}
                                onClick={() => setShowApprovalModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles['btn-confirm']}
                                onClick={confirmApproval}
                            >
                                Confirm Approval
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receiver Confirmation Modal */}
            {showReceiverConfirmationModal && selectedRequestForConfirmation && (
                <div className={styles['modal-overlay']}>
                    <div className={styles['modal-content']} style={{ maxWidth: '450px', borderRadius: '15px', overflow: 'hidden' }}>
                        <div style={{ background: '#4caf50', padding: '20px', textAlign: 'center', color: 'white' }}>
                            <i className="fas fa-check-circle" style={{ fontSize: '40px', marginBottom: '10px' }}></i>
                            <h3 style={{ margin: 0, fontSize: '22px' }}>Confirm Receipt</h3>
                        </div>
                        <div style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#555', marginBottom: '20px', lineHeight: '1.5' }}>
                                Are you sure you have received <strong>{selectedRequestForConfirmation.donationTitle}</strong>?
                            </p>
                            <p style={{ fontSize: '14px', color: '#888', marginBottom: '30px' }}>
                                This will complete the request and award points to the donor. This action cannot be undone.
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                                <button
                                    onClick={() => setShowReceiverConfirmationModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '25px',
                                        background: 'white',
                                        color: '#666',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmReceipt}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        border: 'none',
                                        borderRadius: '25px',
                                        background: '#4caf50',
                                        color: 'white',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)'
                                    }}
                                >
                                    Yes, Received
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}
