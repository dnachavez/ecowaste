'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import styles from './settings.module.css';
import { 
  updatePassword, 
  updateEmail, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  deleteUser
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  // Form states
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Determine provider type
  const isPasswordProvider = user?.providerData.some(p => p.providerId === 'password');
  const socialProvider = user?.providerData.find(p => p.providerId !== 'password');

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

  useEffect(() => {
    if (user?.email) {
      setEmailForm(prev => ({ ...prev, newEmail: user.email || '' }));
    }
  }, [user]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      if (emailForm.newEmail === user.email) {
        throw new Error('New email is the same as current email');
      }

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email!, emailForm.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update email
      await updateEmail(user, emailForm.newEmail);
      setMessage({ type: 'success', text: 'Email updated successfully!' });
      setEmailForm(prev => ({ ...prev, currentPassword: '' }));
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Error updating email:', error);
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Incorrect current password.' });
      } else if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Please log out and log in again to perform this action.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to update email.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('New passwords do not match');
      }
      if (passwordForm.newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email!, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordForm.newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Incorrect current password.' });
      } else if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Please log out and log in again to perform this action.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to update password.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setMessage({ type: 'error', text: 'Please type DELETE to confirm.' });
      return;
    }

    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      // Note: This might require re-authentication similar to above if it's been a while
      // For simplicity, we try directly. In a real app, handle re-auth here too.
      await deleteUser(user);
      router.push('/');
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Error deleting account:', error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Security check: Please log out and log back in before deleting your account.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete account. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
    <div className={styles.container}>
      <Header />
      <Sidebar />
      <main className={styles.mainContent}>
        
        <div className={styles.header}>
            <h1>Account Settings</h1>
            <p>Manage your account preferences and security settings.</p>
          </div>

          {message && (
            <div className={
              message.type === 'success' ? styles.successMessage : 
              message.type === 'error' ? styles.errorMessage : 
              styles.infoMessage
            }>
              {message.text}
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
               <i className="fas fa-id-card"></i> Personal Information
            </div>
            <div className={styles.card}>
               <p style={{ color: '#666', marginBottom: '15px' }}>
                 To update your name, address, or phone number, please visit your profile page.
               </p>
               <Link href="/profile" className={styles.btn} style={{display: 'inline-block', textDecoration: 'none'}}>
                 Go to Profile
               </Link>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <i className="fas fa-user-shield"></i> Login & Security
            </div>

            {isPasswordProvider ? (
              <>
                {/* Change Email */}
                <div className={styles.card} style={{ marginBottom: '20px' }}>
                  <h3>Change Email</h3>
                  <form onSubmit={handleUpdateEmail}>
                    <div className={styles.formGroup}>
                      <label>New Email Address</label>
                      <input 
                        type="email" 
                        className={styles.input}
                        value={emailForm.newEmail}
                        onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Current Password (to confirm)</label>
                      <input 
                        type="password" 
                        className={styles.input}
                        value={emailForm.currentPassword}
                        onChange={(e) => setEmailForm({...emailForm, currentPassword: e.target.value})}
                        required
                        placeholder="Enter current password"
                      />
                    </div>
                    <button type="submit" className={styles.btn} disabled={isLoading}>
                      {isLoading ? 'Updating...' : 'Update Email'}
                    </button>
                  </form>
                </div>

                {/* Change Password */}
                <div className={styles.card}>
                  <h3>Change Password</h3>
                  <form onSubmit={handleUpdatePassword}>
                    <div className={styles.formGroup}>
                      <label>Current Password</label>
                      <input 
                        type="password" 
                        className={styles.input}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>New Password</label>
                      <input 
                        type="password" 
                        className={styles.input}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Confirm New Password</label>
                      <input 
                        type="password" 
                        className={styles.input}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                    <button type="submit" className={styles.btn} disabled={isLoading}>
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className={styles.infoMessage}>
                <p>
                  <strong>You are logged in via {socialProvider?.providerId}.</strong>
                  <br />
                  Please manage your email and password settings through your {socialProvider?.providerId} account.
                </p>
                <div className={styles.socialProvider}>
                  <div className={styles.providerIcon}>
                    <i className={`fab fa-${socialProvider?.providerId === 'google.com' ? 'google' : 'facebook'}`}></i>
                  </div>
                  <span>Connected with {socialProvider?.providerId}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.deleteAccountSection}>
            <div className={styles.sectionTitle} style={{ color: '#dc3545' }}>
              <i className="fas fa-exclamation-triangle"></i> Danger Zone
            </div>
            
            <div className={`${styles.card} ${styles.deleteAccountCard}`}>
              <h3>Delete Account</h3>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <div className={styles.formGroup}>
                <label>Type &quot;DELETE&quot; to confirm</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <button 
                onClick={handleDeleteAccount} 
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={isLoading || deleteConfirm !== 'DELETE'}
              >
                Delete My Account
              </button>
            </div>
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
