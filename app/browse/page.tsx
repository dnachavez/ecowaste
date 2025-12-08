'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './browse.module.css';
import { db } from '../../lib/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
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
  
  const [activeTab, setActiveTab] = useState('donations');
  const [activeCategory, setActiveCategory] = useState(categoryParam || 'All');
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [urgencyLevel, setUrgencyLevel] = useState('High');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [allDonations, setAllDonations] = useState<Donation[]>([]);
  const [recycledIdeas, setRecycledIdeas] = useState<RecycledIdea[]>([]);
  const [showIdeaPopup, setShowIdeaPopup] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<RecycledIdea | null>(null);

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

  const handleTryIdeaClick = (idea: RecycledIdea) => {
    setSelectedIdea(idea);
    setShowIdeaPopup(true);
  };

  const handleCloseIdeaPopup = () => {
    setShowIdeaPopup(false);
    setSelectedIdea(null);
  };

  const handleConfirmIdea = () => {
    handleCloseIdeaPopup();
    router.push('/start-project');
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
      setRequestQuantity(1);
      setUrgencyLevel('High');
      setShowRequestPopup(true);
  };

  const closeRequestModal = () => {
      setShowRequestPopup(false);
      setSelectedDonation(null);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!user || !selectedDonation) return;

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
          status: 'pending',
          quantity: requestQuantity,
          urgencyLevel: urgencyLevel,
          createdAt: Date.now()
      };

      set(newRequestRef, requestData)
          .then(() => {
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
        const loadedProjects = Object.entries(data)
            .map(([key, value]) => {
                const project = value as FirebaseProject;
                return {
                    ...project,
                    id: key
                };
            })
            .filter(project => project.visibility === 'public' && project.final_images && project.final_images.length > 0)
            .map(project => ({
                id: project.id,
                title: project.title,
                author: project.authorName || 'Anonymous',
                timeAgo: project.createdAt,
                image: project.final_images ? project.final_images[0] : '',
                description: project.description,
                commentsCount: 0, // Placeholder
                materials: project.materials ? (Array.isArray(project.materials) ? project.materials : Object.values(project.materials)) as ProjectMaterial[] : [],
                workflow_stage: project.workflow_stage,
                steps: project.steps ? (Array.isArray(project.steps) ? project.steps : Object.values(project.steps)) as Step[] : []
            }));
        
        setRecycledIdeas(loadedProjects);
      } else {
        setRecycledIdeas([]);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <ProtectedRoute>
    <div className={styles.container}>
      <Header />
      <Sidebar />

      {/* Main Content */}
      <main className={styles.mainContent}>
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

        <div className={styles['tab-container']}>
            <button 
                className={`${styles['tab-btn']} ${activeTab === 'donations' ? styles.active : ''}`}
                onClick={() => setActiveTab('donations')}
            >
                Donations
            </button>
            <button 
                className={`${styles['tab-btn']} ${activeTab === 'recycled-ideas' ? styles.active : ''}`}
                onClick={() => setActiveTab('recycled-ideas')}
            >
                Recycled Ideas
            </button>
        </div>
        <div className={styles.divider}></div>

        {activeTab === 'donations' && (
            <div id="donations" style={{display: 'block'}}>
                <div className={styles.categories}>
                    <div className={styles['category-scroll-container']}>
                        <ul className={styles['category-list']}>
                            {categories.map(cat => (
                                <li key={cat} className={activeCategory === cat ? styles.active : ''}>
                                    <button 
                                        onClick={() => setActiveCategory(cat)}
                                        style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block', width: '100%'}}
                                    >
                                        <a style={{pointerEvents: 'none'}}>{cat}</a>
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
                                            <img src={donation.user.avatar} alt={donation.user.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
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
                                    <button 
                                        className={styles.requestBtn}
                                        onClick={() => openRequestModal(donation)}
                                    >
                                        Request Donation
                                    </button>
                                    <button className={styles.commentsBtn} onClick={() => toggleComments(donation.id)}>
                                        <i className="fas fa-comment"></i> Comments
                                    </button>
                                </div>

                                {openComments[donation.id] && (
                                    <div className={styles.commentsSection}>
                                        <div className={styles.commentsList}>
                                            {donation.comments && donation.comments.length > 0 ? (
                                                donation.comments.map(comment => (
                                                    <div key={comment.id} className={styles.comment} style={{marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee'}}>
                                                        <div style={{fontWeight: 'bold', fontSize: '14px'}}>{comment.author} <span style={{fontSize: '12px', color: '#888', fontWeight: 'normal'}}>{calculateTimeAgo(comment.time)}</span></div>
                                                        <div style={{fontSize: '14px', marginTop: '4px'}}>{comment.text}</div>
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
            <div id="recycled-ideas" style={{display: 'block'}}>
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
                                <img src={idea.image} alt={idea.title} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                            ) : (
                                <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0', color: '#666'}}>
                                    No Image
                                </div>
                            )}
                        </div>
                        <p className={styles.ideaDescription}>
                            {idea.description}
                        </p>
                        <div className={styles.ideaActions}>
                            <button className={styles.actionBtn} onClick={() => handleTryIdeaClick(idea)}>Try This Idea</button>
                            <span className={styles.comments}>{idea.commentsCount} Comments</span>
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
                <h2 style={{textAlign: 'center', color: '#2e7d32', fontWeight: 800, marginBottom: '15px'}}>
                    Request Materials
                </h2>
                <form onSubmit={handleRequestSubmit}>
                    <div style={{marginBottom: '15px'}}>
                        <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Waste:</label>
                        <span>{selectedDonation.subCategory} ({selectedDonation.category})</span>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                        <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Available Items:</label>
                        <span>{selectedDonation.quantity}</span>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                        <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Quantity to Claim:</label>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <button type="button" onClick={() => setRequestQuantity(Math.max(1, requestQuantity - 1))} style={{width: '32px', height: '32px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold'}}>−</button>
                            <input 
                                type="number" 
                                value={requestQuantity} 
                                onChange={(e) => setRequestQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                style={{width: '60px', textAlign: 'center', border: '1.5px solid #ccc', borderRadius: '6px', padding: '6px'}} 
                            />
                            <button type="button" onClick={() => setRequestQuantity(requestQuantity + 1)} style={{width: '32px', height: '32px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold'}}>+</button>
                        </div>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                        <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Urgency Level:</label>
                        <select 
                            value={urgencyLevel}
                            onChange={(e) => setUrgencyLevel(e.target.value)}
                            style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                        >
                            <option value="High">High (Immediate Need)</option>
                            <option value="Medium">Medium (Within 2 weeks)</option>
                            <option value="Low">Low (Planning ahead)</option>
                        </select>
                    </div>
                    <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                        <button type="submit" style={{flex: 1, padding: '10px', background: '#2e8b57', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>Submit Request</button>
                        <button type="button" onClick={closeRequestModal} style={{flex: 1, padding: '10px', background: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>Cancel</button>
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
                <h2 style={{color: '#2e8b57', marginBottom: '15px'}}>Request Sent!</h2>
                <p style={{marginBottom: '20px', color: '#555'}}>Your request has been submitted successfully. Please wait for the donor&apos;s response.</p>
                <button 
                    onClick={() => setShowSuccessPopup(false)}
                    style={{padding: '10px 30px', background: '#2e8b57', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}
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
