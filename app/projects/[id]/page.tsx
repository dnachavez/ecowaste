'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ref, onValue, update, remove, push, set, get, query, orderByChild, equalTo } from 'firebase/database';
// import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { db } from '../../../lib/firebase';
import { awardXP, incrementAction } from '../../../lib/gamification';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import Toast from '../../../components/Toast';
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
  evidence_image?: string | null;
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
  // created date can come from different fields/types depending on how the project was created
  created_at?: string | number;
  createdAt?: string | number;
  completed_at?: string | number;
  status: 'collecting' | 'in-progress' | 'completed';
  materials: Material[];
  steps: Step[];
  workflow_stage: 1 | 2 | 3; // 1: Preparation, 2: Construction, 3: Share
  final_images?: string[];
  visibility?: 'private' | 'public';
}

// Mock Data removed


export default function ProjectDetailsPage() {
  const params = useParams();
  const { user } = useAuth();
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

  // Add Step State
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');

  // Edit Step State
  const [showEditStepModal, setShowEditStepModal] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepDescription, setEditStepDescription] = useState('');

  // Edit Privacy State
  const [showEditPrivacyModal, setShowEditPrivacyModal] = useState(false);
  const [editPrivacyOption, setEditPrivacyOption] = useState<'private' | 'public' | null>(null);

  // Add Images State
  const [showAddImagesModal, setShowAddImagesModal] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [stepImages, setStepImages] = useState<string[]>([]);

  // Share Stage State
  const [finalImages, setFinalImages] = useState<string[]>([]);
  const [shareOption, setShareOption] = useState<'private' | 'community' | null>(null);

  const [checklistQuantity, setChecklistQuantity] = useState<string>('');
  const [checklistError, setChecklistError] = useState<string>('');
  const [checklistFile, setChecklistFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contributors, setContributors] = useState<string[]>([]);

  // Material Auto-Completion Check
  useEffect(() => {
    if (!project || !project.materials) return;

    let updatesFound = false;
    const updates: Record<string, any> = {};

    project.materials.forEach(material => {
      if (!material.is_completed && material.acquired >= material.needed) {
        updates[`/materials/${material.id}/is_completed`] = true;
        updatesFound = true;
      }
    });

    if (updatesFound) {
      update(ref(db, `projects/${project.id}`), updates).catch(err => console.error("Error auto-completing materials:", err));
    }
  }, [project]);

  // Fetch contributors when project is loaded and completed
  useEffect(() => {
    if (project && project.status === 'completed') {
      const fetchContributors = async () => {
        const requestsRef = ref(db, 'requests');
        try {
          const snapshot = await get(requestsRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            const contributorsSet = new Set<string>();
            Object.values(data).forEach((req: any) => {
              if (req.projectId === project.id && req.status === 'approved' && req.ownerName) {
                contributorsSet.add(req.ownerName);
              }
            });
            setContributors(Array.from(contributorsSet));
          }
        } catch (error) {
          console.error("Error fetching contributors:", error);
        }
      };
      fetchContributors();
    }
  }, [project]);
  const [isDragging, setIsDragging] = useState(false);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Upload photo for completed material
  const [showUploadPhotoModal, setShowUploadPhotoModal] = useState(false);
  const [uploadPhotoMaterialId, setUploadPhotoMaterialId] = useState<string | null>(null);
  const [uploadPhotoFile, setUploadPhotoFile] = useState<string | null>(null);
  const [uploadPhotoError, setUploadPhotoError] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // clear existing timer
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ show: true, message, type });
    // Hide after 3.5s
    toastTimer.current = window.setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  // Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [textError, setTextError] = useState(false);


  // Add Material Modal state
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialQuantity, setNewMaterialQuantity] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('');

  const handleOpenAddMaterialModal = () => {
    setNewMaterialName('');
    setNewMaterialQuantity('');
    setNewMaterialUnit('');
    setShowAddMaterialModal(true);
  };

  const handleCloseAddMaterialModal = () => {
    setNewMaterialName('');
    setNewMaterialQuantity('');
    setNewMaterialUnit('');
    setShowAddMaterialModal(false);
  };

  useEffect(() => {
    if (params.id) {
      const projectRef = ref(db, `projects/${params.id}`);
      const unsubscribe = onValue(projectRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Transform materials object to array if needed
          const materialsList = data.materials ? Object.entries(data.materials).map(([key, value]) => {
            const mat = value as { needed?: number; quantity?: string; unit?: string;[key: string]: unknown };
            return {
              ...mat,
              id: key, // Use Firebase key as the ID to ensure uniqueness and correct update path
              needed: mat.needed !== undefined ? mat.needed : (parseInt(mat.quantity || '0') || 0),
              unit: mat.unit || 'units'
            };
          }) : [];

          const stepsList = data.steps ? Object.entries(data.steps as Record<string, Omit<Step, 'id'>>).map(([key, value]) => ({
            ...value,
            id: key
          })) : [];

          setProject({
            ...data,
            id: params.id as string,
            materials: materialsList,
            steps: stepsList
          });

          // Sync active tab with workflow stage
          const stage = data.workflow_stage || 1;
          if (stage === 1) setActiveTab('preparation');
          else if (stage === 2) setActiveTab('construction');
          else if (stage === 3) setActiveTab('share');

          // Sync share stage state
          if (data.final_images) {
            setFinalImages(data.final_images);
          }
          if (data.visibility) {
            setShareOption(data.visibility === 'public' ? 'community' : 'private');
          }

          // Backfill completedAt if project is completed but missing the timestamp
          if (data.status === 'completed' && !data.completedAt && !data.completed_at && params.id) {
            const projectRef = ref(db, `projects/${params.id}`);
            update(projectRef, { completedAt: Date.now() }).catch(err => console.error('Failed to backfill completedAt:', err));
          }
        }
      });
      return () => unsubscribe();
    }
  }, [params.id]);

  if (!project) {
    return <div>Loading...</div>;
  }

  const Lightbox = ({ imageSrc, onClose }: { imageSrc: string | null; onClose: () => void }) => {
    if (!imageSrc) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
        onClick={onClose}
      >
        <div
          style={{
            position: 'relative',
            // tighter preview so it doesn't overwhelm the screen
            maxWidth: '55vw',
            maxHeight: '65vh',
            padding: '8px',
            borderRadius: '6px',
            background: '#fff',
            boxShadow: '0 6px 20px rgba(0,0,0,0.45)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageSrc}
            alt="Full view"
            style={{
              // force the image to fit the preview box
              width: '100%',
              maxHeight: 'calc(65vh - 24px)',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  };

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

  // Consider a material completed only if it's marked completed and has an evidence image
  const isAllMaterialsCompleted = project?.materials.length > 0 && project?.materials.every(m => (m.is_completed && (!!(m as any).evidence_image)));

  const handleProceed = async () => {
    if (!project || !isAllMaterialsCompleted) return;

    const confirmed = window.confirm(
      'Proceeding to the Construction stage is irreversible. You will not be able to return to the Preparation stage. Do you want to continue?'
    );

    if (!confirmed) return;

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

  const isAllStepsHaveImages = project?.steps.length > 0 && project?.steps.every(s => s.images && s.images.length > 0);

  const handleProceedToShare = async () => {
    if (!project || project.steps.length === 0 || !isAllStepsHaveImages) return;

    const confirmed = window.confirm(
      'Proceeding to the Share stage is irreversible. You will not be able to return to the Construction stage. Do you want to continue?'
    );

    if (!confirmed) return;

    try {
      const projectRef = ref(db, `projects/${project.id}`);
      await update(projectRef, {
        workflow_stage: 3
      });
      setActiveTab('share');
    } catch (error) {
      console.error('Error proceeding to next stage:', error);
    }
  };

  const handleChecklistClick = (material: Material) => {
    if (project && project.workflow_stage > 1) return;
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
    if (project.workflow_stage > 1) {
      setChecklistError('Project is in construction stage. Cannot update materials.');
      return;
    }

    const qty = parseInt(checklistQuantity || '0');
    if (isNaN(qty) || qty < 0) {
      setChecklistError('Please enter a valid quantity (0 or more).');
      return;
    }

    const currentAcquired = selectedMaterial.acquired || 0;
    const needed = selectedMaterial.needed || 0;
    const remaining = Math.max(0, needed - currentAcquired);

    // qty represents amount to add; ensure it doesn't exceed remaining
    const add = Math.min(qty, remaining);
    const newAcquired = Math.min(needed, currentAcquired + add);

    const requiresPhoto = newAcquired >= needed;
    if (requiresPhoto && !checklistFile) {
      setChecklistError('Please upload an evidence photo.');
      return;
    }

    setIsUploading(true);
    try {
      // Update material in DB
      const materialRef = ref(db, `projects/${project.id}/materials/${selectedMaterial.id}`);

      const updates: any = {
        acquired: newAcquired,
        // mark completed only if user has all required amount
        is_completed: newAcquired >= needed
      };

      if (checklistFile) updates.evidence_image = checklistFile;

      await update(materialRef, updates);

      // close modal and reset
      setShowChecklistModal(false);
      setChecklistQuantity('');
      setChecklistFile(null);
      setChecklistError('');
      showToast('Material updated', 'success');
    } catch (error) {
      console.error('Error updating material:', error);
      setChecklistError('Failed to update material. Please try again.');
      showToast('Failed to update material', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseChecklistModal = () => {
    setShowChecklistModal(false);
    setChecklistQuantity('');
    setChecklistFile(null);
    setChecklistError('');
  };

  const handleHaveAll = () => {
    if (!selectedMaterial) return;
    const remaining = Math.max(0, (selectedMaterial.needed || 0) - (selectedMaterial.acquired || 0));
    setChecklistQuantity(remaining.toString());
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!project || project.workflow_stage > 1) return;

    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        const materialRef = ref(db, `projects/${project.id}/materials/${materialId}`);
        await remove(materialRef);
        showToast('Material deleted', 'success');
      } catch (error) {
        console.error('Error deleting material:', error);
        showToast('Failed to delete material', 'error');
      }
    }
  };

  const handleDeleteEvidence = async (materialId: string) => {
    if (!project || project.workflow_stage > 1) return;
    if (!window.confirm('Remove the evidence photo? You will need to upload a replacement.')) return;
    try {
      const materialRef = ref(db, `projects/${project.id}/materials/${materialId}`);
      // Determine whether material should remain completed based on acquired vs needed
      const mat = project.materials.find(m => m.id === materialId);
      const shouldRemainCompleted = !!mat && ((mat.acquired || 0) >= (mat.needed || 0));
      await update(materialRef, {
        evidence_image: null,
        is_completed: shouldRemainCompleted
      });
      showToast('Evidence photo removed', 'success');
    } catch (error) {
      console.error('Error removing evidence photo:', error);
      showToast('Failed to remove evidence photo', 'error');
    }
  };

  const handleOpenUploadPhotoModal = (materialId: string) => {
    if (project && project.workflow_stage > 1) return;
    setUploadPhotoMaterialId(materialId);
    setUploadPhotoFile(null);
    setUploadPhotoError('');
    setShowUploadPhotoModal(true);
  };

  const handleCloseUploadPhotoModal = () => {
    setShowUploadPhotoModal(false);
    setUploadPhotoMaterialId(null);
    setUploadPhotoFile(null);
    setUploadPhotoError('');
  };

  const processUploadPhotoFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPhotoFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadPhotoFile(e.target.files[0]);
    }
  };

  const handleUploadPhotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadPhotoFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadPhotoSubmit = async () => {
    if (!uploadPhotoMaterialId || !project || !uploadPhotoFile) return;
    if (project.workflow_stage > 1) {
      setUploadPhotoError('Project is in construction stage. Cannot update materials.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const materialRef = ref(db, `projects/${project.id}/materials/${uploadPhotoMaterialId}`);
      await update(materialRef, {
        evidence_image: uploadPhotoFile
      });
      setShowUploadPhotoModal(false);
      setUploadPhotoMaterialId(null);
      setUploadPhotoFile(null);
      setUploadPhotoError('');
      showToast('Evidence photo updated', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadPhotoError('Failed to upload photo. Please try again.');
      showToast('Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleConfirmAddMaterial = async () => {
    if (!project) return;
    const name = newMaterialName.trim();
    const qty = parseInt(newMaterialQuantity || '0');
    const unit = newMaterialUnit.trim();

    if (!name) {
      alert('Please enter a material name.');
      return;
    }
    if (!unit) {
      alert('Please enter a unit (e.g. pcs, kg).');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity (>= 1).');
      return;
    }

    try {
      const materialsRef = ref(db, `projects/${project.id}/materials`);
      const newMatRef = push(materialsRef);
      await set(newMatRef, {
        name,
        needed: qty,
        unit,
        acquired: 0,
        is_found: false,
        is_completed: false
      });

      // reset modal inputs and close
      setNewMaterialName('');
      setNewMaterialQuantity('');
      setNewMaterialUnit('');
      setShowAddMaterialModal(false);
      showToast('Material added', 'success');
    } catch (error) {
      console.error('Error adding material:', error);
      showToast('Failed to add material', 'error');
      alert('Failed to add material. Please try again.');
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

  const handleAddStep = async () => {
    if (!project || !newStepTitle.trim() || !newStepDescription.trim()) return;

    try {
      const stepsRef = ref(db, `projects/${project.id}/steps`);
      const newStepRef = push(stepsRef);
      await set(newStepRef, {
        step_number: project.steps.length + 1,
        title: newStepTitle,
        description: newStepDescription,
        is_completed: false
      });

      setNewStepTitle('');
      setNewStepDescription('');
      setShowAddStepModal(false);
    } catch (error) {
      console.error('Error adding step:', error);
      alert('Failed to add step. Please try again.');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!project || project.workflow_stage > 2) return;

    if (window.confirm('Are you sure you want to delete this step?')) {
      try {
        // Get the step being deleted to know its step_number
        const deletedStep = project.steps.find(s => s.id === stepId);
        if (!deletedStep) return;

        const deletedStepNumber = deletedStep.step_number || 0;

        // Delete the step
        const stepRef = ref(db, `projects/${project.id}/steps/${stepId}`);
        await remove(stepRef);

        // Renumber all steps that come after the deleted one
        const stepsToRenumber = project.steps.filter(s => (s.step_number || 0) > deletedStepNumber);
        for (const step of stepsToRenumber) {
          const stepRefToUpdate = ref(db, `projects/${project.id}/steps/${step.id}`);
          await update(stepRefToUpdate, {
            step_number: (step.step_number || 0) - 1
          });
        }

        showToast('Step deleted and subsequent steps renumbered', 'success');
      } catch (error) {
        console.error('Error deleting step:', error);
        showToast('Failed to delete step', 'error');
      }
    }
  };

  const handleOpenEditStepModal = (step: Step) => {
    if (project && project.workflow_stage > 2) return;
    setEditingStepId(step.id);
    setEditStepTitle(step.title);
    setEditStepDescription(step.description);
    setShowEditStepModal(true);
  };

  const handleCloseEditStepModal = () => {
    setShowEditStepModal(false);
    setEditingStepId(null);
    setEditStepTitle('');
    setEditStepDescription('');
  };

  const handleUpdateStep = async () => {
    if (!project || !editingStepId || !editStepTitle.trim() || !editStepDescription.trim()) return;

    try {
      const stepRef = ref(db, `projects/${project.id}/steps/${editingStepId}`);
      await update(stepRef, {
        title: editStepTitle,
        description: editStepDescription
      });
      handleCloseEditStepModal();
      showToast('Step updated', 'success');
    } catch (error) {
      console.error('Error updating step:', error);
      showToast('Failed to update step', 'error');
    }
  };

  const handleAddImagesClick = (stepId: string) => {
    if (project && project.workflow_stage > 2) return;
    setCurrentStepId(stepId);
    setStepImages([]);
    setShowAddImagesModal(true);
  };

  const handleStepImagesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processStepImages(e.target.files);
    }
  };

  const processStepImages = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStepImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStepImagesDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      processStepImages(e.dataTransfer.files);
    }
  };

  const handleRemoveStepImage = (index: number) => {
    setStepImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveStepImages = async () => {
    if (!project || !currentStepId || project.workflow_stage > 2) return;

    try {
      const stepRef = ref(db, `projects/${project.id}/steps/${currentStepId}`);
      // Get current step images first if we want to append
      const currentStep = project.steps.find(s => s.id === currentStepId);
      const existingImages = currentStep?.images || [];
      const updatedImages = [...existingImages, ...stepImages];

      await update(stepRef, {
        images: updatedImages
      });

      // Update local state immediately to reflect changes without waiting for onValue
      // although onValue is fast, this gives immediate feedback if there's any lag
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          steps: prev.steps.map(s => s.id === currentStepId ? { ...s, images: updatedImages } : s)
        };
      });

      setShowAddImagesModal(false);
      setStepImages([]);
      setCurrentStepId(null);
    } catch (error) {
      console.error('Error saving step images:', error);
      alert('Failed to save images. Please try again.');
    }
  };

  const handleDeleteStepImage = async (stepId: string, imageIndex: number) => {
    if (!project || project.workflow_stage > 2) return;

    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        const currentStep = project.steps.find(s => s.id === stepId);
        if (!currentStep || !currentStep.images) return;

        const updatedImages = currentStep.images.filter((_, idx) => idx !== imageIndex);

        const stepRef = ref(db, `projects/${project.id}/steps/${stepId}`);
        await update(stepRef, {
          images: updatedImages
        });

        // Optimistic update
        setProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? { ...s, images: updatedImages } : s)
          };
        });
      } catch (error) {
        console.error('Error deleting step image:', error);
        alert('Failed to delete image.');
      }
    }
  };

  // Share Stage Handlers
  const handleFinalImagesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFinalImages(e.target.files);
    }
  };

  const processFinalImages = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFinalImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFinalImagesDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      processFinalImages(e.dataTransfer.files);
    }
  };

  const handleRemoveFinalImage = (index: number) => {
    setFinalImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleShareProject = async () => {
    if (!project || !shareOption) return;

    if (shareOption === 'community' && finalImages.length === 0) {
      alert('Please upload at least one final project image to share with the community.');
      return;
    }

    try {
      const projectRef = ref(db, `projects/${project.id}`);
      await update(projectRef, {
        status: 'completed',
        visibility: shareOption === 'community' ? 'public' : 'private',
        final_images: finalImages,
        // store both ISO string and epoch millis for compatibility with existing records
        completed_at: new Date().toISOString(),
        completedAt: Date.now()
      });

      if (user) {
        // Award XP for completing a project
        await awardXP(user.uid, 50); // 50 XP for project completion
        // Increment project count stat
        await incrementAction(user.uid, 'project', 1);

        // Also increment recycling count based on materials used
        // Calculate total quantity of materials in the project
        let totalRecycledItems = 0;
        const materialsList = project.materials ? (Array.isArray(project.materials) ? project.materials : Object.values(project.materials)) : [];

        if (materialsList.length > 0) {
          totalRecycledItems = materialsList.reduce((acc: number, mat: any) => {
            // Use acquired (actual amount) or needed (target amount)
            // Fallback to 0 if neither exists
            const qty = mat.acquired || mat.needed || 0;
            return acc + (typeof qty === 'number' ? qty : parseInt(qty) || 0);
          }, 0);
        }

        if (totalRecycledItems > 0) {
          await incrementAction(user.uid, 'recycle', totalRecycledItems);
        }
      }

      showToast(`Project successfully ${shareOption === 'community' ? 'shared to community' : 'marked as private'}!`, 'success');
      // Optionally redirect or update UI state
    } catch (error) {
      console.error('Error sharing project:', error);
      showToast('Failed to update project status. Please try again.', 'error');
    }
  };

  const handleOpenEditPrivacyModal = () => {
    const currentPrivacy = project?.visibility === 'public' ? 'public' : 'private';
    setEditPrivacyOption(currentPrivacy);
    setShowEditPrivacyModal(true);
  };

  const handleCloseEditPrivacyModal = () => {
    setShowEditPrivacyModal(false);
    setEditPrivacyOption(null);
  };

  const handleUpdateProjectPrivacy = async () => {
    if (!project || !editPrivacyOption) return;

    try {
      const projectRef = ref(db, `projects/${project.id}`);
      await update(projectRef, {
        visibility: editPrivacyOption === 'public' ? 'public' : 'private'
      });
      handleCloseEditPrivacyModal();
      showToast(`Project is now ${editPrivacyOption === 'public' ? 'shared to community' : 'private'}`, 'success');
    } catch (error) {
      console.error('Error updating privacy:', error);
      showToast('Failed to update privacy settings', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    const confirmed = window.confirm('Are you sure you want to delete this entire project? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const projectRef = ref(db, `projects/${project.id}`);
      await remove(projectRef);
      showToast('Project deleted successfully', 'success');
      // Redirect back to projects page
      window.location.href = '/projects';
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Failed to delete project', 'error');
    }
  };

  const formatDate = (value?: any) => {
    if (!value) return 'N/A';
    // handle numeric timestamps
    if (typeof value === 'number') return new Date(value).toLocaleDateString();
    // handle ISO or string timestamps
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
    return String(value);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let valid = true;
    if (rating === 0) {
      setRatingError(true);
      valid = false;
    } else {
      setRatingError(false);
    }

    if (feedbackText.trim() === '') {
      setTextError(true);
      valid = false;
    } else {
      setTextError(false);
    }

    if (!valid) return;

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);

      // Reset and close after 3 seconds
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setSubmitSuccess(false);
        setRating(0);
        setFeedbackText('');
      }, 3000);
    }, 1500);
  };


  return (
    <ProtectedRoute>
      <Header />

      <div className={styles.container}>
        <Sidebar />

        <main className={styles['main-content']}>
          {/* Back Link */}
          <Link href="/projects" className={styles['back-link']}>
            <i className="fas fa-arrow-left"></i> Back to Projects
          </Link>

          {/* Project Header */}
          <section className={styles['project-header']}>
            <div className={styles['project-actions']}>
              <button className={styles['edit-btn']} onClick={handleEditProjectClick} title="Edit project details">
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
              <i className="far fa-calendar-alt"></i> Created: {formatDate((project as any).created_at || (project as any).createdAt)}
            </div>
          </section>

          {/* Workflow Section */}
          <section className={styles['workflow-section']}>
            <h2 className={styles['section-title']}>
              <i className="fas fa-tasks"></i> Project Workflow
            </h2>
            {/* 100% badge moved into the Share stage header for clearer context */}

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
                  disabled={project.workflow_stage !== 1}
                >
                  <span className={styles['tab-number']}>1</span>
                  Preparation
                </button>
                <button
                  className={`${styles['tab-button']} ${activeTab === 'construction' ? styles.active : ''}`}
                  onClick={() => handleTabChange('construction')}
                  disabled={project.workflow_stage !== 2}
                >
                  <span className={styles['tab-number']}>2</span>
                  Construction
                </button>
                <button
                  className={`${styles['tab-button']} ${activeTab === 'share' ? styles.active : ''}`}
                  onClick={() => handleTabChange('share')}
                  disabled={project.workflow_stage !== 3}
                >
                  <span className={styles['tab-number']}>3</span>
                  Share
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className={styles['tab-content-container']}>

              {/* Preparation Tab */}
              {activeTab === 'preparation' && project.status !== 'completed' && (
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
                              {material.evidence_image && (
                                <div style={{ marginTop: '10px', position: 'relative', width: '90px', height: '90px', cursor: 'pointer' }}>
                                  <img
                                    src={material.evidence_image}
                                    alt={`Evidence for ${material.name}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '2px solid #ddd', transition: 'transform 0.2s' }}
                                    onClick={() => setLightboxImage(material.evidence_image || null)}
                                    title="Click to view full size"
                                  />
                                  <button
                                    onClick={() => handleDeleteEvidence(material.id)}
                                    title="Delete evidence photo"
                                    style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      background: '#dc3545',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '50%',
                                      padding: '8px',
                                      cursor: 'pointer',
                                      width: '32px',
                                      height: '32px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '14px',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              )}
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
                              {material.is_completed ? (
                                // When completed, show upload photo and delete material buttons
                                <>
                                  <button
                                    className={`${styles['btn']} ${styles['small']} ${styles['primary']}`}
                                    onClick={() => handleOpenUploadPhotoModal(material.id)}
                                    disabled={project.workflow_stage > 1}
                                    style={{
                                      opacity: project.workflow_stage > 1 ? 0.5 : 1,
                                      cursor: project.workflow_stage > 1 ? 'not-allowed' : 'pointer'
                                    }}
                                    title="Replace or upload evidence photo"
                                  >
                                    <i className="fas fa-camera"></i> Upload Photo
                                  </button>
                                  <button
                                    className={`${styles['btn']} ${styles['small']} ${styles['danger']}`}
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    title="Delete material"
                                    disabled={project.workflow_stage > 1}
                                    style={{
                                      opacity: project.workflow_stage > 1 ? 0.5 : 1,
                                      cursor: project.workflow_stage > 1 ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className={`${styles['btn']} ${styles['checklist-btn']}`}
                                    onClick={() => handleChecklistClick(material)}
                                    disabled={project.workflow_stage > 1}
                                    title="Update amount"
                                    aria-label={`Update amount for ${material.name}`}
                                    style={{
                                      opacity: project.workflow_stage > 1 ? 0.5 : 1,
                                      cursor: project.workflow_stage > 1 ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <Link
                                    href={`/browse?search=${encodeURIComponent(material.name)}&projectId=${params.id}&materialId=${material.id}`}
                                    className={`${styles['btn']} ${styles['small']} ${styles['primary']}`}
                                    title="Find Donation"
                                    style={{ marginRight: '5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <i className="fas fa-search"></i>
                                  </Link>
                                  <button
                                    className={`${styles['btn']} ${styles['small']} ${styles['danger']}`}
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    title="Delete material"
                                    disabled={project.workflow_stage > 1}
                                    style={{
                                      opacity: project.workflow_stage > 1 ? 0.5 : 1,
                                      cursor: project.workflow_stage > 1 ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className={styles['stage-actions']}>
                        {project.workflow_stage === 1 && (
                          <>
                            <button className={`${styles['btn']} ${styles['primary']}`} onClick={handleOpenAddMaterialModal} title="Add a new material to request">
                              <i className="fas fa-plus"></i> Add Material
                            </button>
                            <button
                              className={`${styles['btn']} ${isAllMaterialsCompleted ? styles['primary'] : styles['secondary']}`}
                              onClick={handleProceed}
                              disabled={!isAllMaterialsCompleted}
                              title={isAllMaterialsCompleted ? 'Proceed to Construction' : 'Cannot proceed until all materials have evidence photos'}
                              style={{
                                opacity: isAllMaterialsCompleted ? 1 : 0.5,
                                cursor: isAllMaterialsCompleted ? 'pointer' : 'not-allowed',
                                marginLeft: '10px'
                              }}
                            >
                              Proceed
                            </button>
                          </>
                        )}
                        {project.workflow_stage > 1 && (
                          <div style={{ fontStyle: 'italic', color: '#666' }}>
                            Preparation stage completed and locked.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Construction Tab */}
              {activeTab === 'construction' && project.status !== 'completed' && (
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
                        {project.steps.sort((a, b) => (a.step_number || 0) - (b.step_number || 0)).map(step => (
                          <li key={step.id} className={styles['step-item']}>
                            <div className={styles['step-header-row']}>
                              <h4 className={styles['step-title-text']} style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%', margin: 0 }}>Step {step.step_number}: {step.title}</h4>
                              {(!step.images || step.images.length === 0) && (
                                <span className={styles['needs-images-badge']}>
                                  <i className="fas fa-exclamation-circle"></i> Needs images (0 uploaded)
                                </span>
                              )}
                            </div>

                            <div className={styles['step-content-row']}>
                              <div className={styles['step-description-box']} style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%', whiteSpace: 'normal' }}>
                                {step.description}
                              </div>
                              <div className={styles['step-actions-right']}>
                                <button
                                  className={`${styles['btn']} ${styles['small']} ${styles['primary']}`}
                                  onClick={() => handleOpenEditStepModal(step)}
                                  disabled={project.workflow_stage > 2}
                                  style={{
                                    opacity: project.workflow_stage > 2 ? 0.5 : 1,
                                    cursor: project.workflow_stage > 2 ? 'not-allowed' : 'pointer'
                                  }}
                                  title="Edit step"
                                >
                                  <i className="fas fa-edit"></i> Edit
                                </button>
                                <button
                                  className={`${styles['btn']} ${styles['add-images-btn']}`}
                                  onClick={() => handleAddImagesClick(step.id)}
                                  disabled={project.workflow_stage > 2}
                                  style={{
                                    opacity: project.workflow_stage > 2 ? 0.5 : 1,
                                    cursor: project.workflow_stage > 2 ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <i className="fas fa-camera"></i> Add Images
                                </button>
                                <button
                                  className={`${styles['btn']} ${styles['delete-step-btn']}`}
                                  onClick={() => handleDeleteStep(step.id)}
                                  disabled={project.workflow_stage > 2}
                                  style={{
                                    opacity: project.workflow_stage > 2 ? 0.5 : 1,
                                    cursor: project.workflow_stage > 2 ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>

                            <div className={styles['step-images-placeholder']}>
                              {step.images && step.images.length > 0 ? (
                                <div className={styles['step-images-grid']}>
                                  {step.images.map((img, idx) => (
                                    <div key={idx} className={styles['step-image-item']}>
                                      <img src={img} alt={`Step ${step.step_number} Image ${idx + 1}`} />
                                      <button
                                        className={styles['delete-step-image-btn']}
                                        onClick={() => handleDeleteStepImage(step.id, idx)}
                                        title="Remove image"
                                        disabled={project.workflow_stage > 2}
                                        style={{
                                          opacity: project.workflow_stage > 2 ? 0.5 : 1,
                                          cursor: project.workflow_stage > 2 ? 'not-allowed' : 'pointer'
                                        }}
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontStyle: 'italic', color: '#666' }}>No images for this step. Add at least one image.</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className={styles['stage-actions']}>
                        {project.workflow_stage === 2 && (
                          <>
                            <button className={`${styles['btn']} ${styles['primary']}`} onClick={() => setShowAddStepModal(true)} title="Add a construction step">
                              <i className="fas fa-plus"></i> Add Step
                            </button>
                            <button
                              className={`${styles['btn']} ${project.steps.length > 0 && isAllStepsHaveImages ? styles['primary'] : styles['secondary']}`}
                              onClick={handleProceedToShare}
                              disabled={project.steps.length === 0 || !isAllStepsHaveImages}
                              title={project.steps.length > 0 && isAllStepsHaveImages ? 'Proceed to Share' : 'Cannot proceed until all steps have images'}
                              style={{
                                opacity: project.steps.length > 0 && isAllStepsHaveImages ? 1 : 0.5,
                                cursor: project.steps.length > 0 && isAllStepsHaveImages ? 'pointer' : 'not-allowed',
                                marginLeft: '10px'
                              }}
                            >
                              Proceed
                            </button>

                            <div className={styles['validation-status']}>
                              <div className={styles['validation-item']}>
                                {project.steps.length > 0 ? (
                                  <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>
                                ) : (
                                  <i className="fas fa-times-circle" style={{ color: '#dc3545' }}></i>
                                )}
                                <span style={{ color: project.steps.length > 0 ? '#28a745' : '#dc3545' }}>
                                  At least one step added
                                </span>
                              </div>
                              <div className={styles['validation-item']}>
                                {isAllStepsHaveImages ? (
                                  <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>
                                ) : (
                                  <i className="fas fa-times-circle" style={{ color: '#dc3545' }}></i>
                                )}
                                <span style={{ color: isAllStepsHaveImages ? '#28a745' : '#dc3545' }}>
                                  All steps have images
                                </span>
                              </div>
                              {!isAllStepsHaveImages && project.steps.length > 0 && (
                                <div style={{ fontWeight: 'bold', color: '#dc3545' }}>
                                  {project.steps.filter(s => !s.images || s.images.length === 0).map(s => `Step ${s.step_number}: Needs images`).join(', ')}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        {project.workflow_stage > 2 && (
                          <div style={{ fontStyle: 'italic', color: '#666' }}>
                            Construction stage completed and locked.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Share Tab */}
              {activeTab === 'share' && (
                <div className={styles['tab-content']} style={{ display: 'block' }}>
                  <div className={`${styles['stage-card']} ${project.status === 'completed' ? styles.completed : styles.current}`}>
                    <div className={styles['stage-header']}>
                      {project.status !== 'completed' && (
                        <div className={styles['stage-marker']}>
                          <span className={styles['stage-number']}>3</span>
                        </div>
                      )}
                      {project.status === 'completed' ? (
                        // Centered completion header
                        <div style={{ textAlign: 'center', width: '100%' }}>
                          <div style={{ color: '#28a745', fontWeight: 700, fontSize: '2.2rem', marginTop: '10px' }}>
                            100% Completed ✓
                          </div>
                        </div>
                      ) : (
                        <div className={styles['stage-title-container']}>
                          <h3 className={styles['stage-title']}>Share</h3>
                          <p className={styles['stage-subtitle']}>Share your project with the community</p>
                        </div>
                      )}
                      {project.status !== 'completed' && (
                        <div className={styles['stage-status']}>
                          <span className={`${styles['status-badge']} ${styles.current}`}>CURRENT</span>
                        </div>
                      )}
                    </div>

                    {project.status === 'completed' ? (
                      // Completion View
                      <div className={styles['stage-content']} style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '30px' }}>
                          <h2 style={{ fontSize: '2rem', color: '#28a745', marginBottom: '10px' }}>
                            🎉 Great Work!
                          </h2>
                          <p style={{ fontSize: '1.2rem', color: '#333', marginBottom: '20px' }}>
                            You have completed your recycling project. Keep it up!
                          </p>
                        </div>

                        <div style={{
                          backgroundColor: '#f8f9fa',
                          padding: '20px',
                          borderRadius: '8px',
                          marginBottom: '30px',
                          display: 'inline-block',
                          minWidth: '300px'
                        }}>
                          <div style={{ marginBottom: '15px' }}>
                            <span style={{ color: '#666', marginRight: '10px' }}>Created:</span>
                            <span style={{ fontWeight: 'bold' }}>{formatDate((project as any).created_at || (project as any).createdAt)}</span>
                          </div>
                          <div>
                            <span style={{ color: '#666', marginRight: '10px' }}>Completed:</span>
                            <span style={{ fontWeight: 'bold' }}>
                              {formatDate((project as any).completed_at || (project as any).completedAt)}
                            </span>
                          </div>
                        </div>

                        {contributors.length > 0 && (
                          <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#555', marginBottom: '15px' }}>
                              <i className="fas fa-hand-holding-heart" style={{ marginRight: '8px', color: '#e91e63' }}></i>
                              Contributors
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                              {contributors.map((contributorName, index) => (
                                <div key={index} style={{
                                  backgroundColor: '#fff',
                                  border: '1px solid #eee',
                                  borderRadius: '20px',
                                  padding: '8px 16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: '#2e8b57',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    marginRight: '8px',
                                    fontWeight: 'bold'
                                  }}>
                                    {contributorName.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ color: '#333', fontWeight: 500 }}>{contributorName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={styles['stage-actions']} style={{ gap: '10px' }}>
                          <button
                            className={`${styles['btn']} ${styles['primary']}`}
                            onClick={handleOpenEditPrivacyModal}
                            title="Edit privacy settings"
                          >
                            <i className="fas fa-edit"></i> {project.visibility === 'public' ? 'Shared to Community' : 'Keep Private'}
                          </button>
                          <button
                            className={`${styles['btn']} ${styles['danger']}`}
                            onClick={handleDeleteProject}
                            title="Delete this project permanently"
                          >
                            <i className="fas fa-trash"></i> Delete Project
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Original Share Form
                      <>
                        <div className={styles['stage-content']}>
                          <div className={styles['form-group']}>
                            <label>Project Description</label>
                            <div className={styles['project-description-section']}>
                              {project.description}
                            </div>
                          </div>

                          <div className={styles['form-group']}>
                            <label>Final Project Image *</label>
                            <div
                              className={styles['final-image-upload-area']}
                              style={{
                                border: `2px dashed ${isDragging ? '#2e8b57' : '#007bff'}`,
                                backgroundColor: isDragging ? '#f0fff4' : '#f8f9fa'
                              }}
                              onClick={() => document.getElementById('final-images-file')?.click()}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleFinalImagesDrop}
                            >
                              <input
                                type="file"
                                id="final-images-file"
                                style={{ display: 'none' }}
                                accept="image/*"
                                multiple
                                onChange={handleFinalImagesFileChange}
                              />
                              <div className={styles['upload-icon']}><i className="fas fa-camera"></i></div>
                              <div className={styles['upload-text']}>Click to upload final project image</div>
                              <div className={styles['upload-hint']}>* Required for sharing to community</div>
                            </div>

                            {finalImages.length > 0 && (
                              <div className={styles['images-preview']}>
                                {finalImages.map((img, index) => (
                                  <div key={index} className={styles['image-preview']}>
                                    <img src={img} alt={`Final Preview ${index}`} />
                                    <button
                                      className={styles['remove-image-btn']}
                                      onClick={() => handleRemoveFinalImage(index)}
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className={styles['share-options']}>
                            <div
                              className={`${styles['share-option']} ${shareOption === 'private' ? styles.selected : ''}`}
                              onClick={() => setShareOption('private')}
                            >
                              <i className="fas fa-lock"></i>
                              <div className={styles['share-option-title']}>Keep Private</div>
                              <div className={styles['share-option-description']}>Only you can view this project</div>
                            </div>
                            <div
                              className={`${styles['share-option']} ${shareOption === 'community' ? styles.selected : ''}`}
                              onClick={() => setShareOption('community')}
                            >
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
                          <button
                            className={`${styles['btn']} ${shareOption === 'private' ? styles['primary'] : styles['secondary']}`}
                            onClick={handleShareProject}
                            disabled={shareOption !== 'private'}
                            style={{ display: shareOption === 'private' ? 'inline-block' : 'none' }}
                          >
                            Keep Private
                          </button>
                          <button
                            className={`${styles['btn']} ${shareOption === 'community' ? styles['primary'] : styles['secondary']}`}
                            onClick={handleShareProject}
                            disabled={shareOption !== 'community' || finalImages.length === 0}
                            style={{ display: shareOption === 'community' ? 'inline-block' : 'none' }}
                          >
                            Share to Community
                          </button>
                          {!shareOption && (
                            <div style={{ fontStyle: 'italic', color: '#666' }}>Please select a sharing option above.</div>
                          )}
                        </div>
                      </>
                    )}
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
                <button className={styles['close-modal']} onClick={handleCloseAddMaterialModal}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label>Material Name *</label>
                  <input type="text" placeholder="Enter material name" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} />
                </div>
                <div className={styles['form-group']}>
                  <label>Quantity *</label>
                  <input type="number" min="1" value={newMaterialQuantity} onChange={(e) => setNewMaterialQuantity(e.target.value)} />
                </div>
                <div className={styles['form-group']}>
                  <label>Unit *</label>
                  <input type="text" placeholder="e.g. pcs, kg" value={newMaterialUnit} onChange={(e) => setNewMaterialUnit(e.target.value)} />
                </div>
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={handleCloseAddMaterialModal}>Cancel</button>
                <button type="button" className={`${styles['action-btn']} ${styles['check-btn']}`} onClick={handleConfirmAddMaterial}>Add Material</button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
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
                  <input
                    type="text"
                    placeholder="Enter step title"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                  />
                </div>
                <div className={styles['form-group']}>
                  <label>Description *</label>
                  <textarea
                    placeholder="Describe what needs to be done..."
                    value={newStepDescription}
                    onChange={(e) => setNewStepDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={() => setShowAddStepModal(false)}>Cancel</button>
                <button
                  className={`${styles['action-btn']} ${styles['check-btn']}`}
                  onClick={handleAddStep}
                  disabled={!newStepTitle.trim() || !newStepDescription.trim()}
                >
                  Add Step
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checklist Modal */}
        {showChecklistModal && selectedMaterial && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Update Material: {selectedMaterial.name}</h3>
                <button className={styles['close-modal']} onClick={handleCloseChecklistModal}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div style={{ marginBottom: '10px', color: '#555' }}>Enter the amount of this material you currently have on hand. You may provide less than the required amount; use "Have All" to set the full required quantity.</div>
                <div className={styles['form-group']}>
                  <label>Quantity to Add ({selectedMaterial.unit})</label>
                  {
                    (() => {
                      const remaining = Math.max(0, (selectedMaterial.needed || 0) - (selectedMaterial.acquired || 0));
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="number"
                            value={checklistQuantity}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '') {
                                setChecklistQuantity('');
                                return;
                              }
                              let n = parseInt(v || '0');
                              if (isNaN(n) || n < 0) n = 0;
                              if (n > remaining) n = remaining;
                              setChecklistQuantity(n.toString());
                            }}
                            placeholder={`Remaining: ${remaining}`}
                            min={0}
                            max={remaining}
                            style={{ flex: '1' }}
                          />
                          <span style={{ color: '#666', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>Remaining: {remaining}</span>
                        </div>
                      );
                    })()
                  }
                </div>

                {((selectedMaterial.acquired || 0) + parseInt(checklistQuantity || '0')) >= (selectedMaterial.needed || 0) && (
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

                {((selectedMaterial.acquired || 0) + parseInt(checklistQuantity || '0')) >= (selectedMaterial.needed || 0) && !checklistFile && (
                  <div style={{ color: 'red', marginTop: '8px' }}>Please upload an evidence photo to complete this material.</div>
                )}
                {checklistError && <div style={{ color: 'red', marginTop: '10px' }}>{checklistError}</div>}
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={handleCloseChecklistModal}>Cancel</button>
                <button type="button" className={`${styles['action-btn']} ${styles['check-btn']}`} onClick={handleHaveAll}>Have All</button>
                <button
                  className={`${styles['action-btn']} ${styles['check-btn']}`}
                  onClick={handleChecklistSubmit}
                  disabled={isUploading || ((((selectedMaterial.acquired || 0) + parseInt(checklistQuantity || '0')) >= (selectedMaterial.needed || 0)) && !checklistFile)}
                >
                  {isUploading ? 'Updating...' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Photo Modal */}
        {showUploadPhotoModal && uploadPhotoMaterialId && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Upload Evidence Photo</h3>
                <button className={styles['close-modal']} onClick={handleCloseUploadPhotoModal}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label>Evidence Photo *</label>
                  <div
                    className={styles['file-drop-area']}
                    style={{
                      border: `2px dashed ${isDragging ? '#2e8b57' : '#ccc'}`,
                      padding: '30px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: isDragging ? '#f0fff4' : 'transparent',
                      borderRadius: '8px'
                    }}
                    onClick={() => document.getElementById('upload-photo-file')?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleUploadPhotoDrop}
                  >
                    <input
                      type="file"
                      id="upload-photo-file"
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleUploadPhotoFileChange}
                    />
                    {uploadPhotoFile ? (
                      <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                        <img
                          src={uploadPhotoFile}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: '32px', marginBottom: '15px', color: '#2e8b57' }}></i>
                        <p style={{ marginBottom: '10px' }}>Drag & Drop or Click to Upload</p>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Supported formats: JPG, PNG, GIF</p>
                      </>
                    )}
                  </div>
                </div>
                {uploadPhotoError && <div style={{ color: 'red', marginTop: '10px' }}>{uploadPhotoError}</div>}
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={handleCloseUploadPhotoModal}>Cancel</button>
                <button
                  className={`${styles['action-btn']} ${styles['check-btn']}`}
                  onClick={handleUploadPhotoSubmit}
                  disabled={isUploadingPhoto || !uploadPhotoFile}
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Upload'}
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

        {/* Edit Step Modal */}
        {showEditStepModal && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Edit Step</h3>
                <button className={styles['close-modal']} onClick={handleCloseEditStepModal}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label>Step Title *</label>
                  <input
                    type="text"
                    value={editStepTitle}
                    onChange={(e) => setEditStepTitle(e.target.value)}
                    placeholder="Enter step title"
                  />
                </div>
                <div className={styles['form-group']}>
                  <label>Description *</label>
                  <textarea
                    value={editStepDescription}
                    onChange={(e) => setEditStepDescription(e.target.value)}
                    placeholder="Describe this step..."
                    style={{ minHeight: '100px' }}
                  ></textarea>
                </div>
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={handleCloseEditStepModal}>Cancel</button>
                <button
                  className={`${styles['action-btn']} ${styles['check-btn']}`}
                  onClick={handleUpdateStep}
                  disabled={!editStepTitle.trim() || !editStepDescription.trim()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Images Modal */}
        {showAddImagesModal && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Add Images</h3>
                <button className={styles['close-modal']} onClick={() => setShowAddImagesModal(false)}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div
                  className={styles['file-drop-area']}
                  style={{
                    border: `2px dashed ${isDragging ? '#2e8b57' : '#ccc'}`,
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragging ? '#f0fff4' : 'transparent',
                    marginBottom: '20px'
                  }}
                  onClick={() => document.getElementById('step-images-file')?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleStepImagesDrop}
                >
                  <input
                    type="file"
                    id="step-images-file"
                    style={{ display: 'none' }}
                    accept="image/*"
                    multiple
                    onChange={handleStepImagesFileChange}
                  />
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                  <p>Drag & Drop or Click to Upload Multiple Images</p>
                </div>

                {stepImages.length > 0 && (
                  <div className={styles['images-preview']}>
                    {stepImages.map((img, index) => (
                      <div key={index} className={styles['image-preview']}>
                        <img src={img} alt={`Preview ${index}`} />
                        <button
                          className={styles['remove-image-btn']}
                          onClick={() => handleRemoveStepImage(index)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={() => setShowAddImagesModal(false)}>Cancel</button>
                <button
                  className={`${styles['action-btn']} ${styles['check-btn']}`}
                  onClick={handleSaveStepImages}
                  disabled={stepImages.length === 0}
                >
                  Upload & Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Privacy Modal */}
        {showEditPrivacyModal && (
          <div className={`${styles.modal} ${styles.active}`}>
            <div className={styles['modal-content']}>
              <div className={styles['modal-header']}>
                <h3 className={styles['modal-title']}>Edit Privacy Settings</h3>
                <button className={styles['close-modal']} onClick={handleCloseEditPrivacyModal}>×</button>
              </div>
              <div className={styles['modal-body']}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Project Visibility</label>
                  <div
                    onClick={() => setEditPrivacyOption('private')}
                    style={{
                      padding: '15px',
                      border: `2px ${editPrivacyOption === 'private' ? 'solid' : 'dashed'} #ccc`,
                      borderRadius: '6px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      backgroundColor: editPrivacyOption === 'private' ? '#f0fff4' : '#f8f9fa'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      <i className="fas fa-lock"></i> Keep Private
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>Only you can view this project</div>
                  </div>
                  <div
                    onClick={() => setEditPrivacyOption('public')}
                    style={{
                      padding: '15px',
                      border: `2px ${editPrivacyOption === 'public' ? 'solid' : 'dashed'} #ccc`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: editPrivacyOption === 'public' ? '#f0fff4' : '#f8f9fa'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      <i className="fas fa-share-alt"></i> Share to Community
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>Share with other EcoWaste users (Recycling Ideas)</div>
                  </div>
                </div>
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['action-btn']} onClick={handleCloseEditPrivacyModal}>Cancel</button>
                <button
                  className={`${styles['action-btn']} ${styles['check-btn']}`}
                  onClick={handleUpdateProjectPrivacy}
                  disabled={!editPrivacyOption}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        <Lightbox imageSrc={lightboxImage} onClose={() => setLightboxImage(null)} />

      </div>

      {/* Feedback Button */}
      <div className={styles.feedbackBtn} onClick={() => setIsFeedbackOpen(true)}>💬</div>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className={styles.feedbackModal} onClick={(e) => {
          if (e.target === e.currentTarget) setIsFeedbackOpen(false);
        }}>
          <div className={styles.feedbackContent}>
            <span className={styles.feedbackCloseBtn} onClick={() => setIsFeedbackOpen(false)}>×</span>

            {!submitSuccess ? (
              <div className={styles.feedbackForm}>
                <h3>Share Your Feedback</h3>
                <div className={styles.emojiRating}>
                  {[
                    { r: 1, e: '😞', l: 'Very Sad' },
                    { r: 2, e: '😕', l: 'Sad' },
                    { r: 3, e: '😐', l: 'Neutral' },
                    { r: 4, e: '🙂', l: 'Happy' },
                    { r: 5, e: '😍', l: 'Very Happy' }
                  ].map((option) => (
                    <div
                      key={option.r}
                      className={`${styles.emojiOption} ${rating === option.r ? styles.selected : ''}`}
                      onClick={() => {
                        setRating(option.r);
                        setRatingError(false);
                      }}
                    >
                      <span className={styles.emoji}>{option.e}</span>
                      <span className={styles.emojiLabel}>{option.l}</span>
                    </div>
                  ))}
                </div>
                {ratingError && <div className={styles.errorMessage} style={{ display: 'block' }}>Please select a rating</div>}

                <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                <textarea
                  placeholder="Your feedback helps us make EcoWaste better..."
                  value={feedbackText}
                  onChange={(e) => {
                    setFeedbackText(e.target.value);
                    setTextError(false);
                  }}
                ></textarea>
                {textError && <div className={styles.errorMessage} style={{ display: 'block' }}>Please provide your feedback</div>}

                <button
                  type="submit"
                  className={styles.feedbackSubmitBtn}
                  onClick={handleFeedbackSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      Submitting... <div className={styles.spinner}></div>
                    </>
                  ) : 'Submit Feedback'}
                </button>
              </div>
            ) : (
              <div className={styles.thankYouMessage} style={{ display: 'block' }}>
                <span className={styles.thankYouEmoji}>🎉</span>
                <h3>Thank You!</h3>
                <p>We appreciate your feedback and will use it to improve EcoWaste.</p>
                <p>Your opinion matters to us!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
