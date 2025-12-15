import React, { useState } from 'react';
import styles from './RecycledIdeaPopup.module.css';

export interface ProjectMaterial {
  id: string;
  name: string;
  needed: number;
  unit: string;
}

export interface Step {
  id: string;
  step_number: number;
  title: string;
  description: string;
  is_completed: boolean;
  images: string[];
}

export interface RecycledIdea {
  id: string;
  title: string;
  author: string;
  timeAgo: string;
  image: string;
  description: string;
  commentsCount: number;
  materials?: ProjectMaterial[];
  workflow_stage?: number;
  steps?: Step[];
  contributors?: string[];
}

interface RecycledIdeaPopupProps {
  idea: RecycledIdea;
  onClose: () => void;
  onConfirm: () => void;
}

const RecycledIdeaPopup: React.FC<RecycledIdeaPopupProps> = ({ idea, onClose, onConfirm }) => {
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [isStepsOpen, setIsStepsOpen] = useState(false);

  return (
    <div className={styles.popupContainer} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={styles.popupContent}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        <h2 className={styles.title}>Project Details</h2>
        <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#333' }}>{idea.title}</h3>

        <div className={styles.popupScrollArea}>
          {idea.image && (
            <div className={styles.imageContainer}>
              <img src={idea.image} alt={idea.title} className={styles.image} />
            </div>
          )}

          <div className={styles.description}>
            {idea.description}
          </div>

          {/* Materials Toggle */}
          <div className={styles.toggleSection}>
            <div
              className={styles.toggleHeader}
              onClick={() => setIsMaterialsOpen(!isMaterialsOpen)}
            >
              <span>Materials Used ({idea.materials?.length || 0})</span>
              <i className={`fas fa-chevron-${isMaterialsOpen ? 'up' : 'down'}`}></i>
            </div>

            {isMaterialsOpen && (
              <div className={styles.toggleContent}>
                {idea.materials && idea.materials.length > 0 ? (
                  <ul className={styles.materialsList}>
                    {idea.materials.map((material, index) => (
                      <li key={index} className={styles.materialItem}>
                        {material.name} - {material.needed} {material.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: '#999', fontStyle: 'italic', margin: 0 }}>No materials listed.</p>
                )}
              </div>
            )}
          </div>

          {/* Construction Steps Toggle */}
          <div className={styles.toggleSection}>
            <div
              className={styles.toggleHeader}
              onClick={() => setIsStepsOpen(!isStepsOpen)}
            >
              <span>Construction Steps ({idea.steps?.length || (idea.workflow_stage ? 1 : 0)})</span>
              <i className={`fas fa-chevron-${isStepsOpen ? 'up' : 'down'}`}></i>
            </div>

            {isStepsOpen && (
              <div className={styles.toggleContent}>
                {idea.steps && idea.steps.length > 0 ? (
                  <div>
                    {idea.steps.sort((a, b) => a.step_number - b.step_number).map((step, index) => (
                      <div key={index} className={styles.stepItem}>
                        <span className={styles.stepTitle}>Step {step.step_number}: {step.title}</span>
                        <p className={styles.stepDescription}>{step.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.stepItem}>
                    <span className={styles.stepTitle}>
                      {idea.workflow_stage ? `Current Stage: ${idea.workflow_stage}` : 'No steps details available'}
                    </span>
                    <p className={styles.stepDescription}>
                      {idea.workflow_stage === 1 ? 'Preparation' :
                        idea.workflow_stage === 2 ? 'Construction' :
                          idea.workflow_stage === 3 ? 'Sharing' : 'Unknown stage'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contributors Section */}
        <div className={styles.contributorsSection} style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
          <h4 style={{ fontSize: '16px', color: '#2e8b57', marginBottom: '10px' }}>
            <i className="fas fa-hands-helping" style={{ marginRight: '8px' }}></i>
            Our Contributors
          </h4>
          {idea.contributors && idea.contributors.length > 0 ? (
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
              Huge thanks to our contributors: <span style={{ fontWeight: 'bold' }}>{idea.contributors.join(', ')}</span>
            </p>
          ) : (
            <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
              No contributors.
            </p>
          )}
        </div>

        <div className={styles.submitBtnContainer} style={{ marginTop: '20px' }}>
          <button
            className={styles.submitBtn}
            onClick={onConfirm}
          >
            Try this idea
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecycledIdeaPopup;
