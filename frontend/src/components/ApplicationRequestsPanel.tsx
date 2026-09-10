import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  AlertCircle,
  Briefcase,
  X,
  FileText,
  Download,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Shield,
  Car,
  GraduationCap,
  History,
} from 'lucide-react';
import { LoadingSpinner, Badge } from '@/components/common';
import { Sidebar } from '@/components/Sidebar';
import AdminMobileProfile from '@/components/AdminMobileProfile';
import { apiUrl } from '@/constants/api';
import { useToast } from '@/hooks/useToast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentRecord {
  id: number;
  label: string;
  file: string;
  file_url: string;
  uploaded_at: string;
}

interface Applicant {
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  dob: string;
  gender: string;
  nationality: string;
  marital_status: string;
  place_of_birth: string;
  email: string;
  contact_number: string;
  current_address: string;
  permanent_address: string;
  emergency_name: string;
  emergency_number: string;
  emergency_relationship: string;
  tin: string;
  sss: string;
  philhealth: string;
  pagibig: string;
}

interface Application {
  id: number;
  reference_number: string;
  applicant: Applicant;
  position: string;
  employment_type: string;
  preferred_hub: string;
  preferred_start_date: string | null;
  driver_info: Record<string, string> | null;
  education: Record<string, string> | null;
  skills: string[] | null;
  employment_history: Record<string, string>[] | null;
  rejection_notes: string | null;
  status: 'Pending' | 'Under Review' | 'Interview' | 'Approved' | 'Rejected' | 'Withdrawn';
  applied_at: string;
  documents: DocumentRecord[];
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Under Review': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Pending: <Clock size={12} />,
  'Under Review': <Eye size={12} />,
  Interview: <UserCheck size={12} />,
  Approved: <CheckCircle size={12} />,
  Rejected: <XCircle size={12} />,
  Withdrawn: <AlertCircle size={12} />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {STATUS_ICON[status]}
      {status}
    </span>
  );
}

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return val;
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        <span className="text-[#8B0000] dark:text-red-400">{icon}</span>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2 mb-1.5">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200 break-words">{value || '—'}</span>
    </div>
  );
}

