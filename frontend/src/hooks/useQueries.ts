import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI, employeeAPI, hubAPI, attendanceAPI, payrollAPI, editRequestAPI, leaveRequestAPI, activityLogAPI, securityAlertAPI, documentAPI, dashboardAPI, paymentAccountAPI, liveLocationAPI } from '@/api/apiService';
import { QUERY_KEYS } from '@/constants/api';

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      return authAPI.login(username, password);
    },
  });
};

export const useGetCurrentUser = () => {
  return useQuery({
    queryKey: QUERY_KEYS.CURRENT_USER,
    queryFn: () => authAPI.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Employee hooks
export const useGetEmployees = (params?: Record<string, any>, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EMPLOYEES, params],
    queryFn: () => employeeAPI.getEmployees(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
};

export const useGetEmployee = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE(id),
    queryFn: () => employeeAPI.getEmployee(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => employeeAPI.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
    },
  });
};

export const useUpdateEmployee = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => employeeAPI.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE(id) });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeAPI.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
    },
  });
};

export const useBulkToggleLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeIds, canLogin }: { employeeIds: number[]; canLogin: boolean }) => 
      employeeAPI.bulkToggleLogin(employeeIds, canLogin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
    },
  });
};

// Hub hooks
export const useGetHubs = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.HUBS, params],
    queryFn: () => hubAPI.getHubs(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetHub = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.HUB(id),
    queryFn: () => hubAPI.getHub(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateHub = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => hubAPI.createHub(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HUBS] });
    },
  });
};

export const useDeleteHub = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => hubAPI.deleteHub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HUBS] });
    },
  });
};

export const useUpdateHub = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => hubAPI.updateHub({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HUBS] });
    },
  });
};

// Attendance hooks
export const useGetAttendance = (params?: Record<string, any>) => {
  const isEnabled = !params || !('employee_id' in params) || (
    params.employee_id !== undefined && 
    params.employee_id !== 'undefined' && 
    params.employee_id !== null && 
    !Number.isNaN(Number(params.employee_id))
  );
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE, params],
    queryFn: () => attendanceAPI.getAttendance(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: isEnabled,
  });
};

export const useGetAttendanceSummary = (params?: Record<string, any>) => {
  const isEnabled = !params || !('employee_id' in params) || (
    params.employee_id !== undefined && 
    params.employee_id !== 'undefined' && 
    params.employee_id !== null && 
    !Number.isNaN(Number(params.employee_id))
  );
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE_SUMMARY, params],
    queryFn: () => attendanceAPI.getAttendanceSummary(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: isEnabled,
  });
};

export const useClockIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => attendanceAPI.clockIn(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ATTENDANCE });
    },
  });
};

export const useClockOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => attendanceAPI.clockOut(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ATTENDANCE });
    },
  });
};

// Payroll hooks
export const useGetPayroll = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PAYROLL, params],
    queryFn: () => payrollAPI.getPayroll(params),
    staleTime: 10 * 60 * 1000, // 10 minutes – payroll data changes infrequently
  });
};

export const useUpdatePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, any> }) =>
      payrollAPI.updatePayroll(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYROLL });
    },
  });
};

export const useCreatePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => payrollAPI.createPayroll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYROLL });
    },
  });
};

// Leave Request hooks
export const useGetLeaveRequests = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.LEAVE_REQUESTS, params],
    queryFn: () => leaveRequestAPI.getLeaveRequests(params),
    staleTime: 1 * 60 * 1000,
  });
};

export const useApproveLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      leaveRequestAPI.approveRequest(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEAVE_REQUESTS });
    },
  });
};

export const useRejectLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      leaveRequestAPI.rejectRequest(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEAVE_REQUESTS });
    },
  });
};

export const useClearAllLeaveRequests = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveRequestAPI.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEAVE_REQUESTS });
    },
  });
};

// Edit Request hooks
export const useGetEditRequests = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EDIT_REQUESTS, params],
    queryFn: () => editRequestAPI.getEditRequests(params),
    staleTime: 1 * 60 * 1000,
  });
};

