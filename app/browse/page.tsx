'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './browse.module.css';
import { db } from '../../lib/firebase';
import { ref, onValue, push, set, get, query, orderByChild, equalTo } from 'firebase/database';

import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../lib/notifications';
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

function BrowseContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');
  const projectIdParam = searchParams.get('projectId');
  const materialIdParam = searchParams.get('materialId');

  const [activeTab, setActiveTab] = useState('donations');
  const [activeCategory, setActiveCategory] = useState(categoryParam || 'All');
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [allDonations, setAllDonations] = useState<Donation[]>([]);
  const [recycledIdeas, setRecycledIdeas] = useState<RecycledIdea[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [urgencyLevel, setUrgencyLevel] = useState('High');
  // New state for project selection
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '');
  const [userProjects, setUserProjects] = useState<{ id: string, title: string }[]>([]);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showIdeaPopup, setShowIdeaPopup] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<RecycledIdea | null>(null);

  // New state for request limit
  const [maxRequestQuantity, setMaxRequestQuantity] = useState<number | null>(null);

  // Fetch needed quantity if projectId and materialId are present
  useEffect(() => {
    if (projectIdParam && materialIdParam) {
      const materialRef = ref(db, `projects/${projectIdParam}/materials/${materialIdParam}`);
      get(materialRef).then((snapshot) => {
        if (snapshot.exists()) {
          const mat = snapshot.val();
          if (mat) {
            const needed = (mat.needed || 0) - (mat.acquired || 0);
            setMaxRequestQuantity(needed > 0 ? needed : 0);
          }
        }
      }).catch(err => console.error("Error fetching material details:", err));
    } else {
      setMaxRequestQuantity(null);
    }
  }, [projectIdParam, materialIdParam]);


  // Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [textError, setTextError] = useState(false);

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
    if (!user) return;

    setIsSubmitting(true);

    try {
      const feedbackRef = ref(db, 'feedbacks');
      await push(feedbackRef, {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL || '',
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
      alert("Failed to submit feedback.");
    }
  };



  useEffect(() => {
    const donationsRef = ref(db, 'donations');
    const unsubscribe = onValue(donationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
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
                id: cid, // This might need to be number if Comment.id is number, let's check
                ...c
              }))
              : []
          };
        });
        // Sort by date desc
        loadedDonations.sort(() => {
          return 0;
        }).reverse();
        setAllDonations(loadedDonations);
      } else {
        setAllDonations([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleTryIdeaClick = async (idea: RecycledIdea) => {
    // 1. Fetch contributors (users who have APPROVED requests for this project)
    // 1. Fetch contributors (users who have APPROVED requests for this project)
    const requestsRef = ref(db, 'requests');
    const contributorsSet = new Set<string>();

    try {
      // Fetch specific to project if possible, but falling back to client-side filtering to avoid index errors
      // Since we can't ensure index exists, we fetch all requests. In production, add index and use query.
      const snapshot = await get(requestsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).forEach((req: any) => {
          if (req.projectId === idea.id && req.status === 'approved' && req.ownerName) {
            contributorsSet.add(req.ownerName);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching contributors:", error);
    }

    // 2. Open Popup with contributors
    setSelectedIdea({
      ...idea,
      contributors: Array.from(contributorsSet)
    });
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

  useEffect(() => {
    if (categoryParam && categoryParam !== activeCategory) {
      setActiveCategory(categoryParam);
    }
    if (searchParam && searchParam !== searchQuery) {
      setSearchQuery(searchParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam, searchParam]);

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

      // Notification for comment
      // Find donation owner
      const donation = allDonations.find(d => d.id === donationId);
      if (donation && donation.user.id !== user.uid) {
        await createNotification(
          donation.user.id,
          "New Comment",
          `${user.displayName || 'Someone'} commented on your donation: "${commentInputs[donationId].substring(0, 30)}..."`,
          'info',
          donationId
        );
      }

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

  const openRequestModal = (donation: Donation) => {
    setSelectedDonation(donation);
    // If specific needed quantity is known and less than donation quantity, use it. 
    // Otherwise clamp to 1 initially.
    setRequestQuantity(1);
    setUrgencyLevel('High');
    // Initialize project: if URL has param, use it, otherwise default to empty
    setSelectedProjectId(projectIdParam || '');
    setShowRequestPopup(true);
  };

  const closeRequestModal = () => {
    setShowRequestPopup(false);
    setSelectedDonation(null);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedDonation) return;

    if (maxRequestQuantity !== null && requestQuantity > maxRequestQuantity) {
      alert(`You cannot request more than the needed amount (${maxRequestQuantity}).`);
      return;
    }

    const requestsRef = ref(db, 'requests');
    const newRequestRef = push(requestsRef);

    const requestData = {
      id: newRequestRef.key,
      donationId: selectedDonation.id,
      donationTitle: selectedDonation.description ? (selectedDonation.description.substring(0, 50) + (selectedDonation.description.length > 50 ? '...' : '')) : 'Donation',
      donationCategory: selectedDonation.category,
      donationImage: selectedDonation.images && selectedDonation.images.length > 0 ? selectedDonation.images[0] : '',
      requesterId: user.uid,
      requesterName: user.displayName || user.email || 'Anonymous',
      requesterAvatar: user.photoURL || '',
      ownerId: selectedDonation.user.id,
      ownerName: selectedDonation.user.name, // FIXED: Save ownerName for contributors list
      status: 'pending',
      quantity: requestQuantity,
      urgencyLevel: urgencyLevel,
      projectId: selectedProjectId || null,
      projectTitle: userProjects.find(p => p.id === selectedProjectId)?.title || '',
      materialId: materialIdParam || null,
      createdAt: Date.now()
    };

    set(newRequestRef, requestData)
      .then(async () => {
        // Notification
        await createNotification(
          selectedDonation.user.id,
          "New Donation Request",
          `${user.displayName || 'Someone'} requested your ${selectedDonation.description || 'donation'}`,
          'info',
          newRequestRef.key as string
        );
        setShowRequestPopup(false);
        setShowSuccessPopup(true);
      })
      .catch((error) => {
        console.error("Error creating request:", error);
        alert("Failed to submit request.");
      });
  };

  // Mock Data
  const categories = ['All', 'Plastic', 'Paper', 'Metal', 'Glass', 'Electronic', 'Other'];

  const filteredDonations = (activeCategory === 'All'
    ? allDonations
    : allDonations.filter(d => d.category === activeCategory)
  ).filter(d => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.description.toLowerCase().includes(query) ||
      d.category.toLowerCase().includes(query) ||
      d.subCategory.toLowerCase().includes(query)
    );

  });

  useEffect(() => {
    const projectsRef = ref(db, 'projects');
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Shared processing for both Recycled Ideas and User Projects
        const allProjects = Object.entries(data).map(([key, value]) => {
          const project = value as FirebaseProject;
          return {
            ...project,
            id: key
          };
        });

        // 1. Recycled Ideas (Public)
        const loadedRecycledIdeas = allProjects
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

        setRecycledIdeas(loadedRecycledIdeas);

        // 2. User Projects (For Request Dropdown)
        if (user) {
          setUserProjects(allProjects.filter((p: any) => p.authorId === user.uid).map(p => ({
            id: p.id,
            title: p.title
          })));
        }

      } else {
        setRecycledIdeas([]);
        setUserProjects([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <ProtectedRoute>
      <Header />
      <div className={styles.container}>
        <Sidebar />

        {/* Main Content */}
        <main className={styles.mainContent}>
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => router.back()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#2e8b57',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d5a3d')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2e8b57')}
            >
              <i className="fas fa-arrow-left"></i> Back to project
            </button>
          </div>
          <div className={styles.searchBar}>
            <form onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                name="search"
                placeholder="Search Donations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
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
            <div id="donations" style={{ display: 'block' }}>
              <div className={styles.categories}>
                <div className={styles.categoryScrollContainer}>
                  <ul className={styles.categoryList}>
                    {categories.map(cat => (
                      <li key={cat} className={activeCategory === cat ? styles.active : ''}>
                        <button
                          onClick={() => setActiveCategory(cat)}
                        >
                          {cat}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.sectionCard}>
                <h3 style={{ color: '#2e8b57', marginBottom: '15px', fontSize: '18px', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', fontWeight: 700 }}>Available Donations</h3>
                <div className="available">
                  {filteredDonations.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#666' }}>
                      <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '15px', color: '#ccc' }}></i>
                      <p style={{ fontSize: '16px', fontWeight: 500 }}>No donations found in this category</p>
                      <p style={{ fontSize: '14px', marginTop: '5px' }}>Be the first to donate waste materials!</p>
                    </div>
                  )}
                  {filteredDonations.map(donation => (
                    <div key={donation.id} className={styles.donationPost}>
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
                            <Link href={`/profile/${donation.user.id}`} className={styles.profileLink}>
                              {donation.user.name}
                            </Link>
                          </div>
                          <div className={styles.donationMeta}>
                            <span className={styles.category}>
                              Category: {donation.category} → {donation.subCategory}
                            </span>
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

                      <div className={styles.donationImages}>
                        {donation.images && donation.images.map((img, index) => (
                          <img key={index} src={img} alt={`Donation ${index + 1}`} style={{ maxWidth: '100px', maxHeight: '100px', margin: '5px', borderRadius: '4px' }} />
                        ))}
                      </div>

                      <div className={styles.donationActions}>
                        {user && donation.user.id !== user.uid ? (
                          <button
                            className={styles.requestBtn}
                            onClick={() => openRequestModal(donation)}
                          >
                            Request Donation
                          </button>
                        ) : (
                          <button
                            className={styles.requestBtn}
                            style={{ backgroundColor: '#ccc', cursor: 'default' }}
                            disabled
                          >
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
                                <div key={comment.id} className={styles.comment} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
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
            <div id="recycled-ideas" style={{ display: 'block' }}>
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
                    <button className={styles.actionBtn} onClick={() => handleTryIdeaClick(idea)}>View Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Request Modal */}
        {showRequestPopup && selectedDonation && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <div style={{
              backgroundColor: 'white', padding: '20px', borderRadius: '8px',
              width: '90%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ textAlign: 'center', color: '#2e7d32', fontWeight: 800, marginBottom: '15px' }}>
                Request Materials
              </h2>
              <form onSubmit={handleRequestSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Waste:</label>
                  <span>{selectedDonation.subCategory} ({selectedDonation.category})</span>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Available Items:</label>
                  <span>{selectedDonation.quantity}</span>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quantity to Claim:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button type="button" onClick={() => setRequestQuantity(Math.max(1, requestQuantity - 1))} style={{ width: '32px', height: '32px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>−</button>
                    <input
                      type="number"
                      value={requestQuantity}
                      className={styles.noSpinner}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        let maxQ = 1000;
                        if (selectedDonation && selectedDonation.quantity) {
                          maxQ = parseInt(selectedDonation.quantity) || 1000;
                        }
                        if (maxRequestQuantity !== null) {
                          maxQ = Math.min(maxQ, maxRequestQuantity);
                        }

                        if (val > maxQ) {
                          setRequestQuantity(maxQ);
                        } else {
                          setRequestQuantity(Math.max(1, val));
                        }
                      }}
                      style={{ width: '60px', textAlign: 'center', border: '1.5px solid #ccc', borderRadius: '6px', padding: '6px' }}
                    />
                    <button type="button" onClick={() => {
                      let maxQ = 1000;
                      if (selectedDonation && selectedDonation.quantity) {
                        maxQ = parseInt(selectedDonation.quantity) || 1000;
                      }
                      if (maxRequestQuantity !== null) {
                        maxQ = Math.min(maxQ, maxRequestQuantity);
                      }
                      setRequestQuantity(Math.min(maxQ, requestQuantity + 1));
                    }} style={{ width: '32px', height: '32px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>+</button>
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }} htmlFor="projectId">Recycling Project:</label>
                  <select
                    id="projectId"
                    name="projectId"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">Select a project</option>
                    {userProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Urgency Level:</label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="High">High (Immediate Need)</option>
                    <option value="Medium">Medium (Within 2 weeks)</option>
                    <option value="Low">Low (Planning ahead)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: '#2e8b57', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Submit Request</button>
                  <button type="button" onClick={closeRequestModal} style={{ flex: 1, padding: '10px', background: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <div style={{
              backgroundColor: 'white', padding: '30px', borderRadius: '8px',
              width: '90%', maxWidth: '400px', textAlign: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ color: '#2e8b57', marginBottom: '15px' }}>Request Sent!</h2>
              <p style={{ marginBottom: '20px', color: '#555' }}>Your request has been submitted successfully. Please wait for the donor&apos;s response.</p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                style={{ padding: '10px 30px', background: '#2e8b57', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
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

export default function Browse() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BrowseContent />
    </Suspense>
  );
}
