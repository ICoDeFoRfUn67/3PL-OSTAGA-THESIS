import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { employeeAPI } from '@/api/apiService';

// Components
import { Layout, LoadingSpinner } from '@/components/common';
import { ThemeProvider } from '@/context/ThemeContext';
import BottomNavigation from '@/components/BottomNavigation';
import { LiveLocationTracker } from '@/components/LiveLocationTracker';

// Styles
import '@/styles/globals.css';

// Lazy load Pages to dramatically improve initial page load speed
const LoginScreen = React.lazy(() => import('@/pages/auth/LoginScreen').then(m => ({ default: m.LoginScreen })));
const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminEmployeesPage = React.lazy(() => import('@/pages/admin/AdminEmployeesPage').then(m => ({ default: m.AdminEmployeesPage })));
const AdminHubsPage = React.lazy(() => import('@/pages/admin/AdminHubsPage').then(m => ({ default: m.AdminHubsPage })));
const AccessControlPage = React.lazy(() => import('@/pages/admin/AccessControlPage').then(m => ({ default: m.AccessControlPage })));
const AttendancePage = React.lazy(() => import('@/pages/admin/AttendancePage').then(m => ({ default: m.AttendancePage })));
const AdminEmployeeAttendanceHistoryPage = React.lazy(() => import('@/pages/admin/AdminEmployeeAttendanceHistoryPage').then(m => ({ default: m.AdminEmployeeAttendanceHistoryPage })));
const PayslipPage = React.lazy(() => import('@/pages/admin/PayslipPage').then(m => ({ default: m.PayslipPage })));
const AdminEmployeePayslipHistoryPage = React.lazy(() => import('@/pages/admin/AdminEmployeePayslipHistoryPage').then(m => ({ default: m.AdminEmployeePayslipHistoryPage })));
const ActivityLogsPage = React.lazy(() => import('@/pages/admin/ActivityLogsPage').then(m => ({ default: m.ActivityLogsPage })));
const SecurityAlertsPage = React.lazy(() => import('@/pages/admin/SecurityAlertsPage').then(m => ({ default: m.SecurityAlertsPage })));
const PredictionsPage = React.lazy(() => import('@/pages/admin/PredictionsPage').then(m => ({ default: m.PredictionsPage })));
const AdminPaymentAccountsPage = React.lazy(() => import('@/pages/admin/AdminPaymentAccountsPage').then(m => ({ default: m.AdminPaymentAccountsPage })));
const ApplicationRequestsPanel = React.lazy(() => import('@/components/ApplicationRequestsPanel').then(m => ({ default: m.ApplicationRequestsPanel })));

const HrDashboardPage = React.lazy(() => import('@/pages/hr/HrDashboardPage'));
const HrEmployeesPage = React.lazy(() => import('@/pages/hr/HrEmployeesPage'));
const HrEmployeeRequestPage = React.lazy(() => import('@/pages/hr/HrEmployeeRequestPage'));
const HrEditRequestPage = React.lazy(() => import('@/pages/hr/HrEditRequestPage'));
const HrLeaveRequestPage = React.lazy(() => import('@/pages/hr/HrLeaveRequestPage'));
const HrApplicationRequestPage = React.lazy(() => import('@/pages/hr/HrApplicationRequestPage'));
const HrHubsPage = React.lazy(() => import('@/pages/hr/HrHubsPage'));
const HrAccessControlPage = React.lazy(() => import('@/pages/hr/HrAccessControlPage'));
const HrAttendancePage = React.lazy(() => import('@/pages/hr/HrAttendancePage'));
const HrPayslipPage = React.lazy(() => import('@/pages/hr/HrPayslipPage'));
const HrActivityLogsPage = React.lazy(() => import('@/pages/hr/HrActivityLogsPage'));
const HrSecurityAlertsPage = React.lazy(() => import('@/pages/hr/HrSecurityAlertsPage'));

const EmployeeDashboard = React.lazy(() => import('@/pages/employee/EmployeeDashboard').then(m => ({ default: m.EmployeeDashboard })));
const AttendanceHistoryScreen = React.lazy(() => import('@/pages/employee/AttendanceHistoryScreen').then(m => ({ default: m.AttendanceHistoryScreen })));
const EmployeeProfileDetailPage = React.lazy(() => import('@/pages/employee/EmployeeProfileDetailPage').then(m => ({ default: m.EmployeeProfileDetailPage })));
const EditRequestsPanel = React.lazy(() => import('@/components/EditRequestsManagementPanel').then(m => ({ default: m.EditRequestsPanel })));
const LeaveRequestsPanel = React.lazy(() => import('@/components/LeaveRequestsPanel').then(m => ({ default: m.LeaveRequestsPanel })));
const EmployeeLeaveRequestForm = React.lazy(() => import('@/components/EmployeeLeaveRequestForm').then(m => ({ default: m.EmployeeLeaveRequestForm })));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, user, employee } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Get role from user object first, then fall back to employee object
  const userRole = user?.role || employee?.role;

  if (requiredRole && userRole && !requiredRole.includes(userRole)) {
    // Redirect to appropriate dashboard based on actual role
    if (userRole === 'Admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'HR') {
      return <Navigate to="/hr" replace />;
    } else if (userRole === 'Employee') {
      return <Navigate to="/employee" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, employee } = useAuth();
  const userRole = user?.role || employee?.role;
  return (
    <Layout>
      {children}
      {(userRole === 'Admin' || userRole === 'HR') && <BottomNavigation />}
    </Layout>
  );
};


