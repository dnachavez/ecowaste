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
  authorId?: string;
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
            authorId: val.authorId,
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

  const handleSyncRecyclingCounts = async () => {
    if (!confirm('This will recalculate "Items Recycled" (Material Types) and "Projects Completed" (Count) for ALL users. Continue?')) return;

    setLoading(true);
    try {
      // 1. Fetch all projects
      const projectsRef = ref(db, 'projects');
      const snap = await import('firebase/database').then(m => m.get(projectsRef));
      const projectsData = snap.val() || {};

      // 2. Calculate totals per user
      const userRecyclingCounts: Record<string, number> = {};
      const userProjectCounts: Record<string, number> = {};

      Object.values(projectsData).forEach((proj: any) => {
        // Only count completed projects
        if (proj.status === 'completed' && proj.authorId) {
          // Recycling Count = Number of Material TYPES
          // Check if materials exist and is an array or object
          let projectTotal = 0;
          if (proj.materials) {
            const mats = Array.isArray(proj.materials) ? proj.materials : Object.values(proj.materials);
            projectTotal = mats.length; // Count types, not quantity
          }

          userRecyclingCounts[proj.authorId] = (userRecyclingCounts[proj.authorId] || 0) + projectTotal;

          // Projects Completed Count = 1 per project
          userProjectCounts[proj.authorId] = (userProjectCounts[proj.authorId] || 0) + 1;
        }
      });

      // 3. Update Users
      const usersRef = ref(db, 'users');
      const usersSnap = await import('firebase/database').then(m => m.get(usersRef));
      const usersData = usersSnap.val() || {};

      const updatePromises = Object.keys(usersData).map(async (userId) => {
        const correctRecyclingCount = userRecyclingCounts[userId] || 0;
        const correctProjectCount = userProjectCounts[userId] || 0;

        const currentRecyclingCount = usersData[userId].recyclingCount;
        const currentProjectsCompleted = usersData[userId].projectsCompleted;

        let updates: any = {};
        let needsUpdate = false;

        // Sync Recycling Count
        if (currentRecyclingCount !== correctRecyclingCount) {
          updates.recyclingCount = correctRecyclingCount;
          needsUpdate = true;
        }

        // Sync Projects Completed
        if (currentProjectsCompleted !== correctProjectCount) {
          updates.projectsCompleted = correctProjectCount;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await update(ref(db, `users/${userId}`), updates);
          return 1;
        }
        return 0;
      });

      const results = await Promise.all(updatePromises);
      const updatedCount = results.reduce((a: number, b) => a + b, 0);

      alert(`Sync Complete! Updated stats (Recycling & Projects) for ${updatedCount} users.`);

    } catch (error) {
      console.error("Error syncing recycling counts:", error);
      alert("Failed to sync recycling counts.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminRoute>
      <Header />

      <div className={styles.container}>
        <AdminSidebar />
        <main className={styles.mainContent}>
          <div className={styles.headerActions} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 className={styles.title} style={{ margin: 0 }}>Manage Projects</h1>
            <button
              onClick={handleSyncRecyclingCounts}
              className={styles.saveBtn}
              style={{ backgroundColor: '#2196F3', marginLeft: '15px' }}
            >
              <i className="fas fa-recycle" style={{ marginRight: '8px' }}></i>
              Sync Recycling Counts
            </button>
          </div>

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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No projects found</td>
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
                      onChange={e => setCurrentProject({ ...currentProject, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={currentProject.description}
                      onChange={e => setCurrentProject({ ...currentProject, description: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      value={currentProject.status}
                      onChange={e => setCurrentProject({ ...currentProject, status: e.target.value })}
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
                      onChange={e => setCurrentProject({ ...currentProject, visibility: e.target.value })}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div className={styles.headerActions}>
                    <button onClick={handleSyncRecyclingCounts} className={styles.syncBtn} disabled={loading}>
                      {loading ? 'Syncing...' : 'Sync Project Stats'}
                    </button>
                    <button onClick={() => setShowCreateModal(true)} className={styles.createBtn}>
                      <i className="fas fa-plus"></i> Create Project
                    </button>
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
