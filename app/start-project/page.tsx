'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ref, push, set, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './start-project.module.css';
import { Step } from '../../components/RecycledIdeaPopup';

interface MaterialInput {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
};

function StartProjectContent() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const ideaId = searchParams.get('ideaId');
  
  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [materials, setMaterials] = useState<MaterialInput[]>([
    { id: '1', name: '', quantity: '', unit: '' }
  ]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (ideaId) {
        const ideaRef = ref(db, `projects/${ideaId}`);
        get(ideaRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setProjectName(data.title || '');
                setProjectDescription(data.description || '');
                
                if (data.materials) {
                    const mats = Array.isArray(data.materials) ? data.materials : Object.values(data.materials);
                    setMaterials(mats.map((m: { name: string; needed?: number; quantity?: string; unit?: string }) => ({
                        id: generateId(),
                        name: m.name,
                        quantity: m.needed?.toString() || m.quantity?.toString() || '1',
                        unit: m.unit || 'units'
                    })));
                }
                
                if (data.steps) {
                    const loadedSteps = Array.isArray(data.steps) ? data.steps : Object.values(data.steps);
                    // Clear images so user uploads their own, but keep other data
                    setSteps(loadedSteps.map((s: { id?: string; step_number: number; title: string; description: string }) => ({
                        id: s.id || generateId(),
                        step_number: s.step_number,
                        title: s.title,
                        description: s.description,
                        is_completed: false,
                        images: [] 
                    })));
                }
            }
        }).catch(err => console.error("Error fetching idea:", err));
    }
  }, [ideaId]);

  // Handlers
  const handleAddMaterial = () => {
    setMaterials((prevMaterials) => [
      ...prevMaterials,
      { id: generateId(), name: '', quantity: '', unit: '' }
    ]);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const handleMaterialChange = (id: string, field: 'name' | 'quantity' | 'unit', value: string) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create a project.');
      return;
    }

    // Basic validation
    if (!projectName.trim() || !projectDescription.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    const validMaterials = materials.filter(m => m.name.trim() && m.quantity.trim());
    if (validMaterials.length === 0) {
      alert('Please add at least one material.');
      return;
    }

    // Process materials to ensure they match the structure expected by Firebase
    const processedMaterials = validMaterials.map(m => ({
      id: m.id,
      name: m.name,
      needed: parseInt(m.quantity) || 0,
      unit: m.unit || 'units',
      acquired: 0,
      is_found: false,
      is_completed: false
    }));

    setIsSubmitting(true);

    try {
      const projectsRef = ref(db, 'projects');
      const newProjectRef = push(projectsRef);
      
      // Convert steps array to object/map to avoid array index keys in Firebase
      const stepsMap = steps.reduce((acc, step) => {
          // Ensure we use the step.id as the key
          acc[step.id] = step;
          return acc;
      }, {} as Record<string, Step>);

      const projectData = {
        id: newProjectRef.key,
        title: projectName,
        description: projectDescription,
        materials: processedMaterials,
        steps: stepsMap, // Save the pre-filled steps as a map
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: 'active',
        workflow_stage: 1
      };

      await set(newProjectRef, projectData);
      
      alert('Project created successfully!');
      router.push('/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <Header />

       <div className={styles.container}>
      <Sidebar />

      {/* Main Content */}
      <main className={styles['main-content']}>
        <div className={styles['back-button-container']}>
          <Link href="/projects" className={styles['back-button']}>
            <i className="fas fa-arrow-left"></i> Back to Projects
          </Link>
        </div>
        
        <h2 className={styles['page-header']}>Start a Recycling Project</h2>
        
        <form className={styles['project-form']} onSubmit={handleSubmit}>
          <div className={styles['form-group']}>
            <label htmlFor="project-name">Project Name:</label>
            <input 
              type="text" 
              id="project-name" 
              placeholder="Enter project name (e.g. Plastic Bottle Vase)" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required 
            />
          </div>
          
          <div className={styles['form-group']}>
            <label htmlFor="project-description">Description:</label>
            <textarea 
              id="project-description" 
              placeholder="Describe your project" 
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div className={styles['form-group']}>
            <label>Materials Needed</label>
            <div className={styles['materials-list']}>
              {materials.map((material) => (
                <div key={material.id} className={styles['material-item']}>
                  <input 
                    type="text" 
                    placeholder="Type of material"
                    value={material.name}
                    onChange={(e) => handleMaterialChange(material.id, 'name', e.target.value)}
                  />
                  <input 
                    type="number" 
                    placeholder="Quantity" 
                    min="1"
                    value={material.quantity}
                    onChange={(e) => handleMaterialChange(material.id, 'quantity', e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Unit (e.g. pcs, kg)" 
                    value={material.unit}
                    onChange={(e) => handleMaterialChange(material.id, 'unit', e.target.value)}
                  />
                  <button 
                    type="button" 
                    className={`${styles.btn} ${styles['remove-material']}`}
                    onClick={() => handleRemoveMaterial(material.id)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
            <button 
              type="button" 
              className={styles['add-material']} 
              onClick={handleAddMaterial}
            >
              <i className="fas fa-plus"></i> Add Another Material
            </button>
          </div>

          {/* Display Steps if available (Read-only for now as per "pre-filled" requirement) */}
          {steps.length > 0 && (
              <div className={styles['form-group']}>
                  <label>Construction Steps (Pre-filled)</label>
                  <div style={{marginTop: '10px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#f9f9f9'}}>
                      {steps.sort((a,b) => a.step_number - b.step_number).map((step, index) => (
                          <div key={index} style={{marginBottom: '10px', paddingBottom: '10px', borderBottom: index < steps.length - 1 ? '1px solid #eee' : 'none'}}>
                              <div style={{fontWeight: 'bold', marginBottom: '5px'}}>Step {step.step_number}: {step.title}</div>
                              <div style={{fontSize: '14px', color: '#555'}}>{step.description}</div>
                          </div>
                      ))}
                      <div style={{fontSize: '12px', color: '#888', fontStyle: 'italic', marginTop: '10px'}}>
                          * You can upload photos for these steps in the Construction stage.
                      </div>
                  </div>
              </div>
          )}
          
          <div className={styles['form-actions']}>
            <Link href="/projects" className={`${styles.btn} ${styles['btn-secondary']}`}>
              Cancel
            </Link>
            <button type="submit" className={`${styles.btn} ${styles['btn-primary']}`} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </main>
    </div>
    </ProtectedRoute>
  );
}

export default function StartProjectPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StartProjectContent />
        </Suspense>
    );
}
