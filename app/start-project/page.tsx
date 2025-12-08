'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ref, push, set } from 'firebase/database';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './start-project.module.css';

interface MaterialInput {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
};

export default function StartProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [materials, setMaterials] = useState<MaterialInput[]>([
    { id: '1', name: '', quantity: '', unit: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      
      const projectData = {
        id: newProjectRef.key,
        title: projectName,
        description: projectDescription,
        materials: processedMaterials,
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
    <div className={styles.container}>
      <Header />
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
