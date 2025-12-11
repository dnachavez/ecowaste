'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './projects.module.css';

// Data Interfaces
interface Material {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  is_found?: boolean;
}

interface Step {
  id: string;
  step_number: number;
  title: string;
  instructions: string;
  photos: string[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  status: 'active' | 'collecting' | 'in-progress' | 'completed';
  materials: Material[];
  steps?: Step[];
  authorId: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  
  // Feedback state
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [ratingError, setRatingError] = useState(false);
    const [textError, setTextError] = useState(false);


  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const projectsRef = ref(db, 'projects');
      const userProjectsQuery = query(projectsRef, orderByChild('authorId'), equalTo(user.uid));

      const unsubscribe = onValue(userProjectsQuery, (snapshot) => {
        if (snapshot.exists()) {
          const projectsData = snapshot.val();
          const projectsList = Object.values(projectsData) as Project[];
          // Sort by createdAt descending
          projectsList.sort((a, b) => b.createdAt - a.createdAt);
          setProjects(projectsList);
        } else {
          setProjects([]);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching projects:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Avoid setting state synchronously
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  // Handlers
  const handleViewDetails = (project: Project) => {
    router.push(`/projects/${project.id}`);
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  // Start new project
  const handleStartProject = () => {
    router.push('/start-project');
  };

  // Feedback
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

  // Filtering
  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'completed') return p.status === 'completed';
    if (filter === 'in-progress') return p.status !== 'completed';
    return true;
  });

  return (
    <ProtectedRoute>
    <div className={styles.container}>
      <Header />
      <Sidebar />

      {/* Main Content */}
      <main className={styles['main-content']}>
        <div id="projectsListView">
          <div className={styles['page-header']}>
            <h2 className={styles['page-title']}>My Recycling Projects</h2>
            <button onClick={handleStartProject} className={styles['start-recycling-btn']}>
              <i className="fas fa-plus"></i> Start Recycling
            </button>
          </div>
          
          <div className={styles['projects-filter']}>
            <div 
              className={`${styles['filter-tab']} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >All Projects</div>
            <div 
              className={`${styles['filter-tab']} ${filter === 'in-progress' ? styles.active : ''}`}
              onClick={() => setFilter('in-progress')}
            >In Progress</div>
            <div 
              className={`${styles['filter-tab']} ${filter === 'completed' ? styles.active : ''}`}
              onClick={() => setFilter('completed')}
            >Completed</div>
          </div>
          
          <div className={styles['projects-container']}>
            {loading ? (
              <div className={styles['empty-state']}>
                <p>Loading projects...</p>
              </div>
            ) : filteredProjects.length > 0 ? (
              filteredProjects.map(project => (
                <div key={project.id} className={styles['project-card']}>
                  <div className={styles['project-card-content']}>
                    <div className={styles['project-header']}>
                      <h3>{project.title}</h3>
                      <span className={styles['project-date']}>
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles['project-description']}>
                      {project.description}
                    </div>
                    <div className={styles['project-materials']}>
                      <h4>Materials ({project.materials?.length || 0}):</h4>
                      <ul>
                        {project.materials?.slice(0, 3).map(m => (
                          <li key={m.id}>{m.name} {m.quantity ? `(${m.quantity})` : ''}</li>
                        ))}
                        {(project.materials?.length || 0) > 3 && <li>...</li>}
                      </ul>
                    </div>
                  </div>
                  <div className={styles['project-actions']}>
                    <button 
                      className={`${styles['action-btn']} ${styles['view-details']}`}
                      onClick={() => handleViewDetails(project)}
                    >
                      <i className="fas fa-eye"></i> View Details
                    </button>
                    <button 
                      className={`${styles['action-btn']} ${styles['delete-btn']}`}
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles['empty-state']}>
                <i className="fas fa-check-circle"></i>
                <p><b>No Projects Found</b></p>
                <p style={{ color: '#666' }}>Start a new recycling project today!</p>
              </div>
            )}
          </div>
        </div>
      </main>

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
                {ratingError && <div className={styles.errorMessage} style={{display: 'block'}}>Please select a rating</div>}
                
                <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                <textarea 
                  placeholder="Your feedback helps us make EcoWaste better..."
                  value={feedbackText}
                  onChange={(e) => {
                    setFeedbackText(e.target.value);
                    setTextError(false);
                  }}
                ></textarea>
                {textError && <div className={styles.errorMessage} style={{display: 'block'}}>Please provide your feedback</div>}
                
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
              <div className={styles.thankYouMessage} style={{display: 'block'}}>
                <span className={styles.thankYouEmoji}>🎉</span>
                <h3>Thank You!</h3>
                <p>We appreciate your feedback and will use it to improve EcoWaste.</p>
                <p>Your opinion matters to us!</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Font Awesome CDN (Temporary approach, should ideally be in layout or imported) */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    </div>
    </ProtectedRoute>
  );
}
