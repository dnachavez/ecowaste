'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './start-project.module.css';

interface MaterialInput {
  id: string;
  name: string;
  quantity: string;
}

const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
};

export default function StartProjectPage() {
  const router = useRouter();
  
  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [materials, setMaterials] = useState<MaterialInput[]>([
    { id: '1', name: '', quantity: '' }
  ]);

  // Handlers
  const handleAddMaterial = () => {
    setMaterials((prevMaterials) => [
      ...prevMaterials,
      { id: generateId(), name: '', quantity: '' }
    ]);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const handleMaterialChange = (id: string, field: 'name' | 'quantity', value: string) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

    // In a real app, we would send this data to the backend/API
    console.log('Creating project:', {
      projectName,
      projectDescription,
      materials: validMaterials
    });

    // For now, just redirect back to projects page
    // We could pass query params or use context to show the new project, 
    // but without a real backend or global state store, it won't persist easily.
    // The previous projects page used local state which resets on navigation.
    
    alert('Project created successfully!');
    router.push('/projects');
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
            <button type="submit" className={`${styles.btn} ${styles['btn-primary']}`}>
              Create Project
            </button>
          </div>
        </form>
      </main>
    </div>
    </ProtectedRoute>
  );
}
