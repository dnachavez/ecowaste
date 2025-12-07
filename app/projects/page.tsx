'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './projects.module.css';

// Mock Data Interfaces
interface Material {
  id: string;
  name: string;
  unit: string;
  is_found: boolean;
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
  created_at: string;
  status: 'collecting' | 'in-progress' | 'completed';
  materials: Material[];
  steps: Step[];
}

// Initial Mock Data
const INITIAL_PROJECTS: Project[] = [
  {
    id: '25',
    title: 'Plastic Bottle Vase',
    description: 'Vase made out of plastic bottles',
    created_at: '2025-12-07',
    status: 'in-progress',
    materials: [
      { id: 'm1', name: 'plastic bottles', unit: '3 pcs', is_found: false }
    ],
    steps: []
  }
];

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  // State
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  
  // Edit State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editDescriptionValue, setEditDescriptionValue] = useState('');
  
  // Add Material State
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('');

  // Add Step State
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepInstructions, setNewStepInstructions] = useState('');

  // UI State
  const [userProfileActive, setUserProfileActive] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Handlers
  const handleViewDetails = (project: Project) => {
    setCurrentProject(project);
    setView('details');
    // Reset edit states
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setShowAddMaterial(false);
    setShowAddStep(false);
  };

  const handleBackToList = () => {
    setView('list');
    setCurrentProject(null);
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProject?.id === projectId) {
        handleBackToList();
      }
    }
  };

  // Title Editing
  const startEditTitle = () => {
    if (currentProject) {
      setEditTitleValue(currentProject.title);
      setIsEditingTitle(true);
    }
  };

  const saveTitle = () => {
    if (currentProject && editTitleValue.trim()) {
      const updatedProject = { ...currentProject, title: editTitleValue };
      updateProject(updatedProject);
      setIsEditingTitle(false);
    }
  };

  // Description Editing
  const startEditDescription = () => {
    if (currentProject) {
      setEditDescriptionValue(currentProject.description);
      setIsEditingDescription(true);
    }
  };

  const saveDescription = () => {
    if (currentProject && editDescriptionValue.trim()) {
      const updatedProject = { ...currentProject, description: editDescriptionValue };
      updateProject(updatedProject);
      setIsEditingDescription(false);
    }
  };

  // Helper to update project in list and current view
  const updateProject = (updatedProject: Project) => {
    setCurrentProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  // Materials
  const handleAddMaterial = () => {
    if (currentProject && newMaterialName && newMaterialUnit) {
      const newMaterial: Material = {
        id: Date.now().toString(),
        name: newMaterialName,
        unit: newMaterialUnit,
        is_found: false
      };
      const updatedProject = {
        ...currentProject,
        materials: [...currentProject.materials, newMaterial]
      };
      updateProject(updatedProject);
      setNewMaterialName('');
      setNewMaterialUnit('');
      setShowAddMaterial(false);
    }
  };

  const toggleMaterialFound = (materialId: string) => {
    if (currentProject) {
      const updatedMaterials = currentProject.materials.map(m => 
        m.id === materialId ? { ...m, is_found: !m.is_found } : m
      );
      updateProject({ ...currentProject, materials: updatedMaterials });
    }
  };

  const deleteMaterial = (materialId: string) => {
    if (currentProject && confirm('Delete this material?')) {
      const updatedMaterials = currentProject.materials.filter(m => m.id !== materialId);
      updateProject({ ...currentProject, materials: updatedMaterials });
    }
  };

  // Steps
  const handleAddStep = () => {
    if (currentProject && newStepTitle && newStepInstructions) {
      const newStep: Step = {
        id: Date.now().toString(),
        step_number: currentProject.steps.length + 1,
        title: newStepTitle,
        instructions: newStepInstructions,
        photos: [] // Photo upload not implemented in mock
      };
      const updatedProject = {
        ...currentProject,
        steps: [...currentProject.steps, newStep]
      };
      updateProject(updatedProject);
      setNewStepTitle('');
      setNewStepInstructions('');
      setShowAddStep(false);
    }
  };

  // Status
  const toggleProjectStatus = () => {
    if (currentProject) {
      let newStatus: Project['status'] = 'collecting';
      if (currentProject.status === 'collecting') newStatus = 'in-progress';
      else if (currentProject.status === 'in-progress') newStatus = 'completed';
      
      updateProject({ ...currentProject, status: newStatus });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'collecting': return 'Start Project';
      case 'in-progress': return 'Mark as Complete';
      case 'completed': return 'Completed';
      default: return 'Start Project';
    }
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

  // Start new project
  const handleStartProject = () => {
    router.push('/start-project');
  };

  // Filtering
  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'completed') return p.status === 'completed';
    // Map 'in-progress' filter to both 'collecting' and 'in-progress' or just 'in-progress'?
    // The reference implies 'in-progress' is a specific status, but 'collecting' is also used.
    // Let's assume 'in-progress' filter shows non-completed.
    if (filter === 'in-progress') return p.status !== 'completed';
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Load Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&amp;family=Open+Sans&amp;display=swap" rel="stylesheet" />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <Image src="/ecowaste_logo.png" alt="EcoWaste Logo" width={70} height={70} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>EcoWaste</h1>
        </div>
        <div 
          className={`${styles.userProfile} ${userProfileActive ? styles.active : ''}`}
          onClick={() => setUserProfileActive(!userProfileActive)}
        >
          <div className={styles.profilePic}>
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                style={{width: '100%', height: '100%', objectFit: 'cover'}} 
              />
            ) : (
              (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U')
            )}
          </div>
          <span className={styles.profileName}>{user?.displayName || 'User'}</span>
          <i className={`fas fa-chevron-down ${styles['dropdown-arrow']}`}></i>
          <div className={styles.profileDropdown}>
            <Link href="/profile" className={styles.dropdownItem}><i className="fas fa-user"></i> My Profile</Link>
            <a href="#" className={styles.dropdownItem}><i className="fas fa-cog"></i> Settings</a>
            <div className={styles.dropdownDivider}></div>
            <Link href="/logout" className={styles.dropdownItem}><i className="fas fa-sign-out-alt"></i> Logout</Link>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <nav>
          <ul>
            <li><Link href="/homepage"><i className="fas fa-home"></i>Home</Link></li>
            <li><Link href="/browse"><i className="fas fa-search"></i>Browse</Link></li>
            <li><Link href="/achievements"><i className="fas fa-star"></i>Achievements</Link></li>
            <li><Link href="/leaderboard"><i className="fas fa-trophy"></i>Leaderboard</Link></li>
            <li><Link href="/projects" className={styles.active}><i className="fas fa-recycle"></i>Projects</Link></li>
            <li><Link href="/donations"><i className="fas fa-hand-holding-heart"></i>Donations</Link></li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles['main-content']}>
        {view === 'list' ? (
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
              {filteredProjects.length > 0 ? (
                filteredProjects.map(project => (
                  <div key={project.id} className={styles['project-card']}>
                    <div className={styles['project-card-content']}>
                      <div className={styles['project-header']}>
                        <h3>{project.title}</h3>
                        <span className={styles['project-date']}>Created: {project.created_at}</span>
                      </div>
                      <div className={styles['project-description']}>
                        {project.description}
                      </div>
                      <div className={styles['project-materials']}>
                        <h4>Materials ({project.materials.length}):</h4>
                        <ul>
                          {project.materials.slice(0, 3).map(m => (
                            <li key={m.id}>{m.name}</li>
                          ))}
                          {project.materials.length > 3 && <li>...</li>}
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
        ) : (
          <div id="projectDetailsView">
            {currentProject && (
              <>
                <div className={styles['back-button-container']}>
                  <button className={styles['back-button']} onClick={handleBackToList}>
                    <i className="fas fa-arrow-left"></i> Back to Projects
                  </button>
                </div>
                
                <div className={styles['project-details-content']}>
                  <div className={styles['project-details-header']}>
                    <div className={styles['editable-title']}>
                      {!isEditingTitle ? (
                        <>
                          <h2 style={{ fontSize: '1.8rem' }}>{currentProject.title}</h2>
                          <button className={styles['edit-btn']} onClick={startEditTitle}>
                            <i className="fas fa-edit"></i>
                          </button>
                        </>
                      ) : (
                        <div style={{ width: '100%' }}>
                          <input 
                            type="text" 
                            className={styles['edit-input']} 
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                          />
                          <div>
                            <button className={styles['save-btn']} onClick={saveTitle}>Save</button>
                            <button className={styles['cancel-btn']} onClick={() => setIsEditingTitle(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <span style={{ color: '#888', display: 'block', marginTop: '5px' }}>
                      Created: {currentProject.created_at}
                    </span>
                  </div>

                  <div className={styles['project-details-section']}>
                    <div className={styles['section-header']}>
                      <h3>Description</h3>
                      <button className={styles['edit-btn']} onClick={startEditDescription}>
                        <i className="fas fa-edit"></i>
                      </button>
                    </div>
                    {!isEditingDescription ? (
                      <div>{currentProject.description}</div>
                    ) : (
                      <div>
                        <textarea 
                          className={styles['edit-input']} 
                          style={{ minHeight: '100px', resize: 'vertical' }}
                          value={editDescriptionValue}
                          onChange={(e) => setEditDescriptionValue(e.target.value)}
                        ></textarea>
                        <div>
                          <button className={styles['save-btn']} onClick={saveDescription}>Save</button>
                          <button className={styles['cancel-btn']} onClick={() => setIsEditingDescription(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles['project-details-section']}>
                    <div className={styles['section-header']}>
                      <h3>Project Status</h3>
                      <button className={styles['status-btn']} onClick={toggleProjectStatus}>
                        {currentProject.status === 'completed' ? (
                          <><i className="fas fa-check-circle"></i> Completed</>
                        ) : (
                          <><i className="fas fa-flag"></i> {getStatusLabel(currentProject.status)}</>
                        )}
                      </button>
                    </div>
                    <div className={styles['progress-tracker']}>
                      <div className={`${styles['progress-step']} ${['collecting', 'in-progress', 'completed'].includes(currentProject.status) ? styles.active : ''}`}>
                        <i className="fas fa-box"></i>
                        <span>Materials</span>
                      </div>
                      <div className={`${styles['progress-step']} ${['in-progress', 'completed'].includes(currentProject.status) ? styles.active : ''}`}>
                        <i className="fas fa-tools"></i>
                        <span>In Progress</span>
                      </div>
                      <div className={`${styles['progress-step']} ${currentProject.status === 'completed' ? styles.active : ''}`}>
                        <i className="fas fa-check-circle"></i>
                        <span>Completed</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles['project-details-section']}>
                    <div className={styles['section-header']}>
                      <h3>Materials</h3>
                      <button className={styles['save-btn']} style={{ display: 'flex', alignItems: 'center', gap: '5px' }} onClick={() => setShowAddMaterial(true)}>
                        <i className="fas fa-plus"></i> Add Material
                      </button>
                    </div>
                    
                    {showAddMaterial && (
                      <div className={styles['add-material-form']} style={{ display: 'block' }}>
                        <div className={styles['form-row']}>
                          <input 
                            type="text" 
                            className={styles['edit-input']} 
                            placeholder="Material name"
                            value={newMaterialName}
                            onChange={(e) => setNewMaterialName(e.target.value)}
                          />
                          <input 
                            type="text" 
                            className={styles['edit-input']} 
                            placeholder="Unit (e.g., pcs)"
                            value={newMaterialUnit}
                            onChange={(e) => setNewMaterialUnit(e.target.value)}
                          />
                        </div>
                        <div>
                          <button className={styles['save-btn']} onClick={handleAddMaterial}>Add</button>
                          <button className={styles['cancel-btn']} onClick={() => setShowAddMaterial(false)}>Cancel</button>
                        </div>
                      </div>
                    )}

                    <div className={styles['materials-list']}>
                      {currentProject.materials.length > 0 ? (
                        currentProject.materials.map(material => (
                          <div key={material.id} className={styles['material-item']}>
                            <div className={styles['material-content']}>
                              <span>{material.name}</span>
                              <span style={{ color: '#888', fontSize: '0.9em' }}>{material.unit}</span>
                              {material.is_found && <i className={`fas fa-check-circle ${styles['material-check']}`}></i>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {!material.is_found && (
                                <button className={styles['check-btn']} onClick={() => toggleMaterialFound(material.id)}>
                                  <i className="fas fa-check"></i>
                                </button>
                              )}
                              <button className={`${styles['action-btn']} ${styles['delete-btn']}`} onClick={() => deleteMaterial(material.id)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No materials added yet.</p>
                      )}
                    </div>
                  </div>

                  <div className={styles['project-details-section']}>
                    <div className={styles['section-header']}>
                      <h3>Project Steps</h3>
                      <button className={styles['save-btn']} style={{ display: 'flex', alignItems: 'center', gap: '5px' }} onClick={() => setShowAddStep(true)}>
                        <i className="fas fa-plus"></i> Add Step
                      </button>
                    </div>

                    {showAddStep && (
                      <div className={styles['add-step-form']} style={{ display: 'block' }}>
                        <input 
                          type="text" 
                          className={styles['edit-input']} 
                          placeholder="Step Title"
                          value={newStepTitle}
                          onChange={(e) => setNewStepTitle(e.target.value)}
                        />
                        <textarea 
                          className={styles['edit-input']} 
                          placeholder="Instructions..."
                          value={newStepInstructions}
                          onChange={(e) => setNewStepInstructions(e.target.value)}
                          style={{ minHeight: '80px', resize: 'vertical' }}
                        ></textarea>
                        <div>
                          <button className={styles['save-btn']} onClick={handleAddStep}>Add Step</button>
                          <button className={styles['cancel-btn']} onClick={() => setShowAddStep(false)}>Cancel</button>
                        </div>
                      </div>
                    )}

                    <div className={styles['steps-list']}>
                      {currentProject.steps.length > 0 ? (
                        currentProject.steps.map(step => (
                          <div key={step.id} className={styles['step-item']}>
                            <div className={styles['step-header']}>
                              <h4>Step {step.step_number}: {step.title}</h4>
                            </div>
                            <div className={styles['step-content']}>
                              <p>{step.instructions}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No steps added yet.</p>
                      )}
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        )}
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
  );
}
