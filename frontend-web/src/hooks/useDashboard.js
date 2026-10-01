import { useOutletContext } from 'react-router-dom';

/**
 * Data shared by DashboardLayout with every dashboard page:
 * currentUser (or null while loading), unreadCount, refreshUnread(), refreshUser().
 */
export const useDashboard = () => {
  const ctx = useOutletContext();
  return ctx || { currentUser: null, userLoading: true, unreadCount: 0, refreshUnread: () => {}, refreshUser: () => {} };
};

export const isAdminUser = (user) => user?.role?.toLowerCase() === 'admin';