function AuthenticatedHomeRedirect() {
  const { user, employee } = useAuth();
  if (!user && !employee) return <Navigate to="/login" replace />;
  
  // Get role from user object first, then fall back to employee object
  const userRole = user?.role || employee?.role;
  
  if (userRole === 'HR') return <Navigate to="/hr" replace />;
  if (userRole === 'Employee') return <Navigate to="/employee" replace />;
  return <Navigate to="/admin" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900"><LoadingSpinner /></div>}>
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/login"
        element={<LoginScreen />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole={['Admin']}>
            <DashboardLayout>
              <Routes>
                <Route path="" element={<AdminDashboard />} />
                <Route path="employees" element={<AdminEmployeesPage />} />
                <Route path="employees/:id" element={<EmployeeProfileDetailPage />} />
                <Route path="hubs" element={<AdminHubsPage />} />
                <Route path="access-control" element={<AccessControlPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="attendance/employee/:id" element={<AdminEmployeeAttendanceHistoryPage />} />
                <Route path="payslip" element={<PayslipPage />} />
                <Route path="payslip/employee/:id" element={<AdminEmployeePayslipHistoryPage />} />
                <Route path="edit-requests" element={<EditRequestsPanel />} />
                <Route path="leave-requests" element={<LeaveRequestsPanel />} />
                <Route path="activity-logs" element={<ActivityLogsPage />} />
                <Route path="security-alerts" element={<SecurityAlertsPage />} />
                <Route path="predictions" element={<PredictionsPage />} />
                <Route path="payment-accounts" element={<AdminPaymentAccountsPage />} />
                <Route path="application-requests" element={<ApplicationRequestsPanel />} />
              </Routes>
              </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* HR Routes */}
      <Route
        path="/hr/*"
        element={
          <ProtectedRoute requiredRole={['HR']}>
            <DashboardLayout>
              <Routes>
                <Route path="" element={<HrDashboardPage />} />
                <Route path="edit-requests" element={<HrEmployeeRequestPage />} />
                <Route path="employees" element={<HrEmployeesPage />} />
                <Route path="employees/:id" element={<EmployeeProfileDetailPage />} />
                <Route path="hubs" element={<HrHubsPage />} />
                <Route path="access-control" element={<HrAccessControlPage />} />
                <Route path="attendance" element={<HrAttendancePage />} />
                <Route path="attendance/employee/:id" element={<AdminEmployeeAttendanceHistoryPage />} />
                <Route path="payslip" element={<HrPayslipPage />} />
                <Route path="payslip/employee/:id" element={<AdminEmployeePayslipHistoryPage />} />
                <Route path="leave-requests" element={<HrLeaveRequestPage />} />
                <Route path="activity-logs" element={<HrActivityLogsPage />} />
                <Route path="security-alerts" element={<HrSecurityAlertsPage />} />
                <Route path="edit-requests/:id" element={<HrEditRequestPage />} />
                <Route path="predictions" element={<PredictionsPage />} />
                <Route path="payment-accounts" element={<AdminPaymentAccountsPage />} />
                <Route path="application-requests" element={<HrApplicationRequestPage />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute requiredRole={['Employee']}>
            <DashboardLayout>
              <Routes>
                <Route path="" element={<EmployeeDashboard />} />
                <Route path="attendance" element={<AttendanceHistoryScreen />} />
                <Route path="leave-requests" element={<EmployeeLeaveRequestForm />} />
                <Route path="profile/:id" element={<EmployeeProfileDetailPage />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Default route */}
      <Route
        path="/"
        element={isAuthenticated ? <AuthenticatedHomeRedirect /> : <Navigate to="/login" replace />}
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

// Heartbeat pinger: mark authenticated users as active every 15s
function Heartbeat() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const send = async () => {
      try {
        await employeeAPI.heartbeat();
      } catch (e) {
        // ignore
      }
    };

    send();
    const id = setInterval(send, 15000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  return null;
}

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Heartbeat />
          <LiveLocationTracker />
          <AppRoutes />
          {/* Toast Notifications */}
          <Toaster position="bottom-right" />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
