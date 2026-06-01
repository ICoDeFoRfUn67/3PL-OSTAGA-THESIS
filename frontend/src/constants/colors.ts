export const COLORS = {
  primary: '#C41E3A',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  darkBg: '#1F2937',
  cardBg: '#F3F4F6',
  lightBg: '#FFFFFF',
  darkCardBg: '#1E1E1E',
} as const;

export const STATUS_COLORS = {
  active: '#22C55E',
  resign: '#9CA3AF',
  inactive: '#9CA3AF',
  awol: '#F97316',
  blacklist: '#EF4444',
  present: '#22C55E',
  late: '#F97316',
  absent: '#EF4444',
  pending: '#3B82F6',
  approved: '#22C55E',
  rejected: '#EF4444',
} as const;

export const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
  'Regular': '#10B981',
  'Contractual': '#3B82F6',
  'Probationary': '#F59E0B',
  'Casual': '#8B5CF6',
} as const;

export const ROLE_COLORS: Record<string, string> = {
  'Admin': '#C41E3A',
  'HR': '#3B82F6',
  'Employee': '#10B981',
  'Manager': '#8B5CF6',
} as const;
