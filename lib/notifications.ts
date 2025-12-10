import { db } from './firebase';
import { ref, push, set, update } from 'firebase/database';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  relatedId?: string;
  read: boolean;
  createdAt: number;
}

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  relatedId?: string
) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`);
    const newNotificationRef = push(notificationsRef);
    
    await set(newNotificationRef, {
      userId,
      title,
      message,
      type,
      relatedId: relatedId || null,
      read: false,
      createdAt: Date.now()
    });
    
    return newNotificationRef.key;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    try {
        const notificationRef = ref(db, `notifications/${userId}/${notificationId}`);
        await update(notificationRef, { read: true });
    } catch (error) {
         console.error("Error marking notification as read:", error);
    }
}

export const markAllNotificationsAsRead = async (userId: string, notifications: Notification[]) => {
    try {
        const updates: { [key: string]: boolean } = {};
        notifications.forEach(n => {
            if (!n.read) {
                updates[`notifications/${userId}/${n.id}/read`] = true;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
        }
    } catch (error) {
        console.error("Error marking all as read:", error);
    }
}