function ApplicationDetailModal({
  app,
  onClose,
  onAction,
  actionLoading,
}: {
  app: Application;
  onClose: () => void;
  onAction: (ref: string, action: string, notes?: string) => void;
  actionLoading: boolean;
}) {
  const [notes, setNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const fullName = [app.applicant.first_name, app.applicant.middle_name, app.applicant.last_name]
    .filter(Boolean)
    .join(' ');

  function doAction(action: string) {
    onAction(app.reference_number, action, notes);
    setConfirmAction(null);
  }

  const isRider =
    app.position?.toLowerCase().includes('rider') || app.position?.toLowerCase().includes('driver');

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 px-2 pb-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{fullName}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Ref: <span className="font-mono font-semibold">{app.reference_number}</span>
              {' · '}Applied {formatDate(app.applied_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={app.status} />
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-1 overflow-y-auto max-h-[75vh]">
          {/* Job Info */}
          <DetailSection icon={<Briefcase size={15} />} title="Job Information">
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="Position" value={app.position} />
              <InfoRow label="Employment Type" value={app.employment_type} />
              <InfoRow label="Preferred Hub" value={app.preferred_hub} />
              <InfoRow label="Preferred Start Date" value={formatDate(app.preferred_start_date)} />
            </div>
          </DetailSection>

          {/* Personal Info */}
          <DetailSection icon={<User size={15} />} title="Personal Information">
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow label="Date of Birth" value={formatDate(app.applicant.dob)} />
              <InfoRow label="Gender" value={app.applicant.gender} />
              <InfoRow label="Nationality" value={app.applicant.nationality} />
              <InfoRow label="Marital Status" value={app.applicant.marital_status} />
              <InfoRow label="Place of Birth" value={app.applicant.place_of_birth} />
            </div>
          </DetailSection>

          {/* Contact */}
          <DetailSection icon={<Phone size={15} />} title="Contact & Address">
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="Email" value={app.applicant.email} />
              <InfoRow label="Contact No." value={app.applicant.contact_number} />
              <InfoRow label="Current Address" value={app.applicant.current_address} />
              <InfoRow label="Permanent Address" value={app.applicant.permanent_address} />
              <InfoRow label="Emergency Contact" value={app.applicant.emergency_name} />
              <InfoRow label="Emergency No." value={app.applicant.emergency_number} />
              <InfoRow label="Relationship" value={app.applicant.emergency_relationship} />
            </div>
          </DetailSection>

          {/* Government IDs */}
          <DetailSection icon={<Shield size={15} />} title="Government IDs">
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="TIN" value={app.applicant.tin} />
              <InfoRow label="SSS" value={app.applicant.sss} />
              <InfoRow label="PhilHealth" value={app.applicant.philhealth} />
              <InfoRow label="Pag-IBIG" value={app.applicant.pagibig} />
            </div>
          </DetailSection>

          {/* Driver Info */}
          {isRider && app.driver_info && (
            <DetailSection icon={<Car size={15} />} title="Driver & Vehicle Info">
              <div className="grid grid-cols-2 gap-x-6">
                <InfoRow label="License No." value={app.driver_info.licenseNo} />
                <InfoRow label="License Type" value={app.driver_info.licenseType} />
                <InfoRow label="License Expiry" value={app.driver_info.licenseExpiry} />
                <InfoRow label="Plate No." value={app.driver_info.plateNo} />
                <InfoRow label="OR No." value={app.driver_info.orNo} />
                <InfoRow label="CR No." value={app.driver_info.crNo} />
              </div>
            </DetailSection>
          )}

          {/* Education */}
          {app.education && (
            <DetailSection icon={<GraduationCap size={15} />} title="Education">
              <div className="grid grid-cols-2 gap-x-6">
                <InfoRow label="Level" value={app.education.level} />
                <InfoRow label="School" value={app.education.school} />
                <InfoRow label="Course" value={app.education.course} />
                <InfoRow label="Year Graduated" value={app.education.yearGraduated} />
              </div>
            </DetailSection>
          )}

          {/* Skills */}
          {app.skills && app.skills.length > 0 && (
            <DetailSection icon={<CheckCircle size={15} />} title="Skills">
              <div className="flex flex-wrap gap-2">
                {app.skills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Employment History */}
          {app.employment_history && app.employment_history.length > 0 && (
            <DetailSection icon={<History size={15} />} title="Work Experience">
              <div className="space-y-3">
                {app.employment_history.map((job, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {job.position} {job.company ? `@ ${job.company}` : ''}
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                      {job.startDate} – {job.endDate || 'Present'} · {job.type}
                    </div>
                    {job.responsibilities && (
                      <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">{job.responsibilities}</div>
                    )}
                    {job.reason && (
                      <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">Reason for leaving: {job.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Documents */}
          {app.documents && app.documents.length > 0 && (
            <DetailSection icon={<FileText size={15} />} title="Uploaded Documents">
              <div className="space-y-2">
                {app.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <FileText size={14} className="text-gray-400" />
                      <span className="truncate max-w-[250px]">{doc.label || doc.file}</span>
                    </div>
                    <a
                      href={doc.file_url || doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 flex items-center gap-1 text-xs text-[#8B0000] dark:text-red-400 hover:underline font-medium"
                    >
                      <Download size={13} />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Rejection Notes */}
          {app.rejection_notes && (
            <div className="mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              <span className="font-medium">Notes: </span>{app.rejection_notes}
            </div>
          )}

          {/* Action Notes field */}
          <div className="mt-4">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 block">
              Notes (optional, shown when rejecting)
            </label>
            <textarea
              rows={2}
              placeholder="Add notes or reason..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex flex-wrap gap-2">
            {app.status !== 'Under Review' && (
              <button
                disabled={actionLoading}
                onClick={() => doAction('under_review')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Eye size={13} className="inline mr-1" />
                Under Review
              </button>
            )}
            {app.status !== 'Interview' && (
              <button
                disabled={actionLoading}
                onClick={() => doAction('interview')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <UserCheck size={13} className="inline mr-1" />
                Move to Interview
              </button>
            )}
            {app.status !== 'Approved' && (
              <button
                disabled={actionLoading}
                onClick={() => doAction('approve')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={13} className="inline mr-1" />
                Approve
              </button>
            )}
            {app.status !== 'Rejected' && (
              <button
                disabled={actionLoading}
                onClick={() => doAction('reject')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#8B0000] text-white hover:bg-red-800 transition-colors disabled:opacity-50"
              >
                <XCircle size={13} className="inline mr-1" />
                Reject
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const ALL_STATUSES = ['All', 'Pending', 'Under Review', 'Interview', 'Approved', 'Rejected'];
const ALL_POSITIONS = ['All', 'Courier', 'Rider', 'Warehouse Staff', 'Dispatcher'];

export const ApplicationRequestsPanel = () => {
  const { success, error: showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [positionFilter, setPositionFilter] = useState('All');

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchApplications = useCallback(
    async (overrideUrl?: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== 'All') params.set('status', statusFilter);
        if (positionFilter !== 'All') params.set('position', positionFilter);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());

        const url = overrideUrl ?? apiUrl(`admin/applications/?${params.toString()}`);

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();

        if (Array.isArray(data)) {
          setApplications(data);
          setNext(null);
          setPrevious(null);
          setCount(data.length);
          setStatusCounts({});
        } else {
          setApplications(data.results ?? []);
          setNext(data.next ?? null);
          setPrevious(data.previous ?? null);
          setCount(data.count ?? (data.results?.length ?? 0));
          if (data.status_counts) setStatusCounts(data.status_counts);
        }
      } catch (err) {
        showError('Failed to load applications');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, positionFilter, searchQuery]
  );

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleAction(ref: string, action: string, notes?: string) {
    try {
      setActionLoading(true);
      const res = await fetch(apiUrl(`admin/applications/${ref}/action/`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes: notes || '' }),
      });

      if (!res.ok) throw new Error('Action failed');

      const data = await res.json();
      success(data.message ?? 'Action applied successfully');

      // Refresh list and update selected
      fetchApplications();
      if (selectedApp?.reference_number === ref) {
        const updated = await fetch(apiUrl(`applications/${ref}/`), {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        if (updated.ok) setSelectedApp(await updated.json());
      }
    } catch {
      showError('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  }



  return (
    <>
      <div className="hidden lg:block">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>
      <AdminMobileProfile />

      <div className="lg:ml-64 p-4 md:p-6 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors pb-32 lg:pb-6">
        {/* Page Title — hidden on mobile (AdminMobileProfile provides the header) */}
        <div className="hidden md:block mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Application Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {count} submitted application{count !== 1 ? 's' : ''} from the Job Application Portal
          </p>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s
                  ? 'bg-[#8B0000] text-white border-[#8B0000] shadow'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#8B0000]/50'
              }`}
            >
              {s}{s !== 'All' ? ` (${statusCounts[s] ?? 0})` : ''}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, hub, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchApplications()}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/30"
            />
          </div>

          <div className="relative">
            <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/30 appearance-none cursor-pointer"
            >
              {ALL_POSITIONS.map((p) => (
                <option key={p} value={p}>{p === 'All' ? 'All Positions' : p}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={() => fetchApplications()}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#8B0000] text-white hover:bg-red-800 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <FileText size={48} className="mb-3 opacity-40" />
            <p className="text-base font-medium">No applications found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Applicant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                      Hub
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">
                      Date Applied
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {applications.map((app) => {
                    const fullName = [app.applicant?.first_name, app.applicant?.last_name].filter(Boolean).join(' ');
                    return (
                      <tr
                        key={app.reference_number}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{fullName}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{app.reference_number}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 md:hidden">{app.preferred_hub || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{app.position}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{app.preferred_hub || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">{app.employment_type || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">{formatDate(app.applied_at)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Eye size={12} />
                              View
                            </button>
                            {app.status === 'Pending' && (
                              <button
                                onClick={() => handleAction(app.reference_number, 'interview')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors"
                              >
                                <UserCheck size={12} />
                                Interview
                              </button>
                            )}
                            {app.status !== 'Approved' && (
                              <button
                                onClick={() => handleAction(app.reference_number, 'approve')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 transition-colors"
                              >
                                <CheckCircle size={12} />
                                Approve
                              </button>
                            )}
                            {app.status !== 'Rejected' && (
                              <button
                                onClick={() => handleAction(app.reference_number, 'reject')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors"
                              >
                                <XCircle size={12} />
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(next || previous) && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  disabled={!previous}
                  onClick={() => previous && fetchApplications(previous)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500">{count} total</span>
                <button
                  disabled={!next}
                  onClick={() => next && fetchApplications(next)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      )}
    </>
  );
};

export default ApplicationRequestsPanel;
