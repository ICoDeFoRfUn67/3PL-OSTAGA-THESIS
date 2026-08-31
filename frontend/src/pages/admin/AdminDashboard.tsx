import { useState, useMemo, useEffect } from 'react';
import { Card, Badge, LoadingSpinner, EmptyState } from '@/components/common';
import { useGetEmployees, useGetHubs } from '@/hooks/useQueries';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Search, X, User, Phone, Briefcase, Shield, Clock, Landmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HubsEmployeeChart from '@/components/HubsEmployeeChart';
import { EmployeeDocumentsCard } from '@/components/EmployeeDocumentsCard';
import { Sidebar } from '@/components/Sidebar';
import { MobileAdminDashboardView } from './MobileAdminDashboardView';
import { AdminDashboardOverview } from '@/components/AdminDashboardOverview';


const FitBoundsComponent = ({
  mapHubs,
  getCoords,
}: {
  mapHubs: any[];
  getCoords: (hub: any) => [number, number];
}) => {
  const map = useMap();

  useEffect(() => {
    if (!mapHubs?.length) return;

    const bounds = L.latLngBounds(
      mapHubs.map((hub) => getCoords(hub))
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
      });
    }
  }, [map, mapHubs, getCoords]);

  return null;
};

const philippinesCityCoords: Record<
  string,
  [number, number]
> = {
  manila: [14.5995, 120.9842],
  quezon: [14.6760, 121.0437],
  makati: [14.5547, 121.0244],
  pasig: [14.5764, 121.0851],
  taguig: [14.5176, 121.0509],
  cebu: [10.3157, 123.8854],
  davao: [7.1907, 125.4553],
  laguna: [14.1407, 121.4692],
  batangas: [13.7565, 121.0583],
  pampanga: [15.0794, 120.6200],
  cavite: [14.2456, 120.8786],
  bulacan: [14.7942, 120.8799],
  rizal: [14.6037, 121.3084],
  iloilo: [10.7202, 122.5621],
  bacolod: [10.6765, 122.9509],
  cagayan: [17.6132, 121.7269],
  palawan: [9.8349, 118.7384],
  albay: [13.1775, 123.5280],
  leyte: [11.2449, 124.9912],
};

/**
 * GET ACCURATE COORDS
 */
const getHubCoordinates = (
  hub: any
): [number, number] => {
  /**
   * PRIORITIZE REAL DATABASE COORDS
   */
  if (
    hub.latitude &&
    hub.longitude &&
    !isNaN(hub.latitude) &&
    !isNaN(hub.longitude)
  ) {
    return [
      Number(hub.latitude),
      Number(hub.longitude),
    ];
  }

  /**
   * FALLBACK TO CITY MATCHING
   */
  const city =
    (
      hub.city ||
      hub.location ||
      ''
    ).toLowerCase();

  for (const [key, coords] of Object.entries(
    philippinesCityCoords
  )) {
    if (city.includes(key)) {
      return coords;
    }
  }

  /**
   * DEFAULT PHILIPPINES CENTER
   */
  return [12.8797, 121.774];
};












const STATUS_COLORS: Record<string, string> = {
  'Active': '#22C55E',      
  'AWOL': '#F97316',        
  'Blacklist': '#EF4444',   
  'Resign': '#9CA3AF',      
};

const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
  'Full-time': '#1E40AF',
  'Full time': '#1E40AF',
  OCW: '#3B82F6',
};

// Tailwind class fallbacks for colors (avoid inline styles)
const STATUS_TW_CLASSES: Record<string, string> = {
  'Active': 'text-green-500',
  'AWOL': 'text-orange-500',
  'Blacklist': 'text-red-500',
  'Resign': 'text-gray-400',
};

// (STATUS_BG_TW_CLASSES removed — not used)

