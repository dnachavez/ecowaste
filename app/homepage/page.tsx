'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './homepage.module.css';
import { db } from '../../lib/firebase';
import { ref, push, onValue } from 'firebase/database';

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
  comments: Comment[];
}

export default function Homepage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('donations');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // Popup state
  const [showDonationPopup, setShowDonationPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [showRequestSuccessPopup, setShowRequestSuccessPopup] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

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
                comments: donation.comments || []
            };
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
      }
    });

    return () => unsubscribe();
  }, []);


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
    setSelectedDonation(donation);
    setShowRequestPopup(true);
    // Reset quantity to 1 when opening
    setRequestFormData(prev => ({ ...prev, quantityClaim: 1 }));
  };

  const handleRequestInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRequestFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const adjustQuantity = (amount: number) => {
    setRequestFormData(prev => {
        const newQuantity = Math.max(1, prev.quantityClaim + amount);
        // If we had a max quantity check, we'd add it here. 
        // Assuming donation.quantity is a string like "7", we should parse it.
        // But for now just preventing < 1.
        return { ...prev, quantityClaim: newQuantity };
    });
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDonation) return;

    try {
        const requestData = {
            donationId: selectedDonation.id,
            requesterId: user.uid,
            requesterName: user.displayName || 'Anonymous',
            requesterAvatar: user.photoURL || 'U',
            quantityClaimed: requestFormData.quantityClaim,
            projectId: requestFormData.projectId,
            urgencyLevel: requestFormData.urgencyLevel,
            status: 'pending',
            createdAt: new Date().toISOString()
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

  const toggleComments = (id: string) => {
    setOpenComments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };


  const recycledIdeas = [
    {
      id: 2,
      title: 'Newspaper Flower',
      author: 'Hanner Kaminari',
      timeAgo: '2 days ago',
      image: '/uploads/project_final_images/final_6932c4015b4233.72797426_1764934657.jpg', // Placeholder path
      description: 'Cute Newspaper flower',
      commentsCount: 0
    },
    {
      id: 1,
      title: 'Basket',
      author: 'Hanner Kaminari',
      timeAgo: '2 days ago',
      image: '/uploads/project_final_images/final_6932a3de517897.52590104_1764926430.jpg', // Placeholder path
      description: 'yuttttttttttttttttttttttttttttrar',
      commentsCount: 0
    }
  ];

  const projects = [
      {
          id: 25,
          title: 'Plastic Bottle Vase',
          description: 'Vase made out of plastic bottles',
          date: 'Dec 07, 2025'
      }
  ];

  const leaderboard = [
      { id: 4, rank: 1, name: 'Hanner', points: '810 pts' },
      { id: 8, rank: 2, name: 'Princess Kenshi', points: '40 pts' },
      { id: 18, rank: 3, name: 'Princess', points: '40 pts' },
      { id: 12, rank: 4, name: 'Haruka', points: '20 pts' },
      { id: 19, rank: 5, name: 'Shem John', points: '20 pts' },
      { id: 21, rank: 6, name: 'Lucas', points: '20 pts' },
  ];

  return (
    <ProtectedRoute>
    <div className={styles.container}>
      {/* Load Font Awesome */}
      <Header />
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
            <div className={styles.sectionCard} style={{background: 'none', boxShadow: 'none', padding: 0}}>
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
                      <button type="button" className={styles.requestBtn} onClick={() => handleRequestClick(donation)}>
                        Request Donation
                      </button>

                      <button className={styles.commentsBtn} onClick={() => toggleComments(donation.id)}>
                        <i className="fas fa-comment"></i> Comments
                      </button>
                    </div>

                    {openComments[donation.id] && (
                      <div className={styles.commentsSection}>
                        <div className={styles.commentsList}>
                          <div className={styles.noComments}>No comments yet. Be the first to comment!</div>
                        </div>
                        <div className={styles.addComment}>
                          <textarea className={styles.commentTextarea} placeholder="Add a comment..."></textarea>
                          <button type="button" className={styles.postCommentBtn}>Post Comment</button>
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
                        {/* Use a placeholder image or the actual image path if available */}
                         <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0', color: '#666'}}>
                             Image: {idea.title}
                         </div>
                    </div>
                    <p className={styles.ideaDescription}>
                        {idea.description}
                    </p>
                    <div className={styles.ideaActions}>
                        <button className={styles.actionBtn}>Try This Idea</button>
                        <span className={styles.comments}>{idea.commentsCount} Comments</span>
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
                  {projects.map(project => (
                      <Link key={project.id} href={`/project_details/${project.id}`} className={styles.projectItemLink}>
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
                  <div className={styles.statValue}>0</div>
              </div>
              <div className={styles.statItem}>
                  <div className={styles.statLabel}>Items Donated</div>
                  <div className={styles.statValue}>0</div>
              </div>
          </div>

          <div className={styles.card}>
              <h3>Leaderboard</h3>
              <div className={styles.divider}></div>
              <div className={styles.leaderboardHeader}>
                  <span>TOP 10 USERS</span>
              </div>

              <div className={styles.leaderboardScroll}>
                  {leaderboard.map(user => (
                      <Link key={user.id} href={`/profile/${user.id}`} className={styles.leaderboardItemLink}>
                          <div className={styles.leaderboardItem}>
                              <div className={styles.leaderboardRank}>#{user.rank}</div>
                              <div className={styles.leaderboardInfo}>
                                  <strong className={styles.leaderName}>{user.name}</strong>
                                  <div className={styles.leaderPoints}>{user.points}</div>
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
                <div style={{fontWeight: 500, padding: '8px 0'}}>{selectedDonation.category} - {selectedDonation.subCategory}</div>
            </div>

            <div className={styles.formGroup}>
                <label>Available Items:</label>
                <div style={{fontWeight: 500, padding: '8px 0'}}>{selectedDonation.quantity} {selectedDonation.unit}</div>
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="quantityClaim">Quantity to Claim:</label>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <button type="button" onClick={() => adjustQuantity(-1)} style={{width:'32px', height:'32px', border:'none', background:'#f0f0f0', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>−</button>
                    <input 
                        type="number" 
                        id="quantityClaim" 
                        name="quantityClaim" 
                        value={requestFormData.quantityClaim} 
                        onChange={handleRequestInputChange}
                        min="1" 
                        style={{width:'60px', textAlign:'center', border:'1.5px solid #ccc', borderRadius:'6px', padding:'6px'}} 
                    />
                    <button type="button" onClick={() => adjustQuantity(1)} style={{width:'32px', height:'32px', border:'none', background:'#f0f0f0', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>+</button>
                </div>
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="projectId">Recycling Project:</label>
                <select id="projectId" name="projectId" required value={requestFormData.projectId} onChange={handleRequestInputChange}>
                  <option value="">Select a project</option>
                  {projects.map(p => (
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

            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <button type="submit" className={styles.submitBtn}>Submit Request</button>
                <button type="button" className={styles.btn} style={{background:'#f0f0f0', color:'#333', border:'1px solid #ddd'}} onClick={handleClosePopup}>Cancel</button>
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
    </ProtectedRoute>
  );
}
