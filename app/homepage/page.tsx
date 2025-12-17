'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './homepage.module.css';
import { db } from '../../lib/firebase';
import { ref, push, onValue } from 'firebase/database';
import { getUserDisplayAvatar, incrementAction } from '../../lib/gamification';

import RecycledIdeaPopup, { RecycledIdea, ProjectMaterial, Step } from '../../components/RecycledIdeaPopup';

interface Comment {
  id: string;
  author: string;
  text: string;
  time: string;
}

interface Donation {
  id: string;
  user: { name: string; avatar: string | null; id: string };
  category: string;
  subCategory: string;
  timeAgo: string;
  quantity: string;
  unit: string;
  description: string;
  images: string[];
  comments: Comment[];
}

interface FirebaseDonation {
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
  comments?: Record<string, Omit<Comment, 'id'>>;
}

interface FirebaseProject {
  id: string;
  title: string;
  description: string;
  authorId?: string;
  authorName: string;
  createdAt: string;
  final_images?: string[];
  visibility?: 'private' | 'public';
  status?: string;
  materials?: ProjectMaterial[];
  workflow_stage?: number;
  steps?: Step[];
}

interface FirebaseUser {
  fullName: string;
  email: string;
  avatar?: string;
}

function HomepageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const donationId = searchParams.get('donationId');
  const [activeTab, setActiveTab] = useState('donations');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [textError, setTextError] = useState(false);

  // Popup state
  const [showDonationPopup, setShowDonationPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [showRequestSuccessPopup, setShowRequestSuccessPopup] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [showIdeaPopup, setShowIdeaPopup] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<RecycledIdea | null>(null);

  const [recycledIdeas, setRecycledIdeas] = useState<RecycledIdea[]>([]);

  // Request Form state
  const [requestFormData, setRequestFormData] = useState({
    quantityClaim: 1,
    projectId: '',
    urgencyLevel: 'High'
  });

  // Form state
  const [formData, setFormData] = useState({
    wasteType: '',
    otherWaste: '',
    subcategory: '',
    quantity: '',
    description: '',
    photos: [] as File[]
  });

  const [donations, setDonations] = useState<Donation[]>([]);
  const [userProjects, setUserProjects] = useState<{ id: string, title: string, description: string, date: string }[]>([]);
  const [quickStats, setQuickStats] = useState({ recycled: 0, donated: 0 });

  // Raw data for leaderboard calculation
  const [rawUsers, setRawUsers] = useState<Record<string, FirebaseUser>>({});
  const [rawDonations, setRawDonations] = useState<Record<string, FirebaseDonation>>({});
  const [rawProjects, setRawProjects] = useState<Record<string, FirebaseProject>>({});

  const subcategories: Record<string, string[]> = {
    Plastic: ["Plastic Bottles", "Plastic Containers", "Plastic Bags", "Wrappers"],
    Paper: ["Newspapers", "Cardboard", "Magazines", "Office Paper"],
    Glass: ["Glass Bottles", "Glass Jars", "Broken Glassware"],
    Metal: ["Aluminum Cans", "Tin Cans", "Scrap Metal"],
    Electronic: ["Old Phones", "Chargers", "Batteries", "Broken Gadgets"]
  };

  const calculateTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };


  const handleFeedbackSubmit = async (e: React.FormEvent) => {
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

    if (!user) return;

    setIsSubmitting(true);

    try {
      const feedbackRef = ref(db, 'feedbacks');
      // Push payload to firebase
      await push(feedbackRef, {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: await getUserDisplayAvatar(user.uid),
        rating,
        text: feedbackText,
        createdAt: Date.now(),
        status: 'new'
      });

      setIsSubmitting(false);
      setSubmitSuccess(true);

      // Reset and close after 3 seconds
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setSubmitSuccess(false);
        setRating(0);
        setFeedbackText('');
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setIsSubmitting(false);
      alert("Failed to submit feedback. Please try again.");
    }
  };


  useEffect(() => {
    const donationsRef = ref(db, 'donations');
    const unsubscribe = onValue(donationsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, FirebaseDonation> | null;
      setRawDonations(data || {});

      if (data) {
        // Calculate Quick Stats (Donated)
        if (user) {
          // Stats now come from user object directly in separate effect or synced via rawUsers if needed, 
          // but relying on the user object from AuthContext or a specific user listener is better.
          // For now, removing manual count here as we will set it from user data.
        }

        const loadedDonations = Object.entries(data).map(([key, value]) => {
          const donation = value as FirebaseDonation;
          return {
            id: key,
            user: {
              name: donation.userName,
              avatar: donation.userAvatar,
              id: donation.userId
            },
            category: donation.category,
            subCategory: donation.subCategory,
            timeAgo: calculateTimeAgo(donation.createdAt),
            quantity: donation.quantity,
            unit: donation.unit || 'Units',
            description: donation.description,
            images: donation.images || [],
            comments: donation.comments
              ? Object.entries(donation.comments).map(([cid, c]) => ({
                id: cid,
                ...c
              }))
              : []
          };
        }).filter(donation => {
          // HIDE donations with 0 quantity from homepage
          const qty = parseInt(donation.quantity);
          return !isNaN(qty) && qty > 0;
        });
        // Sort by date desc
        loadedDonations.sort(() => {
          // We need the raw createdAt to sort correctly, but since we didn't keep it in the mapped object, 
          // we can either keep it or just rely on the order if firebase returns it sorted (it usually does by key).
          // However, to be safe, let's look at the original data logic or just assume latest first if keys are time-based (push IDs are).
          // Actually, push IDs are chronological. So reversing the array should show newest first.
          return 0;
        }).reverse();
        setDonations(loadedDonations);
      } else {
        setDonations([]);
        // Stats handled by user data
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleTryIdeaClick = (idea: RecycledIdea) => {
    setSelectedIdea(idea);
    setShowIdeaPopup(true);
  };

  const handleCloseIdeaPopup = () => {
    setShowIdeaPopup(false);
    setSelectedIdea(null);
  };

  const handleConfirmIdea = () => {
    if (selectedIdea) {
      router.push(`/start-project?ideaId=${selectedIdea.id}`);
    } else {
      router.push('/start-project');
    }
    handleCloseIdeaPopup();
  };


  const handleDonateClick = () => {
    setShowDonationPopup(true);
  };

  const handleClosePopup = () => {
    setShowDonationPopup(false);
    setShowSuccessPopup(false);
    setShowRequestPopup(false);
    setShowRequestSuccessPopup(false);
    setSelectedDonation(null);
    setRequestFormData({
      quantityClaim: 1,
      projectId: '',
      urgencyLevel: 'High'
    });
  };

  const handleRequestClick = (donation: Donation) => {
    // Check if quantity is 0
    if (parseInt(donation.quantity) <= 0) {
      alert('This donation is no longer available. All items have been claimed.');
      return;
    }

    setSelectedDonation(donation);
    setShowRequestPopup(true);
    // Reset quantity to 1 when opening
    setRequestFormData(prev => ({ ...prev, quantityClaim: 1 }));
  };

  const handleRequestInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'quantityClaim') {
      const val = parseInt(value);
      let maxQuantity = 1000;
      if (selectedDonation && selectedDonation.quantity) {
        maxQuantity = parseInt(selectedDonation.quantity) || 1000;
      }

      if (val > maxQuantity) {
        // Option 1: Clamp it immediately
        setRequestFormData(prev => ({ ...prev, [name]: maxQuantity }));
        return;
      }
    }

    setRequestFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const adjustQuantity = (amount: number) => {
    setRequestFormData(prev => {
      let maxQuantity = 1000;
      if (selectedDonation && selectedDonation.quantity) {
        maxQuantity = parseInt(selectedDonation.quantity) || 1000;
      }
      const newQuantity = Math.min(maxQuantity, Math.max(1, prev.quantityClaim + amount));
      return { ...prev, quantityClaim: newQuantity };
    });
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDonation) return;

    try {
      const requestData = {
        donationId: selectedDonation.id,
        donationTitle: selectedDonation.description ? (selectedDonation.description.substring(0, 50) + (selectedDonation.description.length > 50 ? '...' : '')) : 'Donation',
        donationCategory: selectedDonation.category,
        donationImage: selectedDonation.images && selectedDonation.images.length > 0 ? selectedDonation.images[0] : '',
        requesterId: user.uid,
        requesterName: user.displayName || 'Anonymous',
        requesterAvatar: user.photoURL || 'U',
        ownerId: selectedDonation.user.id,
        quantity: requestFormData.quantityClaim, // Using 'quantity' to match other pages
        quantityClaimed: requestFormData.quantityClaim, // Keeping for backward compat if needed
        projectId: requestFormData.projectId,
        projectTitle: userProjects.find(p => p.id === requestFormData.projectId)?.title || '',
        urgencyLevel: requestFormData.urgencyLevel,
        status: 'pending',
        createdAt: Date.now() // Changed to Date.now() to match other pages which might use timestamp number
      };

      const requestsRef = ref(db, 'requests');
      await push(requestsRef, requestData);

      setShowRequestPopup(false);
      setShowRequestSuccessPopup(true);
    } catch (error) {
      console.error("Error submitting request: ", error);
      alert("Failed to submit request.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => {
        const updatedPhotos = [...prev.photos, ...newFiles].slice(0, 4); // Limit to 4
        return {
          ...prev,
          photos: updatedPhotos
        };
      });
      // Clear the input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Convert photos to base64
      const imagePromises = formData.photos.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(imagePromises);

      const donationData = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL || 'U',
        category: formData.wasteType,
        subCategory: formData.subcategory,
        quantity: formData.quantity,
        unit: 'Units',
        description: formData.description,
        images: base64Images,
        createdAt: new Date().toISOString(),
        comments: []
      };

      const donationsRef = ref(db, 'donations');
      await push(donationsRef, donationData);

      // Increment donation count (Listing-Based)
      await incrementAction(user.uid, 'donate', 1);

      setShowDonationPopup(false);
      setShowSuccessPopup(true);

      // Reset form
      setFormData({
        wasteType: '',
        otherWaste: '',
        subcategory: '',
        quantity: '',
        description: '',
        photos: []
      });
    } catch (error) {
      console.error("Error adding document: ", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error posting donation: ${errorMessage}`);
    }
  };

  const handleCommentInputChange = (donationId: string, value: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [donationId]: value
    }));
  };

  const handlePostComment = async (donationId: string) => {
    if (!user) {
      alert("Please login to comment.");
      return;
    }
    if (!commentInputs[donationId]?.trim()) return;

    const commentData = {
      author: user.displayName || 'Anonymous',
      text: commentInputs[donationId],
      time: new Date().toISOString()
    };

    try {
      const commentsRef = ref(db, `donations/${donationId}/comments`);
      await push(commentsRef, commentData);

      // Clear input
      setCommentInputs(prev => ({
        ...prev,
        [donationId]: ''
      }));
    } catch (error) {
      console.error("Error posting comment: ", error);
      alert("Failed to post comment.");
    }
  };

  const toggleComments = (id: string) => {
    setOpenComments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };


  useEffect(() => {
    const projectsRef = ref(db, 'projects');
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, FirebaseProject> | null;
      setRawProjects(data || {});

      if (data) {
        const allProjects = Object.entries(data).map(([key, value]) => {
          const project = value as FirebaseProject;
          return {
            ...project,
            id: key
          };
        });

        // 1. Recycled Ideas (Public)
        const loadedProjects = allProjects
          .filter(project => project.visibility === 'public' && project.final_images && project.final_images.length > 0)
          .map(project => ({
            id: project.id,
            title: project.title,
            author: project.authorName || 'Anonymous',
            timeAgo: project.createdAt,
            image: project.final_images ? project.final_images[0] : '',
            description: project.description,
            commentsCount: 0,
            materials: project.materials ? (Array.isArray(project.materials) ? project.materials : Object.values(project.materials)) as ProjectMaterial[] : [],
            workflow_stage: project.workflow_stage,
            steps: project.steps ? (Array.isArray(project.steps) ? project.steps : Object.values(project.steps)) as Step[] : []
          }));

        setRecycledIdeas(loadedProjects);

        // 2. User Projects & Quick Stats
        if (user) {
          const myProjects = allProjects.filter(p => p.authorId === user.uid);

          setUserProjects(myProjects.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            date: p.createdAt
          })));

          setUserProjects(myProjects.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            date: p.createdAt
          })));

          // Stats now come from user object directly
        }

      } else {
        setRecycledIdeas([]);
        if (user) {
          setUserProjects([]);
          // Stats handled by user data
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Users for Leaderboard and Stats
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() as Record<string, FirebaseUser> || {};
      setRawUsers(data);

      // Update Quick Stats from current user data
      if (user && data[user.uid]) {
        const userData = data[user.uid] as any; // Cast to access dynamic props like recyclingCount
        setQuickStats({
          recycled: userData.recyclingCount || 0,
          donated: userData.donationCount || 0
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Calculate Leaderboard
  const leaderboardData = useMemo(() => {
    if (Object.keys(rawUsers).length === 0) return [];

    // Convert to array and sort
    return Object.entries(rawUsers)
      .map(([userId, userInfo]) => {
        // Cast to any because the interface defined locally might be outdated or strict
        // In a real scenario, we'd update the FirebaseUser interface to include xp
        const user = userInfo as any;
        const fullName = user.fullName || 'Unknown User';
        const points = user.xp || 0;

        return {
          id: userId,
          name: fullName,
          points: points,
          avatar: user.photoURL || user.avatar || fullName.charAt(0).toUpperCase(),
          rank: 0 // placeholder
        };
      })
      .filter(user => user.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5) // Top 5 for sidebar
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));
  }, [rawUsers]);

  useEffect(() => {
    if (donationId && donations.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`donation-${donationId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          const originalTransition = element.style.transition;
          const originalBorder = element.style.border;

          element.style.transition = 'all 0.5s ease';
          element.style.border = '2px solid #2e8b57';
          element.style.boxShadow = '0 0 10px rgba(46, 139, 87, 0.3)';

          setTimeout(() => {
            element.style.border = originalBorder;
            element.style.boxShadow = 'none';
            setTimeout(() => {
              element.style.transition = originalTransition;
            }, 500);
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [donationId, donations]);

  return (
    <ProtectedRoute>
      {/* Load Font Awesome */}
      <Header />
      <div className={styles.container}>
        <Sidebar />

        <main className={styles.mainContent}>
          <div className={styles.welcomeCard}>
            <h2>WELCOME TO ECOWASTE</h2>
            <div className={styles.divider}></div>
            <p>Join our community in making the world a cleaner place</p>
            <div className={styles.btnContainer}>
              <button type="button" className={styles.btn} onClick={handleDonateClick}>Donate Waste</button>
              <Link href="/start-project" className={styles.btn}>Start Recycling</Link>
              <Link href="/learn_more" className={styles.btn} style={{ backgroundColor: '#666' }}>Learn More</Link>
            </div>
          </div>

          <div className={styles.tabContainer}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'donations' ? styles.active : ''}`}
              onClick={() => setActiveTab('donations')}
            >
              Donations
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'recycled-ideas' ? styles.active : ''}`}
              onClick={() => setActiveTab('recycled-ideas')}
            >
              Recycled Ideas
            </button>
          </div>
          <div className={styles.divider}></div>

          {activeTab === 'donations' && (
            <div id="donations">
              <div className={styles.sectionCard} style={{ background: 'none', boxShadow: 'none', padding: 0 }}>
                <h3 style={{ color: '#2e8b57', marginBottom: '15px', fontSize: '18px', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', fontWeight: 700 }}>Available Donations</h3>
                <div id="availableDonationsContainer">
                  {donations.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#666' }}>
                      <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '15px', color: '#ccc' }}></i>
                      <p style={{ fontSize: '16px', fontWeight: 500 }}>No donations found</p>
                      <p style={{ fontSize: '14px', marginTop: '5px' }}>Be the first to donate waste materials!</p>
                    </div>
                  )}
                  {donations.map(donation => (
                    <div key={donation.id} id={`donation-${donation.id}`} className={styles.donationPost}>
                      <div className={styles.donationUserHeader}>
                        <div className={styles.userAvatar}>
                          {donation.user.avatar && (donation.user.avatar.startsWith('http') || donation.user.avatar.startsWith('/')) ? (
                            <img src={donation.user.avatar} alt={donation.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            donation.user.avatar
                          )}
                        </div>
                        <div className={styles.userInfo}>
                          <div className={styles.userName}>
                            <Link href={`/profile/${donation.user.id}`} className={styles.profileLink} style={{ color: '#333', textDecoration: 'none', fontWeight: 600 }}>
                              {donation.user.name}
                            </Link>
                          </div>
                          <div className={styles.donationMeta}>
                            <span className={styles.category}>Category: {donation.category} → {donation.subCategory}</span>
                            <span className={styles.timeAgo}>{donation.timeAgo}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.quantityInfo}>
                        <div className={styles.quantityLabel}>
                          Quantity: {donation.quantity}
                        </div>
                        <div className={styles.quantityUnit}>{donation.unit}</div>
                      </div>

                      <div className={styles.donationDescription}>
                        <p>{donation.description}</p>
                      </div>

                      {/* Images placeholder */}
                      <div className={styles.donationImages}>
                        {donation.images && donation.images.map((img, index) => (
                          <img key={index} src={img} alt={`Donation ${index + 1}`} style={{ maxWidth: '100px', maxHeight: '100px', margin: '5px', borderRadius: '4px' }} />
                        ))}
                      </div>

                      <div className={styles.donationActions}>
                        {user && donation.user.id !== user.uid ? (
                          parseInt(donation.quantity) <= 0 ? (
                            <button type="button" className={styles.requestBtn} style={{ backgroundColor: 'rgb(204 204 204)', cursor: 'not-allowed' }} disabled>
                              All Items Claimed
                            </button>
                          ) : (
                            <button type="button" className={styles.requestBtn} onClick={() => handleRequestClick(donation)}>
                              Request Donation
                            </button>
                          )
                        ) : (
                          <button type="button" className={styles.requestBtn} style={{ backgroundColor: '#ccc', cursor: 'default' }} disabled>
                            Your Donation
                          </button>
                        )}

                        <button className={styles.commentsBtn} onClick={() => toggleComments(donation.id)}>
                          <i className="fas fa-comment"></i> Comments
                        </button>
                      </div>

                      {openComments[donation.id] && (
                        <div className={styles.commentsSection}>
                          <div className={styles.commentsList}>
                            {donation.comments && donation.comments.length > 0 ? (
                              donation.comments.map(comment => (
                                <div key={comment.id} className={styles.commentItem} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{comment.author} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>{calculateTimeAgo(comment.time)}</span></div>
                                  <div style={{ fontSize: '14px', marginTop: '4px' }}>{comment.text}</div>
                                </div>
                              ))
                            ) : (
                              <div className={styles.noComments}>No comments yet. Be the first to comment!</div>
                            )}
                          </div>
                          <div className={styles.addComment}>
                            <textarea
                              className={styles.commentTextarea}
                              placeholder="Add a comment..."
                              value={commentInputs[donation.id] || ''}
                              onChange={(e) => handleCommentInputChange(donation.id, e.target.value)}
                            ></textarea>
                            <button
                              type="button"
                              className={styles.postCommentBtn}
                              onClick={() => handlePostComment(donation.id)}
                            >
                              Post Comment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recycled-ideas' && (
            <div id="recycled-ideas">
              {recycledIdeas.map(idea => (
                <div key={idea.id} className={styles.ideaCard}>
                  <div className={styles.ideaHeader}>
                    <h3>{idea.title}</h3>
                    <div className={styles.ideaMeta}>
                      <span className={styles.author}>{idea.author}</span>
                      <span className={styles.timeAgo}>{idea.timeAgo}</span>
                    </div>
                  </div>
                  <div className={styles.ideaImageContainer}>
                    {idea.image ? (
                      <img src={idea.image} alt={idea.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0', color: '#666' }}>
                        No Image
                      </div>
                    )}
                  </div>
                  <p className={styles.ideaDescription}>
                    {idea.description}
                  </p>
                  <div className={styles.ideaActions}>
                    <button className={styles.actionBtn} onClick={() => handleTryIdeaClick(idea)}>Try This Idea</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <div className={styles.rightSidebar}>
          <div className={styles.card}>
            <h2>Your Projects</h2>
            <div className={styles.divider}></div>
            <div className={styles.projectsScroll}>
              {userProjects.length === 0 && (
                <div style={{ padding: '10px', color: '#888', textAlign: 'center' }}>
                  No projects yet.
                </div>
              )}
              {userProjects.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`} className={styles.projectItemLink}>
                  <div className={styles.projectItem}>
                    <strong>{project.title}</strong>
                    <div>{project.description}</div>
                    <div className={styles.projectDate}>{project.date}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h2>Quick Stats</h2>
            <div className={styles.divider}></div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Items Recycled</div>
              <div className={styles.statValue}>{quickStats.recycled}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Items Donated</div>
              <div className={styles.statValue}>{quickStats.donated}</div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Leaderboard</h3>
            <div className={styles.divider}></div>
            <div className={styles.leaderboardHeader}>
              <span>TOP 5 USERS</span>
            </div>

            <div className={styles.leaderboardScroll}>
              {leaderboardData.length === 0 && (
                <div style={{ padding: '10px', color: '#888', textAlign: 'center' }}>
                  Loading...
                </div>
              )}
              {leaderboardData.map(user => (
                <Link key={user.id} href={`/profile/${user.id}`} className={styles.leaderboardItemLink}>
                  <div className={styles.leaderboardItem}>
                    <div className={styles.leaderboardRank}>#{user.rank}</div>
                    <div className={styles.leaderboardInfo}>
                      <strong className={styles.leaderName}>{user.name}</strong>
                      <div className={styles.leaderPoints}>{user.points} pts</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Popups */}
      {showDonationPopup && (
        <div className={styles.popupContainer} onClick={(e) => {
          if (e.target === e.currentTarget) handleClosePopup();
        }}>
          <div className={styles.popupContent}>
            <button className={styles.closeBtn} onClick={handleClosePopup}>×</button>
            <h2>Post Donation</h2>
            <div className={styles.popupScrollArea}>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="wasteType">Type of Waste:</label>
                  <select id="wasteType" name="wasteType" required value={formData.wasteType} onChange={handleInputChange}>
                    <option value="">Select waste type</option>
                    <option value="Plastic">Plastic</option>
                    <option value="Paper">Paper</option>
                    <option value="Metal">Metal</option>
                    <option value="Glass">Glass</option>
                    <option value="Electronic">Electronic</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.wasteType === 'Other' && (
                  <div className={styles.formGroup}>
                    <label htmlFor="otherWaste">Please specify:</label>
                    <input type="text" id="otherWaste" name="otherWaste" placeholder="Type custom waste category..." required value={formData.otherWaste} onChange={handleInputChange} />
                  </div>
                )}

                {subcategories[formData.wasteType] && (
                  <div className={styles.formGroup}>
                    <label htmlFor="subcategory">Subcategory:</label>
                    <select id="subcategory" name="subcategory" required value={formData.subcategory} onChange={handleInputChange}>
                      <option value="">-- Select Subcategory --</option>
                      {subcategories[formData.wasteType].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="quantity">Quantity:</label>
                  <input type="number" id="quantity" name="quantity" placeholder="Enter quantity" min="1" required value={formData.quantity} onChange={handleInputChange} />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="description">Description:</label>
                  <textarea id="description" name="description" placeholder="Describe your donation..." rows={4} required value={formData.description} onChange={handleInputChange}></textarea>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="photos">Attach Photos (up to 4):</label>
                  <div className={styles.fileUpload}>
                    <input type="file" id="photos" name="photos" accept="image/*" multiple onChange={handleFileChange} />
                    <label htmlFor="photos" className={styles.fileUploadLabel}>Choose Files</label>
                    <span id="file-chosen">{formData.photos.length > 0 ? `${formData.photos.length} files selected` : 'No files chosen'}</span>
                  </div>

                  {formData.photos.length > 0 && (
                    <div className={styles.previewContainer}>
                      {formData.photos.map((photo, index) => (
                        <div key={index} className={styles.previewImageWrapper}>
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Preview ${index}`}
                            className={styles.previewImage}
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                          <button
                            type="button"
                            className={styles.removeImageBtn}
                            onClick={() => handleRemovePhoto(index)}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <small className={styles.formHint}>You can upload up to 4 photos. Only JPG, PNG, and GIF files are allowed.</small>
                </div>

                <button type="submit" className={styles.submitBtn}>Post Donation</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className={styles.popupContainer}>
          <div className={`${styles.popupContent} ${styles.successPopup}`}>
            <div className={styles.successIcon}>
              <i className="fas fa-gift"></i>
            </div>
            <h2>Congratulations!</h2>
            <p>You’ve successfully donated your waste materials! 🎉<br />
              Please wait for others to claim your donation.
            </p>
            <button className={styles.continueBtn} onClick={handleClosePopup}>Continue</button>
          </div>
        </div>
      )}

      {showRequestPopup && selectedDonation && (
        <div className={styles.popupContainer} onClick={(e) => {
          if (e.target === e.currentTarget) handleClosePopup();
        }}>
          <div className={styles.popupContent}>
            <button className={styles.closeBtn} onClick={handleClosePopup}>×</button>
            <h2 style={{ color: '#2e7d32', marginBottom: '15px' }}>Request Materials</h2>

            <form onSubmit={handleRequestSubmit}>
              <div className={styles.formGroup}>
                <label>Waste:</label>
                <div style={{ fontWeight: 500, padding: '8px 0' }}>{selectedDonation.category} - {selectedDonation.subCategory}</div>
              </div>

              <div className={styles.formGroup}>
                <label>Available Items:</label>
                <div style={{ fontWeight: 500, padding: '8px 0' }}>{selectedDonation.quantity} {selectedDonation.unit}</div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="quantityClaim">Quantity to Claim:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button type="button" onClick={() => adjustQuantity(-1)} style={{ width: '32px', height: '32px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>−</button>
                  <input
                    type="number"
                    id="quantityClaim"
                    name="quantityClaim"
                    value={requestFormData.quantityClaim}
                    onChange={handleRequestInputChange}
                    min="1"
                    className={styles.noSpinner}
                    style={{ width: '60px', textAlign: 'center', border: '1.5px solid #ccc', borderRadius: '6px', padding: '6px' }}
                  />
                  <button type="button" onClick={() => adjustQuantity(1)} style={{ width: '32px', height: '32px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="projectId">Recycling Project:</label>
                <select id="projectId" name="projectId" required value={requestFormData.projectId} onChange={handleRequestInputChange}>
                  <option value="">Select a project</option>
                  {userProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="urgencyLevel">Urgency Level:</label>
                <select id="urgencyLevel" name="urgencyLevel" required value={requestFormData.urgencyLevel} onChange={handleRequestInputChange}>
                  <option value="High">High (Immediate Need)</option>
                  <option value="Medium">Medium (Within 2 weeks)</option>
                  <option value="Low">Low (Planning ahead)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className={styles.submitBtn}>Submit Request</button>
                <button type="button" className={styles.btn} style={{ background: '#f0f0f0', color: '#333', border: '1px solid #ddd' }} onClick={handleClosePopup}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRequestSuccessPopup && (
        <div className={styles.popupContainer}>
          <div className={`${styles.popupContent} ${styles.successPopup}`}>
            <div className={styles.successIcon}>
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Request Sent!</h2>
            <p>Your request has been submitted successfully.<br />Please wait for the donor&apos;s response.</p>
            <button className={styles.continueBtn} onClick={handleClosePopup}>Continue</button>
          </div>
        </div>
      )}

      {showIdeaPopup && selectedIdea && (
        <RecycledIdeaPopup
          idea={selectedIdea}
          onClose={handleCloseIdeaPopup}
          onConfirm={handleConfirmIdea}
        />
      )}

      {/* Feedback Button */}
      <div className={styles.feedbackBtn} onClick={() => setIsFeedbackOpen(true)}>💬</div>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
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
      )}
    </ProtectedRoute>
  );
}

export default function Homepage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomepageContent />
    </Suspense>
  );
}
