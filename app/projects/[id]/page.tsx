'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ref, onValue, update, remove } from 'firebase/database';
// import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { db } from '../../../lib/firebase';
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

// Mock Data removed


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

  // Edit Project State
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [checklistQuantity, setChecklistQuantity] = useState<string>('');
  const [checklistError, setChecklistError] = useState<string>('');
  const [checklistFile, setChecklistFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (params.id) {
      const projectRef = ref(db, `projects/${params.id}`);
      const unsubscribe = onValue(projectRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Transform materials object to array if needed
          const materialsList = data.materials ? Object.entries(data.materials).map(([key, value]) => {
            const mat = value as { needed?: number; quantity?: string; unit?: string; [key: string]: unknown };
            return {
              ...mat,
              id: key, // Use Firebase key as the ID to ensure uniqueness and correct update path
              needed: mat.needed !== undefined ? mat.needed : (parseInt(mat.quantity || '0') || 0),
              unit: mat.unit || 'units'
            };
          }) : [];
          
          const stepsList = data.steps ? Object.entries(data.steps as Record<string, Omit<Step, 'id'>>).map(([key, value]) => ({
            id: key,
            ...value
          })) : [];

          setProject({
            ...data,
            id: params.id as string,
            materials: materialsList,
            steps: stepsList
          });
        }
      });
      return () => unsubscribe();
    }
  }, [params.id]);

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

  const isAllMaterialsCompleted = project?.materials.length > 0 && project?.materials.every(m => m.is_completed);

  const handleProceed = async () => {
    if (!project || !isAllMaterialsCompleted) return;

    try {
      const projectRef = ref(db, `projects/${project.id}`);
      await update(projectRef, {
        workflow_stage: 2
      });
      setActiveTab('construction');
    } catch (error) {
      console.error('Error proceeding to next stage:', error);
    }
  };

  const handleChecklistClick = (material: Material) => {
    setSelectedMaterial(material);
    setChecklistQuantity('');
    setChecklistError('');
    setChecklistFile(null);
    setShowChecklistModal(true);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setChecklistFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChecklistSubmit = async () => {
    if (!selectedMaterial || !project) return;

    const qty = parseInt(checklistQuantity);
    if (isNaN(qty) || qty < selectedMaterial.needed) {
      setChecklistError(`Quantity must be at least ${selectedMaterial.needed} ${selectedMaterial.unit}`);
      return;
    }

    if (!checklistFile) {
      setChecklistError('Proof of material is required');
      return;
    }

    setIsUploading(true);
    try {
      // Update material in DB
      const materialRef = ref(db, `projects/${project.id}/materials/${selectedMaterial.id}`);
      await update(materialRef, {
        acquired: qty,
        is_completed: true,
        evidence_image: checklistFile 
      });

      setShowChecklistModal(false);
    } catch (error) {
      console.error('Error updating material:', error);
      setChecklistError('Failed to update material. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!project || project.materials.length <= 1) return;
    
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        const materialRef = ref(db, `projects/${project.id}/materials/${materialId}`);
        await remove(materialRef);
      } catch (error) {
        console.error('Error deleting material:', error);
      }
    }
  };

  const handleEditProjectClick = () => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description);
      setShowEditProjectModal(true);
    }
  };

  const handleUpdateProject = async () => {
    if (!project || !editTitle.trim() || !editDescription.trim()) return;

    try {
      const projectRef = ref(db, `projects/${project.id}`);
      await update(projectRef, {
        title: editTitle,
        description: editDescription
      });
      setShowEditProjectModal(false);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    }
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
              <button className={styles['edit-btn']} onClick={handleEditProjectClick}>
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
                                  {material.acquired || 0}/{material.needed}
                                </span> units needed
                                {material.is_completed && (
                                  <span className={styles['material-complete-badge']}>
                                    <i className="fas fa-check-circle"></i> Complete
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={styles['material-actions']}>
                              <button 
                                className={`${styles['btn']} ${styles['checklist-btn']} ${material.is_completed ? styles.completed : ''}`}
                                onClick={() => handleChecklistClick(material)}
                              >
                                <i className="fas fa-check-circle"></i> Checklist
                              </button>
                              <Link 
                                href={`/browse?search=${encodeURIComponent(material.name)}`}
                                className={`${styles['btn']} ${styles['small']} ${styles['primary']}`}
                                title="Find Donation"
                                style={{ marginRight: '5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <i className="fas fa-search"></i>
                              </Link>
                              <button 
                                className={`${styles['btn']} ${styles['small']} ${styles['danger']}`}
                                onClick={() => handleDeleteMaterial(material.id)}
                                disabled={project.materials.length <= 1}
                                style={{ opacity: project.materials.length <= 1 ? 0.5 : 1, cursor: project.materials.length <= 1 ? 'not-allowed' : 'pointer' }}
                              >
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
                        <button 
                          className={`${styles['btn']} ${isAllMaterialsCompleted ? styles['primary'] : styles['secondary']}`} 
                          onClick={handleProceed}
                          disabled={!isAllMaterialsCompleted} 
                          style={{ 
                            opacity: isAllMaterialsCompleted ? 1 : 0.5, 
                            cursor: isAllMaterialsCompleted ? 'pointer' : 'not-allowed', 
                            marginLeft: '10px' 
                          }}
                        >
                          Proceed
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

        {/* Checklist Modal */}
        {showChecklistModal && selectedMaterial && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Checklist: {selectedMaterial.name}</h3>
                <button className={styles['close-modal']} onClick={() => setShowChecklistModal(false)}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label>Quantity Acquired ({selectedMaterial.unit}) *</label>
                  <input 
                    type="number" 
                    value={checklistQuantity}
                    onChange={(e) => setChecklistQuantity(e.target.value)}
                    placeholder={`Required: ${selectedMaterial.needed}`}
                  />
                </div>
                
                {parseInt(checklistQuantity) >= selectedMaterial.needed && (
                     <div className={styles['form-group']}>
                       <label>Evidence Photo *</label>
                       <div 
                          className={styles['file-drop-area']}
                          style={{ 
                            border: `2px dashed ${isDragging ? '#2e8b57' : '#ccc'}`, 
                            padding: '20px', 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            backgroundColor: isDragging ? '#f0fff4' : 'transparent'
                          }}
                          onClick={() => document.getElementById('checklist-file')?.click()}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <input 
                            type="file" 
                            id="checklist-file" 
                            style={{ display: 'none' }} 
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                          {checklistFile ? (
                            <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                              <img 
                                src={checklistFile} 
                                alt="Evidence" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                              />
                            </div>
                          ) : (
                            <>
                              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                              <p>Drag & Drop or Click to Upload</p>
                            </>
                          )}
                        </div>
                     </div>
                )}

                {checklistError && <div style={{ color: 'red', marginTop: '10px' }}>{checklistError}</div>}
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={() => setShowChecklistModal(false)}>Cancel</button>
                <button 
                    className={`${styles['action-btn']} ${styles['check-btn']}`} 
                    onClick={handleChecklistSubmit}
                    disabled={isUploading}
                >
                    {isUploading ? 'Updating...' : 'Complete Item'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditProjectModal && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Edit Project Details</h3>
                <button className={styles['close-modal']} onClick={() => setShowEditProjectModal(false)}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label>Project Title *</label>
                  <input 
                    type="text" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)} 
                    placeholder="Enter project title" 
                  />
                </div>
                <div className={styles['form-group']}>
                  <label>Description *</label>
                  <textarea 
                    value={editDescription} 
                    onChange={(e) => setEditDescription(e.target.value)} 
                    placeholder="Describe your project..."
                    style={{ minHeight: '100px' }}
                  ></textarea>
                </div>
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={() => setShowEditProjectModal(false)}>Cancel</button>
                <button 
                  className={`${styles['action-btn']} ${styles['check-btn']}`}
                  onClick={handleUpdateProject}
                  disabled={!editTitle.trim() || !editDescription.trim()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
