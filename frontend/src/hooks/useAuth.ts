import { useAuthStore } from '@/context/authStore';
import { useCallback } from 'react';
import { authAPI } from '@/api/apiService';

// One-time initial migration/sync from legacy localStorage keys to authStore if needed
let initialized = false;
function syncInitialAuth() {
  if (initialized) return;
  initialized = true;
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const store = useAuthStore.getState();
      if (!store.token) store.setToken(token);
      if (!store.isAuthenticated) store.setIsAuthenticated(true);
      if (!store.user) {
        const cu = localStorage.getItem('currentUser');
        if (cu) {
          try { store.setUser(JSON.parse(cu)); } catch {}
        }
      }
      if (!store.employee) {
        const ce = localStorage.getItem('currentEmployee');
        if (ce) {
          try { store.setEmployee(JSON.parse(ce)); } catch {}
        }
      }
    }
  } catch {}
}
syncInitialAuth();

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const setEmployee = useAuthStore((s) => s.setEmployee);
  const setToken = useAuthStore((s) => s.setToken);
  const setIsAuthenticated = useAuthStore((s) => s.setIsAuthenticated);
  const storeLogout = useAuthStore((s) => s.logout);

  const isHR = employee?.role?.toLowerCase() === 'hr';
  const isAdmin = employee?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'admin';
  const permissions = employee?.hr_permissions || {};

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // proceed with local cleanup even if API call fails
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentEmployee');
    storeLogout();
  }, [storeLogout]);

  return {
    user,
    employee,
    token: token || localStorage.getItem('access_token'),
    isAuthenticated,
    isAdmin,
    isHR,
    
    // Permission Helpers
    canViewEmployees: isAdmin || (isHR && permissions.can_view_employees),
    canEditEmployeeInfo: isAdmin || (isHR && permissions.can_edit_employee_info),
    canEditPayroll: isAdmin || (isHR && permissions.can_edit_payslip),
    canDeleteEmployees: isAdmin || (isHR && permissions.can_delete_employees),
    canResetPassword: isAdmin || (isHR && permissions.can_reset_password),

    setUser,
    setEmployee,
    setToken,
    setIsAuthenticated,
    logout,
  };
};

export const useIsDarkMode = () => {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const toggleDarkMode = useAuthStore((state) => state.toggleDarkMode);
  
  return { isDarkMode, toggleDarkMode };
};
