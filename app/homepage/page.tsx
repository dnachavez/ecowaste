'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './homepage.module.css';

export default function Homepage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('donations');
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});

  // Popup state
  const [showDonationPopup, setShowDonationPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    wasteType: '',
    otherWaste: '',
    subcategory: '',
    quantity: '',
    description: '',
    photos: [] as File[]
  });

  const subcategories: Record<string, string[]> = {
    Plastic: ["Plastic Bottles", "Plastic Containers", "Plastic Bags", "Wrappers"],
    Paper: ["Newspapers", "Cardboard", "Magazines", "Office Paper"],
    Glass: ["Glass Bottles", "Glass Jars", "Broken Glassware"],
    Metal: ["Aluminum Cans", "Tin Cans", "Scrap Metal"],
    Electronic: ["Old Phones", "Chargers", "Batteries", "Broken Gadgets"]
  };

  const handleDonateClick = () => {
    setShowDonationPopup(true);
  };

  const handleClosePopup = () => {
    setShowDonationPopup(false);
    setShowSuccessPopup(false);
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
      setFormData(prev => ({
        ...prev,
        photos: Array.from(e.target.files || [])
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate submission
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
  };

  const toggleComments = (id: number) => {
    setOpenComments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const donations = [
    {
      id: 106,
      user: { name: 'Lucas', avatar: 'L', id: 21 },
      category: 'Paper',
      subCategory: 'Cardboard',
      timeAgo: '3 days ago',
      quantity: '3/3',
      unit: 'Units',
      description: '3 Clean unused cardboards.',
      images: [], // We don't have the actual images, so I'll leave empty or put placeholders if needed
      comments: []
    },
    {
      id: 103,
      user: { name: 'Princess', avatar: 'P', id: 18 },
      category: 'Plastic',
      subCategory: 'Plastic Bags',
      timeAgo: '12 days ago',
      quantity: '2/3',
      unit: 'Units',
      description: '3 clean plastic bags',
      images: [],
      comments: []
    },
    {
      id: 93,
      user: { name: 'Haruka', avatar: 'H', id: 12 },
      category: 'Metal',
      subCategory: 'Aluminum Cans',
      timeAgo: '17 days ago',
      quantity: '3/3',
      unit: 'Units',
      description: '3 clean aluminum cans',
      images: [],
      comments: []
    }
  ];

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
                {donations.map(donation => (
                  <div key={donation.id} className={styles.donationPost}>
                    <div className={styles.donationUserHeader}>
                      <div className={styles.userAvatar}>
                        {donation.user.avatar}
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
                       {/* Add placeholder images if needed */}
                    </div>

                    <div className={styles.donationActions}>
                      <button type="button" className={styles.requestBtn}>
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
    </ProtectedRoute>
  );
}
