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
        <div className={styles.content}>
          <div className={styles.icon}>
            {type === 'success' ? <i className="fas fa-check-circle" /> : <i className="fas fa-exclamation-circle" />}
          </div>
          <div className={styles.textContainer}>
            <div className={styles.title}>{type === 'success' ? 'Success' : 'Error'}</div>
            <div className={styles.message}>{message}</div>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close notification">×</button>
      </div>
    </div>
  );
};

export default Toast;
