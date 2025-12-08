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
  
  // UI State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
  const submitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackRating === 0 || !feedbackText.trim()) return;
    
    setIsSubmittingFeedback(true);
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSubmitted(false);
        setFeedbackRating(0);
        setFeedbackText('');
      }, 2000);
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
      <div className={styles['feedback-btn']} onClick={() => setShowFeedbackModal(true)}>💬</div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className={styles['feedback-modal']} style={{ display: 'flex' }}>
          <div className={styles['feedback-content']}>
            <span className={styles['feedback-close-btn']} onClick={() => setShowFeedbackModal(false)}>×</span>
            {!feedbackSubmitted ? (
              <form onSubmit={submitFeedback}>
                <h3 style={{ color: '#82AA52', marginBottom: '20px' }}>Share Your Feedback</h3>
                
                <div className={styles['emoji-rating']}>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <div 
                      key={rating}
                      className={`${styles['emoji-option']} ${feedbackRating === rating ? styles.selected : ''}`}
                      onClick={() => setFeedbackRating(rating)}
                    >
                      <span className={styles['emoji']}>{['😞', '😕', '😐', '🙂', '😍'][rating-1]}</span>
                      <span className={styles['emoji-label']}>{['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'][rating-1]}</span>
                    </div>
                  ))}
                </div>
                
                <textarea 
                  id="feedbackText" 
                  placeholder="Your feedback helps us make EcoWaste better..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                ></textarea>
                
                <button type="submit" className={styles['feedback-submit-btn']} disabled={isSubmittingFeedback}>
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}>🎉</span>
                <h3 style={{ color: '#82AA52' }}>Thank You!</h3>
                <p>We appreciate your feedback.</p>
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
