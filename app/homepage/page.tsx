'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import styles from './homepage.module.css';

export default function Homepage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('donations');
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});

  // Protect the route
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const toggleComments = (id: number) => {
    setOpenComments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

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
    <div className={styles.container}>
      {/* Load Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&amp;family=Open+Sans&amp;display=swap" rel="stylesheet" />

      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <img src="/ecowaste_logo.png" alt="EcoWaste Logo" />
          </div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: '24px' }}>EcoWaste</h1>
        </div>
        <div className={styles.userProfile}>
          <div className={styles.profilePic}>
            {user.photoURL ? <img src={user.photoURL} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U')}
          </div>
          <span className={styles.profileName}>{user.displayName || 'User'}</span>
          <i className={`fas fa-chevron-down ${styles.dropdownArrow}`}></i>
          <div className={styles.profileDropdown}>
            <Link href="/profile" className={styles.dropdownItem}><i className="fas fa-user"></i> My Profile</Link>
            <Link href="/settings" className={styles.dropdownItem}><i className="fas fa-cog"></i> Settings</Link>
            <div className={styles.dropdownDivider}></div>
            <button onClick={handleLogout} className={styles.dropdownItem} style={{width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit'}}>
                <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <nav>
          <ul>
            <li><Link href="/homepage" className={styles.active}><i className="fas fa-home"></i>Home</Link></li>
            <li><Link href="/browse"><i className="fas fa-search"></i>Browse</Link></li>
            <li><Link href="/achievements"><i className="fas fa-star"></i>Achievements</Link></li>
            <li><Link href="/leaderboard"><i className="fas fa-trophy"></i>Leaderboard</Link></li>
            <li><Link href="/projects"><i className="fas fa-recycle"></i>Projects</Link></li>
            <li><Link href="/donations"><i className="fas fa-hand-holding-heart"></i>Donations</Link></li>
          </ul>
        </nav>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.welcomeCard}>
          <h2>WELCOME TO ECOWASTE</h2>
          <div className={styles.divider}></div>
          <p>Join our community in making the world a cleaner place</p>
          <div className={styles.btnContainer}>
            <button type="button" className={styles.btn}>Donate Waste</button>
            <Link href="/start_project" className={styles.btn}>Start Recycling</Link>
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
  );
}
