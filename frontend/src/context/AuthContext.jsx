import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import api from '../lib/api';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { initPushNotifications } from '../lib/pushNotifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('kabootar_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (idToken, name = null) => {
    setLoading(true);
    // Show a "slow server" hint after 8 seconds (Render cold-start can take ~50s)
    const slowTimer = setTimeout(() => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.loading('Server is waking up… please wait', { id: 'slow-server', duration: 45000 });
      });
    }, 8000);

    try {
      const { data } = await api.post('/auth/verify', { idToken, name });
      localStorage.setItem('kabootar_token', data.token);
      localStorage.setItem('kabootar_user', JSON.stringify(data.user));
      setUser(data.user);
      connectSocket(data.user._id);
      // Register for push notifications after login (fire-and-forget)
      initPushNotifications(data.user._id).catch(() => {});
      return { success: true, user: data.user, requiresProfileCompletion: data.requiresProfileCompletion };
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const hasResponse = !!err.response;
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;

      let msg;
      if (isTimeout) {
        msg = `Server timeout after 60s — tap retry in a moment`;
      } else if (!hasResponse) {
        msg = `Network blocked (CORS) — backend needs redeployment`;
      } else if (status === 429) {
        msg = `Too many attempts — wait 1 hour or restart the backend`;
      } else if (status === 503) {
        msg = `Server sleeping (503) — tap retry in 30 seconds`;
      } else {
        msg = serverMsg || `Server error ${status || '?'}`;
      }

      console.error('[login error]', { code: err.code, status, serverMsg, msg });
      const isNewUser = err.response?.data?.newUser;
      return { success: false, message: msg, newUser: isNewUser };
    } finally {
      clearTimeout(slowTimer);
      import('react-hot-toast').then(({ default: toast }) => toast.dismiss('slow-server'));
      setLoading(false);
    }
  };

  const loginDirect = (token, userData) => {
    localStorage.setItem('kabootar_token', token);
    localStorage.setItem('kabootar_user', JSON.stringify(userData));
    setUser(userData);
    connectSocket(userData._id);
    initPushNotifications(userData._id).catch(() => {});
  };

  const logout = async () => {
    await auth.signOut().catch(() => {});
    localStorage.removeItem('kabootar_token');
    localStorage.removeItem('kabootar_user');
    disconnectSocket();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('kabootar_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch {}
  };

  // Connect socket on mount if user exists
  useEffect(() => {
    if (user?._id) connectSocket(user._id);
  }, [user?._id]);

  // Listen for real-time KYC status updates from admin
  useEffect(() => {
    if (!user?._id) return;
    const socket = getSocket();

    const onApproved = (data) => {
      // Update stored user with verified status immediately — no re-login needed
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, kycStatus: 'verified', kycApprovedAt: data.kycApprovedAt };
        localStorage.setItem('kabootar_user', JSON.stringify(updated));
        return updated;
      });
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success('🎉 KYC Verified! You can now post trips.', { duration: 6000 });
      });
    };

    const onRejected = (data) => {
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, kycStatus: 'rejected', kycRejectedReason: data.kycRejectedReason };
        localStorage.setItem('kabootar_user', JSON.stringify(updated));
        return updated;
      });
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(`KYC not approved: ${data.kycRejectedReason || 'Please re-upload documents.'}`, { duration: 7000 });
      });
    };

    // Parcel accepted → warn sender their post is now in progress
    const onParcelInProgress = (data) => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast(
          `⚡ ${data.travellerName} accepted your parcel (${data.fromCity} → ${data.toCity}).\nYour post is now In Progress and hidden from public.`,
          { duration: 8000, icon: '📦' }
        );
      });
    };

    // Delivery confirmed by traveller — prompt sender
    const onAwaitingConfirmation = (data) => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast(
          '📦 Your parcel has arrived! Open My Parcels to confirm receipt.',
          { duration: 10000, icon: '✅' }
        );
      });
    };

    // Traveller gets notified when sender confirms
    const onDeliveryConfirmed = (data) => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success(data.message || '🎊 Delivery confirmed! Your count updated.', { duration: 7000 });
      });
      refreshUser(); // refresh tripsCompleted count
    };

    // Admin banned this account — sign out immediately instead of waiting for the next API call to 403
    const onAccountBanned = (data) => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(
          data.reason ? `Your account has been suspended: ${data.reason}` : 'Your account has been suspended.',
          { duration: 8000 }
        );
      });
      logout();
    };

    socket.on('kyc_approved',              onApproved);
    socket.on('kyc_rejected',              onRejected);
    socket.on('parcel_in_progress',        onParcelInProgress);
    socket.on('parcel_awaiting_confirmation', onAwaitingConfirmation);
    socket.on('delivery_confirmed',        onDeliveryConfirmed);
    socket.on('account_banned',            onAccountBanned);
    return () => {
      socket.off('kyc_approved',              onApproved);
      socket.off('kyc_rejected',              onRejected);
      socket.off('parcel_in_progress',        onParcelInProgress);
      socket.off('parcel_awaiting_confirmation', onAwaitingConfirmation);
      socket.off('delivery_confirmed',        onDeliveryConfirmed);
      socket.off('account_banned',            onAccountBanned);
    };
  }, [user?._id]);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginDirect, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
