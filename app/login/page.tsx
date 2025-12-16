'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import styles from './login.module.css';
import Toast from '../../components/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState<'success' | 'error'>('success');
  const [isGoogleLoginInProgress, setIsGoogleLoginInProgress] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && !isGoogleLoginInProgress) {
      router.push('/homepage');
    }
  }, [user, loading, router, isGoogleLoginInProgress]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleFacebookClick = () => {
    // Facebook auth removed
  };

  const showPopupToast = (message: string, type: 'success' | 'error' = 'success') => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showPopupToast('Login successful!', 'success');
      router.push('/homepage'); // Redirect to home page
    } catch (error) {
      if (error instanceof Error) {
        showPopupToast(error.message, 'error');
      } else {
        showPopupToast('Login failed. Please check your credentials.', 'error');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoginInProgress(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);

      showPopupToast('Google Login successful!', 'success');

      if (additionalUserInfo?.isNewUser) {
        router.push('/signup?google_setup=true');
      } else {
        router.push('/homepage');
      }
    } catch (error) {
      setIsGoogleLoginInProgress(false);
      if (error instanceof Error) {
        showPopupToast(error.message, 'error');
      } else {
        showPopupToast('Google Login failed.', 'error');
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* Load Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&amp;family=Open+Sans&amp;display=swap" rel="stylesheet" />

      <header className={styles.mainHeader}>
        <div className={styles.logoImage}>
          <Link href="/">
            <img src="/ecowaste_logo.png" alt="EcoWaste Logo" className={styles.logoImg} />
          </Link>
        </div>
      </header>

      <div className={styles.loginContainer}>
        <div className={styles.leftSection}>
          <div className={styles.curvedDesign}>
            <div className={`${styles.curve} ${styles.curveLarge}`}></div>
            <div className={`${styles.curve} ${styles.curveMedium}`}></div>
            <div className={`${styles.curve} ${styles.curveSmall}`}></div>
          </div>
          <div className={styles.contentContainer}>
            <h1 className={styles.title}>Welcome Back!</h1>
            <p className={styles.subtitle}>Login to continue supporting sustainable waste donations.</p>

            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    className={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <i
                    className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} ${styles.togglePassword}`}
                    id="togglePassword"
                    onClick={togglePasswordVisibility}
                  ></i>
                </div>
              </div>

              <div className={styles.formOptions}>
                <div className={styles.rememberMe}>
                  <input type="checkbox" id="remember" name="remember" />
                  <label htmlFor="remember">Remember me</label>
                </div>

                <div className={styles.forgotPassword}>
                  <Link href="/forgot-password">Forgot password?</Link>
                </div>
              </div>

              <button type="submit" className={styles.loginBtn}>Login</button>

              <div className={styles.divider}>or</div>

              <div className={styles.socialLogin}>
                <button
                  type="button"
                  className={`${styles.socialBtn} ${styles.socialBtnGoogle}`}
                  onClick={handleGoogleLogin}
                >
                  <i className="fab fa-google"></i> Continue with Google
                </button>

              </div>

              <p className={styles.signupLink}>Don&apos;t have an account? <Link href="/signup">Sign up</Link></p>
            </form>
          </div>
        </div>

        <div className={styles.rightSection}>
          <div className={styles.greenCurves}>
            <div className={`${styles.greenCurve1}`}></div>
            <div className={`${styles.greenCurve2}`}></div>
            <div className={`${styles.greenCurve3}`}></div>
            <div className={`${styles.floatingElement} ${styles.floatingElement1}`}></div>
            <div className={`${styles.floatingElement} ${styles.floatingElement2}`}></div>
            <div className={`${styles.floatingElement} ${styles.floatingElement3}`}></div>
          </div>
        </div>
      </div>

      {/* Popup Toast */}
      {showPopup && (
        <Toast
          message={popupMessage}
          type={popupType}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
