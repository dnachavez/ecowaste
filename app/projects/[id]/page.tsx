'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import styles from './project-details.module.css';

// Mock Data Interfaces (Should match projects/page.tsx)
interface Material {
  id: string;
  name: string;
  unit: string;
  needed: number;
  acquired: number;
  is_found: boolean;
  is_completed: boolean;
}

interface Step {
  id: string;
  step_number: number;
  title: string;
  description: string;
  is_completed: boolean;
  images: string[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  created_at: string;
  status: 'collecting' | 'in-progress' | 'completed';
  materials: Material[];
  steps: Step[];
  workflow_stage: 1 | 2 | 3; // 1: Preparation, 2: Construction, 3: Share
}

// Mock Data
const MOCK_PROJECT: Project = {
  id: '25',
  title: 'Plastic Bottle Vase',
  description: 'Vase made out of plastic bottles',
  created_at: 'Dec 07, 2025',
  status: 'in-progress',
  workflow_stage: 1,
  materials: [
    { 
      id: '96', 
      name: 'plastic bottles', 
      unit: 'pcs', 
      needed: 1, 
      acquired: 1, 
      is_found: true,
      is_completed: true 
    }
  ],
  steps: [
    {
      id: '6',
      step_number: 1,
      title: 'Step 1',
      description: 'In a large bowl, add the all purpose flour, powdered milk and baking powder. Combine and mix well.',
      is_completed: true,
      images: []
    }
  ]
};

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'preparation' | 'construction' | 'share'>('preparation');
  
  // Modal States
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  useEffect(() => {
    // In a real app, fetch project by ID
    // For now, use mock data if ID matches or just load it
    if (params.id && !project) {
      // Defer state update to next tick to avoid cascading renders
      queueMicrotask(() => setProject(MOCK_PROJECT));
    }
  }, [params.id, project]);

  if (!project) {
    return <div>Loading...</div>;
  }

  const handleTabChange = (tab: 'preparation' | 'construction' | 'share') => {
    setActiveTab(tab);
  };

