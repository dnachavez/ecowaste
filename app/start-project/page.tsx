'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './start-project.module.css';

interface MaterialInput {
  id: string;
  name: string;
  quantity: string;
}

export default function StartProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // UI State
  const [userProfileActive, setUserProfileActive] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [materials, setMaterials] = useState<MaterialInput[]>([
    { id: '1', name: '', quantity: '' }
  ]);

  // Handlers
  const handleAddMaterial = () => {
    setMaterials([
      ...materials,
      { id: Date.now().toString(), name: '', quantity: '' }
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
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: '24px' }}>EcoWaste</h1>
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
  );
}
