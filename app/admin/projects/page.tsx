'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../../components/Header';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminRoute from '../../../components/AdminRoute';
import styles from './projects.module.css';
import { db } from '../../../lib/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';

interface Project {
  id: string;
  title: string;
  authorName: string;
  status: string;
  visibility: string;
  createdAt: string;
  description?: string;
}

export default function ProjectsManagement() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!user) return;

    const projectsRef = ref(db, 'projects');
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const projectsList = Object.entries(data).map(([key, value]) => {
            const val = value as Record<string, string | undefined>;
            return {
                id: key,
                title: val.title || 'Untitled',
                authorName: val.authorName || 'Anonymous',
                status: val.status || 'In Progress',
                visibility: val.visibility || 'private',
                createdAt: val.created_at || val.createdAt || 'N/A', // Handle inconsistent naming
                description: val.description || ''
            };
        });
        setProjects(projectsList);
      } else {
        setProjects([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await remove(ref(db, `projects/${projectId}`));
        alert('Project deleted successfully');
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  const handleEditClick = (project: Project) => {
    setCurrentProject(project);
    setIsEditModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    try {
      const projectRef = ref(db, `projects/${currentProject.id}`);
      await update(projectRef, {
        title: currentProject.title,
        status: currentProject.status,
        visibility: currentProject.visibility,
        description: currentProject.description
      });
      setIsEditModalOpen(false);
      alert('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    }
  };

  const getStatusClass = (status: string) => {
      const s = status.toLowerCase();
      if (s === 'completed') return styles.statusCompleted;
      if (s === 'in progress') return styles.statusInProgress;
      return styles.statusOther;
  };

  return (
    <AdminRoute>
      <div className={styles.container}>
        <Header />
        <AdminSidebar />
        <main className={styles.mainContent}>
          <h1 className={styles.title}>Manage Projects</h1>
          
          {loading ? (
            <p>Loading projects...</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Visibility</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id}>
                      <td>{project.title}</td>
                      <td>{project.authorName}</td>
                      <td>
                          <span className={`${styles.statusBadge} ${getStatusClass(project.status)}`}>
                            {project.status}
                          </span>
                      </td>
                      <td>{project.visibility}</td>
                      <td>{project.createdAt}</td>
                      <td>
                        <button 
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleEditClick(project)}
                          title="Edit Project"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete Project"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>No projects found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {isEditModalOpen && currentProject && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Edit Project</h2>
                <form onSubmit={handleSaveProject}>
                  <div className={styles.formGroup}>
                    <label>Title</label>
                    <input 
                      type="text" 
                      value={currentProject.title} 
                      onChange={e => setCurrentProject({...currentProject, title: e.target.value})}
                      required 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea 
                      value={currentProject.description} 
                      onChange={e => setCurrentProject({...currentProject, description: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select 
                      value={currentProject.status} 
                      onChange={e => setCurrentProject({...currentProject, status: e.target.value})}
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Visibility</label>
                    <select 
                      value={currentProject.visibility} 
                      onChange={e => setCurrentProject({...currentProject, visibility: e.target.value})}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                    <button type="submit" className={styles.saveBtn}>Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </AdminRoute>
  );
}
