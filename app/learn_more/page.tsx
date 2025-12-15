'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from './learn_more.module.css';

export default function LearnMorePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('recycling');

  
    // Feedback state
      const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
      const [rating, setRating] = useState(0);
      const [feedbackText, setFeedbackText] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [submitSuccess, setSubmitSuccess] = useState(false);
      const [ratingError, setRatingError] = useState(false);
      const [textError, setTextError] = useState(false);

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

  const handleBack = () => {
    router.back();
  };

  return (
    <ProtectedRoute>
        <Header />

        <div className={styles.container}>
        <Sidebar />
        
        <main className={styles.mainContent}>
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2 className={styles.pageTitle}>Eco Education Center</h2>
          </div>
            <p>Learn about Recycling Benefits, Waste Impacts, Sustainable Living, and About EcoWaste.</p>

          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'recycling' ? styles.active : ''}`}
                onClick={() => setActiveTab('recycling')}
              >
                Recycling Benefits
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'impacts' ? styles.active : ''}`}
                onClick={() => setActiveTab('impacts')}
              >
                Waste Impacts
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'sustainability' ? styles.active : ''}`}
                onClick={() => setActiveTab('sustainability')}
              >
                Sustainable Living
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'ecowaste' ? styles.active : ''}`}
                onClick={() => setActiveTab('ecowaste')}
              >
                About EcoWaste
              </button>
            </div>
          </div>

          <div>
            {activeTab === 'recycling' && (
              <div className={`${styles.tabContent} ${styles.infoSection}`}>
                <h3>Recycling Benefits</h3>
                <p>Recycling conserves resources, saves energy, and reduces landfill waste. By reusing materials, we minimize pollution and protect the planet for future generations.</p>
                <ul>
                  <li>Reduces the need for new raw materials</li>
                  <li>Prevents pollution by reducing the need to collect new materials</li>
                  <li>Saves energy and water resources</li>
                  <li>Supports green jobs and sustainable industries</li>
                </ul>
                <section className={styles.educationSection}>
                  <h3>Watch and Learn: Environmental Awareness Videos</h3>
                  <div className={styles.videoGrid}>
                    <iframe src="https://www.youtube.com/embed/6jQ7y_qQYUA" title="How Recycling Works | SciShow" allowFullScreen></iframe>
                    <iframe src="https://www.youtube.com/embed/xpAnLXc_bIU?si=HllPtiZ4CdydN5JS" title="YouTube video player" allowFullScreen></iframe>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'impacts' && (
              <div className={`${styles.tabContent} ${styles.infoSection}`}>
                <h3>Waste Impacts</h3>
                <p>Improper waste management leads to pollution, health issues, and ecosystem damage. Every piece of trash that ends up in nature has long-lasting effects.</p>
                <ul>
                  <li>Plastic waste harms marine life and contaminates food chains</li>
                  <li>Improper disposal leads to toxic soil and water contamination</li>
                  <li>Landfills release methane — a major greenhouse gas</li>
                  <li>Air pollution from burning waste contributes to global warming</li>
                </ul>
                <section className={styles.educationSection}>
                  <h3>Watch and Learn: Environmental Awareness Videos</h3>
                  <div className={styles.videoGrid}>
                    <iframe src="https://www.youtube.com/embed/9GorqroigqM" title="The Life of Plastic | National Geographic" allowFullScreen></iframe>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'sustainability' && (
              <div className={`${styles.tabContent} ${styles.infoSection}`}>
                <h3>Sustainable Living</h3>
                <p>Sustainability starts with daily habits — small changes create long-term impact. Live consciously by conserving resources and supporting green initiatives.</p>
                <ul>
                  <li>Use reusable bags, bottles, and containers</li>
                  <li>Switch to energy-efficient appliances</li>
                  <li>Compost organic waste</li>
                  <li>Support local eco-friendly products and businesses</li>
                </ul>
                <section className={styles.educationSection}>
                  <h3>Watch and Learn: Environmental Awareness Videos</h3>
                  <div className={styles.videoGrid}>
                    <iframe src="https://www.youtube.com/embed/4JDGFNoY-rQ?si=QFUK-yiPmYKCgkF1" title="YouTube video player" allowFullScreen></iframe>
                    <iframe src="https://www.youtube.com/embed/0ZiD_Lb3Tm0?si=pUAXBW1jg23ZqhH8" title="YouTube video player" allowFullScreen></iframe>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'ecowaste' && (
              <div className={`${styles.tabContent} ${styles.infoSection}`}>
                <div className={styles.infoSection}>
                  <h3>About EcoWaste</h3>
                  <p>EcoWaste empowers communities to manage waste sustainably by combining education, digital tracking, and donation programs.</p>

                  <h3>Our Mission</h3>
                  <p>To create a sustainable future by reducing waste, promoting recycling, and empowering communities to take action for the environment.</p>

                  <h3>How it works</h3>
                  <ol>
                    <li>Start recycling projects to track your environmental impact</li>
                    <li>Donate items you no longer need instead of throwing them away</li>
                    <li>Browse available donations from other community members</li>
                    <li>Earn achievements and climb the leaderboard as you contribute</li>
                  </ol>
                  
                  <h3>Benefits of Using EcoWaste</h3>
                  <ul>
                    <li>Reduce your environmental footprint</li>
                    <li>Connect with like-minded individuals</li>
                    <li>Track your recycling progress and impact</li>
                    <li>Find new homes for items you no longer need</li>
                    <li>Earn recognition for your environmental efforts</li>
                  </ul>

                  <h3>Aligns with SDGs:</h3>
                  <ul>
                    <li>SDG 13: Climate Action - By promoting recycling and waste reduction, EcoWaste helps mitigate climate change impacts.</li>
                    <li>SDG 14: Life Below Water - Reducing plastic waste through recycling efforts helps protect marine ecosystems.</li>
                  </ul>
                
                  <div className={styles.actionButtons}>
                    <Link href="/start_project" className={styles.actionBtn}>Start Your First Project</Link>
                    <Link href="/browse" className={styles.actionBtn}>Browse Donations</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
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
                {ratingError && <div className={styles.errorMessage} style={{display: 'block'}}>Please select a rating</div>}
                
                <p className={styles.feedbackDetail}>Please share in detail what we can improve more?</p>
                <textarea 
                  placeholder="Your feedback helps us make EcoWaste better..."
                  value={feedbackText}
                  onChange={(e) => {
                    setFeedbackText(e.target.value);
                    setTextError(false);
                  }}
                ></textarea>
                {textError && <div className={styles.errorMessage} style={{display: 'block'}}>Please provide your feedback</div>}
                
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
              <div className={styles.thankYouMessage} style={{display: 'block'}}>
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
