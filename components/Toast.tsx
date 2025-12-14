import React, { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={styles.toastContainer} aria-live="polite">
      <div className={`${styles.toast} ${type === 'success' ? styles.success : styles.error}`}>
        <div className={styles.message}>{message}</div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close notification">×</button>
      </div>
    </div>
  );
};

export default Toast;
