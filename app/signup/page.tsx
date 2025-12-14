'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import styles from './signup.module.css';

function SignupContent() {
  const [isNameDetailsOpen, setIsNameDetailsOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isGoogleSignupInProgress, setIsGoogleSignupInProgress] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  
  const isGoogleSetup = searchParams.get('google_setup') === 'true';

  useEffect(() => {
    if (!loading && user && !isGoogleSignupInProgress) {
        if (!isGoogleSetup) {
            router.push('/homepage');
        }
        // We defer the pre-filling to avoid synchronous state updates during effect execution
        // or we could use a separate effect that only runs once on mount/user change
    }
  }, [user, loading, router, isGoogleSetup, isGoogleSignupInProgress]);

  useEffect(() => {
      if (isGoogleSetup && user) {
          if (user.email && email !== user.email) {
              setEmail(user.email);
          }
          if (user.displayName && !firstName && !lastName) {
              const names = user.displayName.split(' ');
              setFirstName(names[0] || '');
              setLastName(names.slice(1).join(' ') || '');
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleSetup, user]); 

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  const showPopupToast = (message: string) => {
    setPopupMessage(message);
    setShowPopup(true);
    setTimeout(() => {
      setShowPopup(false);
    }, 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGoogleSetup) {
        // Just update the profile/database since user is already authenticated
        if (auth.currentUser) {
            try {
                await updateProfile(auth.currentUser, {
                    displayName: fullName,
                });
                
                await set(ref(db, 'users/' + auth.currentUser.uid), {
                    firstName,
                    middleName,
                    lastName,
                    fullName,
                    contactNumber,
                    address,
                    city,
                    zipCode,
                    email,
                    createdAt: new Date().toISOString(),
                    authProvider: 'google'
                });

                showPopupToast('Profile updated successfully!');
                router.push('/homepage');
            } catch (error) {
                 if (error instanceof Error) {
                    showPopupToast(error.message);
                } else {
                    showPopupToast('Failed to update profile.');
                }
            }
        }
        return;
    }

    if (password && password !== confirmPassword) {
      showPopupToast('Passwords do not match!');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      await set(ref(db, 'users/' + userCredential.user.uid), {
        firstName,
        middleName,
        lastName,
        fullName,
        contactNumber,
        address,
        city,
        zipCode,
        email,
        createdAt: new Date().toISOString(),
        authProvider: 'email'
      });

      showPopupToast('Signup successful!');
      router.push('/homepage');
    } catch (error) {
        if (error instanceof Error) {
            showPopupToast(error.message);
        } else {
            showPopupToast('Signup failed. Please try again.');
        }
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleSignupInProgress(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      showPopupToast('Google Signup successful!');
      
      if (additionalUserInfo?.isNewUser) {
        // The router will likely redirect to /signup?google_setup=true due to the logic in login page?
        // Wait, we are already on signup page. We just need to handle it.
        // Actually, we should force the "setup mode" if new user
        router.push('/signup?google_setup=true');
      } else {
         router.push('/homepage');
      }
    } catch (error) {
        setIsGoogleSignupInProgress(false);
        if (error instanceof Error) {
            showPopupToast(error.message);
        } else {
            showPopupToast('Google Signup failed.');
        }
    }
  };

  return (
    <div className={styles.signupContainer}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&amp;family=Open+Sans&amp;display=swap" rel="stylesheet" />

      <header className={styles.mainHeader}>
        <div className={styles.logoImage}>
          <Link href="/">
            <img src="/ecowaste_logo.png" alt="EcoWaste Logo" className={styles.logoImg} />
          </Link>
        </div>
      </header>

      <div className={styles.leftSection}>
        <div className={styles.curvedDesign}>
          <div className={`${styles.curve} ${styles.curveLarge}`}></div>
          <div className={`${styles.curve} ${styles.curveMedium}`}></div>
          <div className={`${styles.curve} ${styles.curveSmall}`}></div>
        </div>
        <div className={styles.contentContainer}>
          <h1>Get Started Now</h1>
          <p className={styles.subtitle}>Create your account to start donating waste sustainably.</p>

          <form id="signup-form" method="POST" onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.fullNameContainer}`}>
                <label htmlFor="full-name" className={styles.required}>Full Name</label>
                <input 
                  type="text" 
                  id="full-name" 
                  name="full-name" 
                  className={styles.fullNameInput} 
                  required 
                  placeholder="Enter Full Name" 
                  readOnly 
                  value={fullName}
                  onClick={() => setIsNameDetailsOpen(!isNameDetailsOpen)}
                />

                <div className={`${styles.nameDetails} ${isNameDetailsOpen ? styles.active : ''}`} id="name-details">
                  <div className={styles.formGroup}>
                    <label htmlFor="first-name" className={styles.required}>First Name</label>
                    <input 
                      type="text" 
                      id="first-name" 
                      name="first-name" 
                      required 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter First Name" 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="middle-name">Middle Name</label>
                    <input 
                      type="text" 
                      id="middle-name" 
                      name="middle-name" 
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Enter Middle Name" 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="last-name" className={styles.required}>Last Name</label>
                    <input 
                      type="text" 
                      id="last-name" 
                      name="last-name" 
                      required 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter Last Name" 
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contact-number" className={styles.required}>Contact Number</label>
                <input 
                    type="tel" 
                    id="contact-number" 
                    name="contact-number" 
                    required 
                    placeholder="Enter Contact Number" 
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.required}>Email address</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    placeholder="email@gmail.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={isGoogleSetup}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="address" className={styles.required}>Full Address</label>
                <input 
                    type="text" 
                    id="address" 
                    name="address" 
                    required 
                    placeholder="Enter Full Address" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="city" className={styles.required}>City</label>
                <input 
                    type="text" 
                    id="city" 
                    name="city" 
                    required 
                    placeholder="Enter City" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {!isGoogleSetup && (
                <>
                  <div className={styles.formGroup} id="password-group">
                    <label htmlFor="password" className={styles.required}>Password</label>
                    <input 
                      type="password" 
                      id="password" 
                      name="password" 
                      required 
                      minLength={8} 
                      placeholder="Enter Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="zip-code" className={styles.required}>Zip Code</label>
                <input 
                    type="text" 
                    id="zip-code" 
                    name="zip-code" 
                    required 
                    placeholder="Enter Zip Code" 
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                />
              </div>

              {!isGoogleSetup && (
                <>
                  <div className={styles.formGroup} id="confirm-password-group">
                    <label htmlFor="confirm-password" className={styles.required}>Confirm Password</label>
                    <input 
                      type="password" 
                      id="confirm-password" 
                      name="confirm-password" 
                      required 
                      placeholder="Re-enter Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className={styles.checkboxGroup}>
              <input type="checkbox" id="terms" name="terms" required />
              <label htmlFor="terms">I agree to the <a href="#" style={{ textDecoration: 'underline' }}>terms & policy</a>.</label>
            </div>

            <button type="submit" className={styles.signupBtn}>Sign Up</button>

            <div className={styles.divider}>or</div>

            <div className={styles.socialLogin}>
              <button 
                type="button" 
                className={`${styles.socialBtn} ${styles.google}`}
                onClick={handleGoogleSignup}
              >
                <i className="fab fa-google"></i> Sign up with Google
              </button>
              
            </div>

            <p className={styles.loginLink}>Already have an account? <Link href="/login">Log in</Link></p>
          </form>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.greenCurves}>
          <div className={styles.greenCurve1}></div>
          <div className={styles.greenCurve2}></div>
          <div className={styles.greenCurve3}></div>
          <div className={`${styles.floatingElement} ${styles.floatingElement1}`}></div>
          <div className={`${styles.floatingElement} ${styles.floatingElement2}`}></div>
          <div className={`${styles.floatingElement} ${styles.floatingElement3}`}></div>
        </div>
      </div>
      
      {/* Popup Toast */}
      <div id="popupToast" className={`${styles.popupToast} ${showPopup ? styles.show : ''}`}>
        <i className="fas fa-info-circle"></i>
        <span id="popupMessage">{popupMessage}</span>
        <button type="button" className={styles.popupClose} onClick={() => setShowPopup(false)}>×</button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