  const calculateProgress = () => {
    // Simple progress calculation based on stage
    if (activeTab === 'preparation') return 33;
    if (activeTab === 'construction') return 66;
    if (activeTab === 'share') return 100;
    return 0;
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Header />
        <Sidebar />

        <main className={styles['main-content']}>
          {/* Back Link */}
          <Link href="/projects" className={styles['back-link']}>
            <i className="fas fa-arrow-left"></i> Back to Projects
          </Link>

          {/* Project Header */}
          <section className={styles['project-header']}>
            <div className={styles['project-actions']}>
              <button className={styles['edit-btn']}>
                <i className="fas fa-edit"></i> Edit Project
              </button>
            </div>
            
            <div className={styles['project-title-section']}>
              <span className={styles['project-section-label']}>Project Title</span>
              <h1 className={styles['project-title']}>{project.title}</h1>
            </div>
            
            <div className={styles['project-description-section']}>
              <span className={styles['project-section-label']}>Project Description</span>
              <div className={styles['project-description']}>
                {project.description}
              </div>
            </div>
            
            <div className={styles['project-meta']}>
              <i className="far fa-calendar-alt"></i> Created: {project.created_at}
            </div>
          </section>

          {/* Workflow Section */}
          <section className={styles['workflow-section']}>
            <h2 className={styles['section-title']}>
              <i className="fas fa-tasks"></i> Project Workflow
            </h2>
            
            {/* Progress Bar */}
            <div className={styles['progress-container']}>
              <div className={styles['progress-text']}>
                Stage {activeTab === 'preparation' ? 1 : activeTab === 'construction' ? 2 : 3} of 3
              </div>
              <div className={styles['progress-bar']}>
                <div 
                  className={styles['progress-fill']} 
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className={styles['workflow-tabs']}>
              <div className={styles['tab-nav']}>
                <button 
                  className={`${styles['tab-button']} ${activeTab === 'preparation' ? styles.active : ''}`}
                  onClick={() => handleTabChange('preparation')}
                >
                  <span className={styles['tab-number']}>1</span>
                  Preparation
                </button>
                <button 
                  className={`${styles['tab-button']} ${activeTab === 'construction' ? styles.active : ''}`}
                  onClick={() => handleTabChange('construction')}
                >
                  <span className={styles['tab-number']}>2</span>
                  Construction
                </button>
                <button 
                  className={`${styles['tab-button']} ${activeTab === 'share' ? styles.active : ''}`}
                  onClick={() => handleTabChange('share')}
                >
                  <span className={styles['tab-number']}>3</span>
                  Share
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className={styles['tab-content-container']}>
              
              {/* Preparation Tab */}
              {activeTab === 'preparation' && (
                <div className={styles['tab-content']} style={{ display: 'block' }}>
                  <div className={`${styles['stage-card']} ${project.workflow_stage > 1 ? styles.completed : styles.current}`}>
                    {project.workflow_stage > 1 && (
                      <span className={styles['stage-check']}><i className="fas fa-check"></i></span>
                    )}
                    
                    <div className={styles['stage-header']}>
                      <div className={styles['stage-marker']}>
                        <span className={styles['stage-number']}>1</span>
                      </div>
                      <div className={styles['stage-title-container']}>
                        <h3 className={styles['stage-title']}>Preparation</h3>
                        <p className={styles['stage-subtitle']}>Collect materials required for this project</p>
                      </div>
                      <div className={styles['stage-status']}>
                        <span className={`${styles['status-badge']} ${project.workflow_stage > 1 ? styles.completed : styles.current}`}>
                          {project.workflow_stage > 1 ? 'COMPLETED' : 'CURRENT'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles['stage-content']}>
                      <h4 className={styles['content-title']}>Materials Needed</h4>
                      <ul className={styles['materials-list']}>
                        {project.materials.map(material => (
                          <li key={material.id} className={styles['material-item']}>
                            <div className={styles['material-info']}>
                              <div className={styles['material-name']}>{material.name}</div>
                              <div className={styles['material-quantity']}>
                                <span className={`${styles['quantity-display']} ${material.is_completed ? styles.completed : ''}`}>
                                  {material.acquired}/{material.needed}
                                </span> units needed
                                {material.is_completed && (
                                  <span className={styles['material-complete-badge']}>
                                    <i className="fas fa-check-circle"></i> Complete
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={styles['material-actions']}>
                              <button className={`${styles['btn']} ${styles['checklist-btn']} ${material.is_completed ? styles.completed : ''}`}>
                                <i className="fas fa-check-circle"></i> Checklist
                              </button>
                              <button className={`${styles['btn']} ${styles['small']} ${styles['danger']}`}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      
                      <div className={styles['stage-actions']}>
                        <button className={`${styles['btn']} ${styles['primary']}`} onClick={() => setShowAddMaterialModal(true)}>
                          <i className="fas fa-plus"></i> Add Material
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Construction Tab */}
              {activeTab === 'construction' && (
                <div className={styles['tab-content']} style={{ display: 'block' }}>
                  <div className={`${styles['stage-card']} ${project.workflow_stage > 2 ? styles.completed : styles.current}`}>
                    <div className={styles['stage-header']}>
                      <div className={styles['stage-marker']}>
                        <span className={styles['stage-number']}>2</span>
                      </div>
                      <div className={styles['stage-title-container']}>
                        <h3 className={styles['stage-title']}>Construction</h3>
                        <p className={styles['stage-subtitle']}>Build your project, follow safety guidelines, document progress</p>
                      </div>
                      <div className={styles['stage-status']}>
                        <span className={`${styles['status-badge']} ${project.workflow_stage > 2 ? styles.completed : styles.current}`}>
                          {project.workflow_stage > 2 ? 'COMPLETED' : 'CURRENT'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles['stage-content']}>
                      <h4 className={styles['content-title']}>Steps</h4>
                      <ul className={styles['steps-list']}>
                        {project.steps.map(step => (
                          <li key={step.id} className={styles['step-item']}>
                            <div className={styles['step-info']}>
                              <div className={styles['step-title']}>
                                Step {step.step_number}
                                {step.is_completed && (
                                  <span className={styles['step-status-badge']}>
                                    <i className="fas fa-check-circle"></i> Complete
                                  </span>
                                )}
                              </div>
                              <div className={styles['step-description']}>{step.description}</div>
                            </div>
                            <div className={styles['step-actions']}>
                              <button className={`${styles['btn']} ${styles['small']} ${styles['primary']}`}>
                                <i className="fas fa-camera"></i> Add Images
                              </button>
                              <button className={`${styles['btn']} ${styles['small']} ${styles['danger']}`}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      
                      <div className={styles['stage-actions']}>
                        <button className={`${styles['btn']} ${styles['primary']}`} onClick={() => setShowAddStepModal(true)}>
                          <i className="fas fa-plus"></i> Add Step
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Share Tab */}
              {activeTab === 'share' && (
                <div className={styles['tab-content']} style={{ display: 'block' }}>
                  <div className={`${styles['stage-card']} ${styles.current}`}>
                    <div className={styles['stage-header']}>
                      <div className={styles['stage-marker']}>
                        <span className={styles['stage-number']}>3</span>
                      </div>
                      <div className={styles['stage-title-container']}>
                        <h3 className={styles['stage-title']}>Share</h3>
                        <p className={styles['stage-subtitle']}>Share your project with the community</p>
                      </div>
                      <div className={styles['stage-status']}>
                        <span className={`${styles['status-badge']} ${styles.current}`}>CURRENT</span>
                      </div>
                    </div>
                    
                    <div className={styles['stage-content']}>
                      <div className={styles['form-group']}>
                        <label>Project Description</label>
                        <div className={styles['project-description-section']}>
                          {project.description}
                        </div>
                      </div>
                      
                      <div className={styles['form-group']}>
                        <label>Final Project Image *</label>
                        <div className={styles['final-image-upload-area']}>
                          <div className={styles['upload-icon']}><i className="fas fa-camera"></i></div>
                          <div className={styles['upload-text']}>Click to upload final project image</div>
                          <div className={styles['upload-hint']}>* Required for sharing to community</div>
                        </div>
                      </div>
                      
                      <div className={styles['share-options']}>
                        <div className={`${styles['share-option']} ${styles.selected}`}>
                          <i className="fas fa-lock"></i>
                          <div className={styles['share-option-title']}>Keep Private</div>
                          <div className={styles['share-option-description']}>Only you can view this project</div>
                        </div>
                        <div className={styles['share-option']}>
                          <i className="fas fa-share-alt"></i>
                          <div className={styles['share-option-title']}>Share to Community</div>
                          <div className={styles['share-option-description']}>Share with other EcoWaste users</div>
                        </div>
                      </div>
                      
                      <div className={styles['materials-summary']}>
                        <div className={styles['summary-title']}>Materials Used</div>
                        <ul className={styles['summary-list']}>
                          {project.materials.map(material => (
                            <li key={material.id} className={styles['summary-item']}>
                              <span>{material.name}</span>
                              <span>{material.needed} units</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className={styles['stage-actions']}>
                      <button className={`${styles['btn']} ${styles['secondary']}`}>Keep Private</button>
                      <button className={`${styles['btn']} ${styles['primary']}`}>Share to Community</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Font Awesome CDN */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

        {/* Add Material Modal */}
        {showAddMaterialModal && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Add Material</h3>
                <button className={styles['close-modal']} onClick={() => setShowAddMaterialModal(false)}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label>Material Name *</label>
                  <input type="text" placeholder="Enter material name" />
                </div>
                <div className={styles['form-group']}>
                  <label>Quantity *</label>
                  <input type="number" min="1" defaultValue="1" />
                </div>
                <div className={styles['form-group']}>
                  <label>Unit *</label>
                  <input type="text" placeholder="e.g. pcs, kg" />
                </div>
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={() => setShowAddMaterialModal(false)}>Cancel</button>
                <button className={`${styles['action-btn']} ${styles['check-btn']}`}>Add Material</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Step Modal */}
        {showAddStepModal && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Add Step</h3>
                <button className={styles['close-modal']} onClick={() => setShowAddStepModal(false)}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label>Step Title *</label>
                  <input type="text" placeholder="Enter step title" />
                </div>
                <div className={styles['form-group']}>
                  <label>Description *</label>
                  <textarea placeholder="Describe what needs to be done..."></textarea>
                </div>
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={() => setShowAddStepModal(false)}>Cancel</button>
                <button className={`${styles['action-btn']} ${styles['check-btn']}`}>Add Step</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