export const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { employee, isHR, isAdmin, canEditEmployeeInfo } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHubTerm, setSearchHubTerm] = useState('');
  const [hubFilter] = useState<number | null>(null);
  const [searchLocationTerm, setSearchLocationTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeesPage, setEmployeesPage] = useState(1);

  const hubIcon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `
        <div
          style="
            width:18px;
            height:18px;
            background:#10b981;
            border-radius:999px;
            border:3px solid white;
            box-shadow:
              0 0 0 4px rgba(16,185,129,.25),
              0 0 14px rgba(16,185,129,.85);
          "
        ></div>
        `,
        iconSize: [18, 18],
      }),
    []
  );

  const formatSelectedEmployeeAddress = (emp: any) => {
    if (!emp) return 'N/A';
    const parts = [
      emp.barangay,
      emp.city_municipality,
      emp.province,
      emp.region,
      emp.zip_code ? `ZIP: ${emp.zip_code}` : ''
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'N/A';
  };


  // Fetch data — avoid sending null hub_id; dashboard does not need attendance/logs upfront
  const employeesQuery = useGetEmployees(hubFilter ? { hub_id: hubFilter } : undefined);
  const hubsQuery = useGetHubs();

  const hubsLoading = hubsQuery.isLoading;
  const employeesLoading = employeesQuery.isLoading;
  const employeesError = employeesQuery.isError;



// Process data
  const managedHubIds = useMemo(() => {
    if (!isHR || !employee?.hr_permissions?.managed_hubs) return null;
    return employee.hr_permissions.managed_hubs.map((h: any) => typeof h === 'number' ? h : h.id);
  }, [isHR, employee]);

  const hubs = useMemo(() => {
    let rawHubs = normalizeApiResponse(hubsQuery.data);
    if (isHR && managedHubIds) {
      rawHubs = rawHubs.filter((hub: any) => managedHubIds.includes(hub.id));
    }
    return rawHubs;
  }, [hubsQuery.data, isHR, managedHubIds]);

  const allEmployees = useMemo(() => {
    let raw = normalizeApiResponse(employeesQuery.data);
    if (isHR && managedHubIds) {
      raw = raw.filter((emp: any) => {
         const hubId = typeof emp.hub === 'object' ? emp.hub?.id : emp.hub;
         return managedHubIds.includes(hubId);
      });
    }
    return raw;
  }, [employeesQuery.data, isHR, managedHubIds]);

  const totalEmployees = allEmployees.length;

  const employees = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter((emp: any) => {
      const name = String(emp.full_name || `${emp.firstname || ''} ${emp.lastname || ''}`).toLowerCase();
      const empId = String(emp.employee_id || '').toLowerCase();
      return name.includes(q) || empId.includes(q);
    });
  }, [allEmployees, searchTerm]);

  useEffect(() => {
    setEmployeesPage(1);
  }, [searchTerm]);

  const itemsPerPage = 10;
  const totalEmployeesPages = Math.ceil(employees.length / itemsPerPage);
  const paginatedEmployees = useMemo(() => {
    const start = (employeesPage - 1) * itemsPerPage;
    return employees.slice(start, start + itemsPerPage);
  }, [employees, employeesPage]);

  // Employment type distribution
  const employmentTypeData = useMemo(() => {
    const types = {} as Record<string, number>;
    allEmployees.forEach((emp: any) => {
      types[emp.employment_type] = (types[emp.employment_type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [allEmployees]);

  // Employee status distribution
  const statusData = useMemo(() => {
    const statuses = {} as Record<string, number>;
    const normalize = (s: any) => {
      const st = String(s || 'Active').trim().toLowerCase();
      switch (st) {
        case 'active':
          return 'Active';
        case 'awol':
          return 'AWOL';
        case 'blacklist':
          return 'Blacklist';
        case 'resign':
          return 'Resign';
        default:
          return 'Active';
      }
    };
    allEmployees.forEach((emp: any) => {
      const key = normalize(emp.status);
      statuses[key] = (statuses[key] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [allEmployees]);

  // Hub-specific employee distribution with status breakdown (normalized keys)
  const hubEmployeeData = useMemo(() => {
    type HubStatuses = {
      active: number;
      awol: number;
      blacklist: number;
      resign: number;
    };

    const hubMap: Record<string, HubStatuses> = {};

    allEmployees.forEach((emp: any) => {
      const hubName = emp.hub_name || 'Unknown Hub';
      if (!hubMap[hubName]) {
        hubMap[hubName] = { active: 0, awol: 0, blacklist: 0, resign: 0 };
      }
      const st = String(emp.status || 'Active').trim().toLowerCase();
      if (st === 'inactive') return;
      if (st === 'active') hubMap[hubName].active += 1;
      else if (st === 'awol') hubMap[hubName].awol += 1;
      else if (st === 'blacklist') hubMap[hubName].blacklist += 1;
      else if (st === 'resign') hubMap[hubName].resign += 1;
      else hubMap[hubName].active += 1;
    });

    return Object.entries(hubMap).map(([name, statuses]) => ({
      name,
      active: statuses.active || 0,
      awol: statuses.awol || 0,
      blacklist: statuses.blacklist || 0,
      resign: statuses.resign || 0,
    }));
  }, [allEmployees]);





  if (hubsLoading && employeesLoading) {
    return (
      <div className="p-6 lg:ml-64 flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      {/* --- MOBILE UI --- */}
      <div className="block md:hidden">
        <MobileAdminDashboardView 
           employees={employees}
           hubs={hubs}
           allEmployees={allEmployees}
           totalEmployees={totalEmployees}
           statusData={statusData}
           employmentTypeData={employmentTypeData}
           hubEmployeeData={hubEmployeeData}
           searchTerm={searchTerm}
           setSearchTerm={setSearchTerm}
           searchHubTerm={searchHubTerm}
           setSearchHubTerm={setSearchHubTerm}
           searchLocationTerm={searchLocationTerm}
           setSearchLocationTerm={setSearchLocationTerm}
           selectedEmployee={selectedEmployee}
           setSelectedEmployee={setSelectedEmployee}
           showEmployeeModal={showEmployeeModal}
           setShowEmployeeModal={setShowEmployeeModal}
        />
      </div>

      {/* --- DESKTOP UI --- */}
      <div className="hidden md:block min-h-screen bg-gray-50 dark:bg-dark-bg">

  {/* DESKTOP SIDEBAR ONLY */}
  <div className="hidden lg:block">
    <Sidebar
      open={sidebarOpen}
      onToggle={() => setSidebarOpen(!sidebarOpen)}
    />
  </div>

    <div className="p-4 lg:p-6 lg:ml-64 space-y-4 pb-20 lg:pb-6 pt-6 lg:pt-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-gray-700 dark:text-gray-400 text-sm">
            {employee?.role === 'HR'
              ? '3PL BUSINESS SOLUTIONS | HR overview'
              : '3PL BUSINESS SOLUTIONS | Admin overview'}
          </p>
        </div>
        
      </div>

      <AdminDashboardOverview />

        {/* Hub Employee Distribution – full width */}
        <Card className="p-4 md:p-5 overflow-hidden w-full">
          <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-3">Delivery Center Employee Distribution</h2>

          <div className="flex items-center gap-5 mb-4 flex-wrap">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#22C55E]"></div><span className="text-xs text-gray-800 dark:text-gray-400">Active</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#F59E0B]"></div><span className="text-xs text-gray-800 dark:text-gray-400">AWOL</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#6B7280]"></div><span className="text-xs text-gray-800 dark:text-gray-400">Resign</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#EF4444]"></div><span className="text-xs text-gray-800 dark:text-gray-400">Blacklist</span></div>
          </div>

          <div className="min-h-[250px] w-full overflow-x-auto thin-scrollbar pb-2">
            {hubEmployeeData.length > 0 && allEmployees.length > 0 ? (
              <HubsEmployeeChart hubsData={hubs} employees={allEmployees} />
            ) : (
              <EmptyState title="No delivery center data" />
            )}
          </div>

          {hubEmployeeData.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-300 dark:border-gray-700">
                <div className="flex gap-0.5 items-end h-3.5">
                  <div className="w-1 h-2 bg-gray-400 dark:bg-gray-500 rounded-sm"></div>
                  <div className="w-1 h-3.5 bg-gray-600 dark:bg-gray-300 rounded-sm"></div>
                  <div className="w-1 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-sm"></div>
                </div>
              </div>
              <p className="text-xs text-gray-800 dark:text-gray-400">
                <span className="text-gray-905 dark:text-white font-medium">
                  {hubEmployeeData.reduce((prev: any, current: any) => (prev.active > current.active) ? prev : current).name} Delivery Center
                </span> has the highest number of active employees.
              </p>
            </div>
          )}
        </Card>

        {/* Hub Locations Map – full width, below distribution */}
        <Card className="p-4 md:p-5 min-h-[220px] md:min-h-[400px] w-full">
  {/* HEADER */}
  <div
    className="
      relative
      z-[1001]

      flex
      items-center
      justify-between

      px-4
      py-3

      border-b
      border-gray-200
      dark:border-gray-800

      bg-white/90
      dark:bg-[#111827]/90

      backdrop-blur-xl
    "
  >
    {/* TITLE */}
    <div>
      <h2
        className="
          text-sm
          md:text-lg

          font-semibold

          text-gray-900
          dark:text-white
          font-bold
        "
      >
        Delivery Center Locations
      </h2>

      <p
        className="
          text-[10px]
          md:text-xs

          text-gray-600
          dark:text-gray-400
        "
      >
        Live delivery center overview
      </p>
    </div>

    {/* SEARCH */}
    <div className="relative w-32 md:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
      <input
        type="text"
        placeholder="Search delivery center..."
        value={searchLocationTerm}
        onChange={(e) => setSearchLocationTerm(e.target.value)}
        className="w-full h-9 md:h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none transition-colors duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
        aria-label="Search delivery centers"
      />
    </div>
  </div>

  {/* MAP */}
  <div
    className="
      relative
      flex-1

      h-[240px]
      md:h-[320px]
      lg:h-[350px]

      overflow-hidden
    "
  >
    {/* CLEAN OVERLAY */}
    <div
      className="
        absolute
        inset-0

        bg-gradient-to-t
        from-white/5
        via-transparent
        to-transparent

        z-[400]

        pointer-events-none
      "
    />

    <MapContainer
      center={[14.5995, 120.9842]}
      zoom={6}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* OPENSTREETMAP - Same as Delivery Centers */}
      <TileLayer
        attribution=""
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* AUTO FIT */}
      <FitBoundsComponent
        mapHubs={hubs}
        getCoords={getHubCoordinates}
      />

      {hubs
        .filter((hub: any) => {
          const q = searchLocationTerm.toLowerCase();
          return (
            !q ||
            hub.name?.toLowerCase().includes(q) ||
            hub.location?.toLowerCase().includes(q) ||
            hub.city?.toLowerCase().includes(q)
          );
        })
        .map((hub: any) => {
          const [lat, lng] = getHubCoordinates(hub);
          return (
            <Marker
              key={hub.id}
              position={[lat, lng]}
              icon={hubIcon}
            />
          );
        })}
    </MapContainer>
  </div>
</Card>

      {/* Employees Table */}
      <Card className="p-4 md:p-5 overflow-hidden">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">Employees</h2>
            <div className="relative w-40 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 md:h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"
                aria-label="Search employees"
              />
            </div>
          </div>

          {employeesLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : employeesError ? (
            <EmptyState title="Could not load employees" description="Please refresh the page or try again in a moment." />
          ) : employees.length > 0 ? (
            <>
            <div className="overflow-x-auto rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[500px] text-xs md:text-sm">
                <thead className="bg-red-700 text-white">
                  <tr>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left font-medium">Name</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left font-medium">Position</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left font-medium">Hub</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left font-medium">Status</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((emp: any) => (
                    <tr key={emp.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-gray-900 dark:text-white">{emp.full_name}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-gray-700 dark:text-gray-300">{emp.position}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-gray-700 dark:text-gray-300">{emp.hub_name || 'N/A'}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <Badge variant={emp.status === 'Active' ? 'success' : 'warning'} className="text-xs px-2 py-1">
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                        <button 
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setShowEmployeeModal(true);
                          }}
                          className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/30 transition-colors font-medium shadow-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalEmployeesPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6 mb-2">
                <button
                  onClick={() => setEmployeesPage(Math.max(1, employeesPage - 1))}
                  disabled={employeesPage === 1}
                  className="h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {employeesPage}
                  </span>
                  <span>of</span>
                  <span>{totalEmployeesPages}</span>
                </div>
                <button
                  onClick={() => setEmployeesPage(Math.min(totalEmployeesPages, employeesPage + 1))}
                  disabled={employeesPage === totalEmployeesPages || totalEmployeesPages === 0}
                  className="h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
            </>
          ) : (
            <EmptyState title="No employees found" />
          )}
        </div>
      </Card>

      {/* Hubs Table */}
      <Card className="p-4 md:p-5 overflow-hidden">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">Hubs</h2>
            <div className="relative w-32 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input 
                type="text" 
                placeholder="Search hubs..." 
                value={searchHubTerm}
                onChange={(e) => setSearchHubTerm(e.target.value)}
                className="w-full h-9 md:h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"
              />
            </div>
          </div>

          {hubs.length > 0 ? (
            <div className="overflow-x-auto rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[400px] text-xs md:text-sm">
                <thead className="bg-red-700 text-white">
                  <tr>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left font-medium">Hub Name</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left font-medium">Location</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-center font-medium">Employees</th>
                  </tr>
                </thead>
                <tbody>
                  {hubs
                    .filter((hub: any) =>
                      !searchHubTerm ||
                      hub.name?.toLowerCase().includes(searchHubTerm.toLowerCase()) ||
                      hub.location?.toLowerCase().includes(searchHubTerm.toLowerCase()) ||
                      hub.city?.toLowerCase().includes(searchHubTerm.toLowerCase())
                    )
                    .map((hub: any) => {
                      const hubEmployeeCount = allEmployees.filter((emp: any) => emp.hub === hub.id).length;
                      return (
                        <tr key={hub.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-gray-900 dark:text-white">{hub.name}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-gray-700 dark:text-gray-300">{hub.location || hub.city || 'N/A'}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-700 text-center">{hubEmployeeCount}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No hubs found" />
          )}
        </div>
      </Card>

    </div> {/* closes p-4 lg:p-6 lg:ml-64 space-y-6 pb-20 lg:pb-6 */}
  </div> {/* closes hidden md:block min-h-screen bg-gray-50 dark:bg-dark-bg */}

      {/* Employee Details Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowEmployeeModal(false)}>
          
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative z-[50000] border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            
            {/* Header Banner */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-red-800 to-red-650 p-6 md:p-8 text-white">
              {/* Abstract decorative graphic */}
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-red-900/40 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                <div className="relative shrink-0">
                  {selectedEmployee.profile_image ? (
                    <img 
                      src={selectedEmployee.profile_image} 
                      alt={selectedEmployee.full_name}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-white/10 border-4 border-white/20 shadow-xl flex items-center justify-center text-4xl font-extrabold text-white">
                      {selectedEmployee.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md text-white border-2 border-red-800 ${
                    selectedEmployee.status?.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-amber-500'
                  }`}>
                    {selectedEmployee.status}
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left mt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">{selectedEmployee.full_name}</h2>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-red-100 border border-white/10">
                      ID: {selectedEmployee.employee_id || 'N/A'}
                    </span>
                  </div>
                  <p className="text-red-100/90 font-medium text-sm md:text-base mb-3">
                    {selectedEmployee.position} &bull; {selectedEmployee.hub_name || 'No Hub Assigned'}
                  </p>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-black/15 text-white/95 font-semibold">
                      {selectedEmployee.employment_type || 'N/A'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-black/15 text-white/95 font-semibold">
                      Role: {selectedEmployee.role || 'N/A'}
                    </span>
                    {selectedEmployee.jtp_code && (
                      <span className="px-2.5 py-1 rounded-lg bg-black/15 text-white/95 font-semibold">
                        JTP: {selectedEmployee.jtp_code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Top Right Close Button */}
                <button 
                  onClick={() => setShowEmployeeModal(false)}
                  className="absolute top-[-10px] right-[-10px] sm:static sm:self-start bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white p-2 rounded-xl transition-all"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6 bg-gray-50 dark:bg-gray-950/60 overflow-y-auto flex-1">
              {/* Row 1: Personal Info & Employment Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Personal Information */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <User size={18} className="text-red-600 dark:text-red-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-white">Personal Info</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">First Name</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.firstname || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Last Name</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.lastname || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Middle Initial</p>
                      <p className="text-sm font-semibold text-gray-905 dark:text-white">{selectedEmployee.middle_initial || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Gender</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Date of Birth</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.date_of_birth || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Place of Birth</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.place_of_birth || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nationality</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.nationality || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Marital Status</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.marital_status || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <Briefcase size={18} className="text-red-600 dark:text-red-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-white">Employment Info</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Position</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.position || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Employment Type</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.employment_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Delivery Center</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.hub_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Hired Date</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.hired_date || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Employee ID</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.employee_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">JTP Code</p>
                      <p className="text-sm font-semibold text-gray-905 dark:text-white">{selectedEmployee.jtp_code || 'N/A'}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 2: Contact Info & Permissions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Contact Information */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <Phone size={18} className="text-red-600 dark:text-red-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-white">Contact Info</h3>
                  </div>
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Email Address</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white break-all">{selectedEmployee.email_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Phone Number</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.phone_number || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Address</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{formatSelectedEmployeeAddress(selectedEmployee)}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Emergency Contact Name</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.emergency_contact_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Emergency Contact Phone</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.emergency_contact_phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2 of Row 2: Permissions & clock in */}
                <div className="space-y-6">
                  {/* Permissions & System Info */}
                  <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <Shield size={18} className="text-red-600 dark:text-red-500" />
                      <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-white">Permissions & System Info</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Can Login</p>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                          selectedEmployee.can_login 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                          {selectedEmployee.can_login ? 'Allowed' : 'Denied'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Can Edit Info</p>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                          selectedEmployee.can_edit_info 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                          {selectedEmployee.can_edit_info ? 'Allowed' : 'Denied'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Is Active</p>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                          selectedEmployee.is_active 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                          {selectedEmployee.is_active ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 text-xs">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Created At</p>
                        <p className="font-semibold text-gray-850 dark:text-white">{selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Updated At</p>
                        <p className="font-semibold text-gray-850 dark:text-white">{selectedEmployee.updated_at ? new Date(selectedEmployee.updated_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Info */}
                  {selectedEmployee.latest_clock_in_out && (
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <Clock size={18} className="text-red-600 dark:text-red-500" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-white">Latest Clock In/Out</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Clock In Time</p>
                          <p className="text-sm font-semibold text-gray-850 dark:text-white">{selectedEmployee.latest_clock_in_out.clock_in || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Clock Out Time</p>
                          <p className="text-sm font-semibold text-gray-850 dark:text-white">{selectedEmployee.latest_clock_in_out.clock_out || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Row 3: Government IDs & Documents */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Government IDs */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <Landmark size={18} className="text-red-600 dark:text-red-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-white">Government IDs</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">TIN</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.tin || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">SSS</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.sss || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">PhilHealth</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.philhealth || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">PAG-IBIG</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.pagibig || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <EmployeeDocumentsCard employeeId={selectedEmployee.id} readOnly />

              </div>  </div>

          </div>
        </div>
            )}

    </>
  );
};
