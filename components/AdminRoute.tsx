'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { ref, get } from 'firebase/database';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        const checkAdmin = async () => {
          try {
            const snapshot = await get(ref(db, `users/${user.uid}/role`));
            const role = snapshot.val();
            if (role === 'admin') {
              setIsAdmin(true);
            } else {
              console.log('User is not admin, redirecting...');
              router.push('/homepage');
            }
          } catch (error) {
            console.error('Error checking admin role:', error);
            router.push('/homepage');
          } finally {
            setCheckingRole(false);
          }
        };
        checkAdmin();
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || checkingRole) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: '#82AA52',
        fontSize: '1.2rem',
        fontWeight: 'bold'
      }}>
        Verifying Admin Access...
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
}