export const useCreateEditRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => editRequestAPI.createEditRequest(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EDIT_REQUESTS });
    },
  });
};

export const useApproveEditRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => editRequestAPI.approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EDIT_REQUESTS });
    },
  });
};

export const useRejectEditRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: number | { id: number; notes?: string }) => {
      if (typeof payload === 'number') return editRequestAPI.rejectRequest(payload);
      return editRequestAPI.rejectRequest(payload.id, { notes: payload.notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EDIT_REQUESTS });
    },
  });
};

export const useClearAllEditRequests = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => editRequestAPI.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EDIT_REQUESTS });
    },
  });
};

// Activity Log hooks
export const useGetActivityLogs = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ACTIVITY_LOGS, params],
    queryFn: () => activityLogAPI.getActivityLogs(params),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Reduced from 5s → 30s to prevent server overload
  });
};

export const useClearAllActivityLogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => activityLogAPI.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACTIVITY_LOGS });
    },
  });
};

// Security Alert hooks
export const useGetSecurityAlerts = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SECURITY_ALERTS, params],
    queryFn: () => securityAlertAPI.getSecurityAlerts(params),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Reduced from 5s → 30s to prevent server overload
  });
};

export const useClearAllSecurityAlerts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => securityAlertAPI.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SECURITY_ALERTS });
    },
  });
};

/* =========================
   DOCUMENT HOOKS
========================= */
export const useGetDocuments = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.DOCUMENTS, params],
    queryFn: () => documentAPI.getDocuments(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, file, fileName, documentType }: { employeeId: number; file: File; fileName: string; documentType?: string }) =>
      documentAPI.uploadDocument(employeeId, file, fileName, documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CURRENT_USER });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentAPI.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CURRENT_USER });
    },
    onError: (err: any) => {
      if (err?.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CURRENT_USER });
      }
    },
  });
};

// Dashboard Analytics hook
export const useGetDashboardAnalytics = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_ANALYTICS, params],
    queryFn: () => dashboardAPI.getAnalytics(params),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};

// Online employees hook — fast refresh for real-time presence
export const useGetOnlineEmployees = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EMPLOYEES_ONLINE, params],
    queryFn: () => employeeAPI.getOnlineEmployees(params),
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  });
};

// Top Employees by Hub hook
export const useGetTopEmployeesByHub = (hubId?: number | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TOP_EMPLOYEES_BY_HUB, hubId],
    queryFn: () => dashboardAPI.getTopEmployeesByHub(hubId ? { hub_id: hubId } : undefined),
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData,
  });
};

export const useApproveAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attendanceAPI.approveAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ATTENDANCE });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ATTENDANCE_SUMMARY });
    },
  });
};

export const useDisapproveAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attendanceAPI.disapproveAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ATTENDANCE });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ATTENDANCE_SUMMARY });
    },
  });
};

// ─── Payment Account Hooks ───────────────────────────────────────────────────

export const useGetPaymentAccounts = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.PAYMENT_ACCOUNTS, params],
    queryFn: () => paymentAccountAPI.getAll(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreatePaymentAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => paymentAccountAPI.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENT_ACCOUNTS });
    },
  });
};

export const useUpdatePaymentAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      paymentAccountAPI.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENT_ACCOUNTS });
    },
  });
};

export const useDeletePaymentAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => paymentAccountAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENT_ACCOUNTS });
    },
  });
};

// Live Location hooks
export const useGetLiveLocations = () => {
  return useQuery({
    queryKey: QUERY_KEYS.LIVE_LOCATIONS,
    queryFn: () => liveLocationAPI.getAll(),
    refetchInterval: 10000, // auto-refresh every 10 seconds
    staleTime: 5000,
  });
};

export const useUpdateLiveLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { latitude: number; longitude: number; employee?: number }) =>
      liveLocationAPI.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIVE_LOCATIONS });
    },
  });
};

