import { useState, useMemo, useEffect } from 'react';
import { Card, Badge, LoadingSpinner, EmptyState } from '@/components/common';
import { useGetEmployees, useGetHubs, useGetAttendance, useGetSecurityAlerts, useGetActivityLogs } from '@/hooks/useQueries';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Search, Eye, X, User, Phone, Briefcase, Shield, Clock, Landmark } from 'lucide-react';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HubsEmployeeChart from '@/components/HubsEmployeeChart';
import { Sidebar } from '@/components/Sidebar';
import { MobileAdminDashboardView } from './MobileAdminDashboardView';


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

export const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { employee } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHubTerm, setSearchHubTerm] = useState('');
  const [hubFilter] = useState<number | null>(null);
  const [searchLocationTerm, setSearchLocationTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedMapHub, setSelectedMapHub] = useState<any>(null);


  // Create beautiful custom SVG markers for Leaflet (remove ugly black shadows)
  const hubIcon = L.divIcon({
    className: 'custom-hub-marker',
    html: `
      <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
        <div class="absolute w-8 h-8 bg-red-500/30 rounded-full animate-ping"></div>
        <div class="relative w-7 h-7 bg-red-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });


  // Fetch data
  const employeesQuery = useGetEmployees({ hub_id: hubFilter });
  const hubsQuery = useGetHubs();
  useGetAttendance();
  useGetSecurityAlerts();
  useGetActivityLogs({ limit: 5 });

  // Loading state
  const isLoading = employeesQuery.isLoading || hubsQuery.isLoading;



// Process data
  const employees = useMemo(() => {
    const normalized = normalizeApiResponse(employeesQuery.data);
    return normalized.filter((emp: any) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employeesQuery.data, searchTerm]);

  const hubs = normalizeApiResponse(hubsQuery.data);

  // Calculate stats
  const allEmployees = normalizeApiResponse(employeesQuery.data);
  const totalEmployees = allEmployees.length;


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
    allEmployees.forEach((emp: any) => {
      statuses[emp.status] = (statuses[emp.status] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [allEmployees]);

  // Hub-specific employee distribution with status breakdown
  const hubEmployeeData = useMemo(() => {
    type HubStatuses = {
    Active: number;
    AWOL: number;
    Blacklist: number;
    Resign: number;
  };
  
  const hubMap: Record<string, HubStatuses> = {};
    
    allEmployees.forEach((emp: any) => {
      const hubName = emp.hub_name || 'Unknown Hub';
      if (!hubMap[hubName]) {
        hubMap[hubName] = { Active: 0, AWOL: 0, Blacklist: 0, Resign: 0 };
      }
      const status = emp.status || 'Active';
      if (status !== 'Inactive') {
        hubMap[hubName][status as keyof HubStatuses] =
        (hubMap[hubName][status as keyof HubStatuses] || 0) + 1;
      }
    });

    return Object.entries(hubMap)
      .map(([name, statuses]) => ({
        name: name.split(' ').slice(0, 3).join(' '),
        Active: statuses.Active || 0,
        AWOL: statuses.AWOL || 0,
        Blacklist: statuses.Blacklist || 0,
        Resign: statuses.Resign || 0,
      }));
  }, [allEmployees]);





  if (isLoading) {
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
           employee={employee}
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

    <div className="p-4 lg:p-6 lg:ml-64 space-y-6 pb-20 lg:pb-6 pt-6 lg:pt-8">
      {/* Header */}
      <div className="flex justify-between items-center mt-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {employee?.role === 'HR'
              ? '3PL BUSINESS SOLUTIONS | HR overview'
              : '3PL BUSINESS SOLUTIONS | Admin overview'}
          </p>
        </div>
        
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-6 lg:grid-cols-5 gap-2 md:gap-3">
        {/* Total Employees */}
                <Card className="col-span-3 lg:col-span-1 flex flex-col items-center justify-center p-4 md:p-6 h-full text-center">
          <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Employees</p>
          <p className="text-5xl md:text-6xl font-black text-red-700 dark:text-white mt-3 md:mt-4 leading-none text-center w-full">{totalEmployees}</p>
        </Card>

        {/* Total Hubs */}
                <Card className="col-span-3 lg:col-span-1 flex flex-col items-center justify-center p-4 md:p-6 h-full text-center">
          <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Hubs</p>
          <p className="text-5xl md:text-6xl font-black text-red-700 dark:text-white mt-3 md:mt-4 leading-none text-center w-full">{hubs.length}</p>
        </Card>

        {/* Employee Status Pie Chart with Percentages */}
        <Card className="col-span-2 lg:col-span-1 p-4">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium mb-2">Employee Status</p>
          {statusData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-between md:h-auto">
              <div className="w-full h-24 md:h-auto md:w-[60%] flex items-center justify-center">
                <ResponsiveContainer width="100%" height={100} className="md:h-[100px]">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#3B82F6'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-1 text-xs md:text-sm mt-2 md:mt-0 w-full md:w-auto px-2 md:px-0">
                {statusData.map((entry, index) => {
                  const total = statusData.reduce((sum, item) => sum + item.value, 0);
                  const percentage = Math.round((entry.value / total) * 100);
                  return (
                    <div key={index} className="flex items-center justify-between md:justify-start md:gap-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full" 
                          style={{ backgroundColor: STATUS_COLORS[entry.name] || '#3B82F6' }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white ml-2">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Card>

        {/* Employment Type Horizontal Bar */}
        <Card className="col-span-2 lg:col-span-1 p-4">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium mb-3">Employment Type</p>
          {employmentTypeData.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {employmentTypeData.map((entry, index) => {
                  const total = employmentTypeData.reduce((sum, d) => sum + d.value, 0);
                  const barPct = total ? (entry.value / total) * 100 : 0;
                  return (
                <div key={index} className="flex flex-col gap-1 md:gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">{entry.name}</span>
                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                      {entry.value} <span className="text-gray-400">({Math.round(barPct)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 md:h-6 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: EMPLOYMENT_TYPE_COLORS[entry.name] || '#3B82F6',
                        width: `${barPct}%`
                      }}
                    />
                  </div>
                </div>
              );
              })}
            </div>
          ) : null}
        </Card>

        {/* Workforce Status */}
                <Card className="col-span-2 lg:col-span-1 p-4">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium mb-3">Workforce Status</p>
          <div className="space-y-2 md:space-y-2 text-xs md:text-sm">
            {statusData.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                <span className="font-semibold text-sm md:text-lg" style={{ color: STATUS_COLORS[item.name] }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

        {/* Hub Locations Map & Hub Chart */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-2 md:gap-4">

            {/* HUB LOCATIONS MAP */}
        <Card className="p-4 md:p-6 min-h-[220px] md:min-h-[500px]">
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
        "
      >
        Hub Locations
      </h2>

      <p
        className="
          text-[10px]
          md:text-xs

          text-gray-500
          dark:text-gray-400
        "
      >
        Live hub overview
      </p>
    </div>

    {/* SEARCH */}
    <div className="relative w-32 md:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
      <input
        type="text"
        placeholder="Search hub..."
        value={searchLocationTerm}
        onChange={(e) => setSearchLocationTerm(e.target.value)}
        className="w-full h-9 md:h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none transition-colors duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
        aria-label="Search hubs"
      />
    </div>
  </div>

  {/* MAP */}
  <div
    className="
      relative
      flex-1

      h-[280px]
      md:h-[430px]

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
      center={[12.8797, 121.774]}
      zoom={6}
      zoomControl={false}
      attributionControl={false}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* LIGHT MAP */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {/* AUTO FIT */}
      <FitBoundsComponent
  mapHubs={hubs}
  getCoords={getHubCoordinates}
/>

      {hubs
        .filter((hub: any) => {
          const q =
            searchLocationTerm.toLowerCase();

          return (
            !q ||
            hub.name
              ?.toLowerCase()
              .includes(q) ||
            hub.location
              ?.toLowerCase()
              .includes(q) ||
            hub.city
              ?.toLowerCase()
              .includes(q)
          );
        })
        .map((hub: any) => {
          const [lat, lng] =
            getHubCoordinates(hub);

          /**
           * CLEANER SMALLER MARKER
           */
          const modernMarker = L.divIcon({
  className: 'custom-modern-marker',
  html: `
    <div
      style="
        position:relative;
        width:16px;
        height:16px;
      "
    >
      <div
        style="
          position:absolute;
          inset:0;
          border-radius:999px;
          background:#ef4444;
          border:3px solid white;
          box-shadow:
            0 0 0 4px rgba(239,68,68,0.15),
            0 4px 12px rgba(239,68,68,0.25);
        "
      ></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

          return (
            <Marker
              key={hub.id}
              position={[lat, lng]}
              icon={modernMarker}
              eventHandlers={{ click: () => setSelectedMapHub(hub) }}
            />
          );
        })}
    </MapContainer>
  </div>

  {/* MAP HUB DETAILS (Placed Below Map) */}
  {selectedMapHub && (
    <div className="bg-white dark:bg-[#0F172A] border-t border-gray-200 dark:border-gray-800 pt-4 pb-8 px-5 fade-in flex flex-col md:flex-row gap-4 items-start md:items-center justify-between z-10 relative">
      <div className="flex justify-between items-start w-full md:w-auto">
        <div>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            {selectedMapHub.name}
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {selectedMapHub.location || selectedMapHub.city}
          </p>
        </div>
        <button 
          onClick={() => setSelectedMapHub(null)}
          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-lg leading-none md:hidden ml-4"
        >
          &times;
        </button>
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3 border border-gray-100 dark:border-gray-800 w-full md:w-auto justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Employees</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {allEmployees.filter((emp: any) => emp.hub === selectedMapHub.id).length}
          </span>
        </div>
        
        <div className="hidden md:flex flex-col items-end gap-1 ml-2">
          <button 
            onClick={() => setSelectedMapHub(null)}
            className="text-gray-400 hover:text-red-500 text-xs font-medium bg-transparent px-2 py-1 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )}
</Card>
        

        {/* Hub Employee Distribution */}
        <Card className="p-4 md:p-6 overflow-hidden">
          <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4">Hub Employee Distribution</h2>

          {/* Fixed Legend */}
          <div className="flex items-center gap-5 mb-4 flex-wrap">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#22C55E]"></div><span className="text-xs text-gray-600 dark:text-gray-400">Active</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#F59E0B]"></div><span className="text-xs text-gray-600 dark:text-gray-400">AWOL</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#6B7280]"></div><span className="text-xs text-gray-600 dark:text-gray-400">Resign</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#EF4444]"></div><span className="text-xs text-gray-600 dark:text-gray-400">Blacklist</span></div>
          </div>

          <div className="min-h-[250px] w-full overflow-x-auto thin-scrollbar pb-2">
            {hubEmployeeData.length > 0 && allEmployees.length > 0 ? (
              <HubsEmployeeChart hubsData={hubs} employees={allEmployees} />
            ) : (
              <EmptyState title="No hub data" />
            )}
          </div>

          {/* Insight Box */}
          {hubEmployeeData.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-300 dark:border-gray-700">
                <div className="flex gap-0.5 items-end h-3.5">
                  <div className="w-1 h-2 bg-gray-400 dark:bg-gray-500 rounded-sm"></div>
                  <div className="w-1 h-3.5 bg-gray-600 dark:bg-gray-300 rounded-sm"></div>
                  <div className="w-1 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-sm"></div>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="text-gray-900 dark:text-white font-medium">{hubEmployeeData.reduce((prev: any, current: any) => (prev.Active > current.Active) ? prev : current).name} Hub</span> has the highest number of active employees.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Employees Table */}
      <Card className="p-4 md:p-6 overflow-hidden">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm md:text-lg font-semibold">Employees</h2>
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

          {employees.length > 0 ? (
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
                  {employees.slice(0, 10).map((emp: any) => (
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
          ) : (
            <EmptyState title="No employees found" />
          )}
        </div>
      </Card>

      {/* Hubs Table */}
      <Card className="p-4 md:p-6 overflow-hidden">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm md:text-lg font-semibold">Hubs</h2>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowEmployeeModal(false)}>
          
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative z-[9999] border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            
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

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 bg-gray-50 dark:bg-gray-950/60 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Column 1 */}
                <div className="space-y-6">
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
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.middle_initial || 'N/A'}</p>
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

                  {/* Contact Information */}
                  <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-200">
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
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Current Address</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.current_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Permanent Address</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.permanent_address || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-505 uppercase tracking-widest">Emergency Contact Name</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.emergency_contact_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest">Emergency Contact Phone</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.emergency_contact_phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-6">
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
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Hub</p>
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
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEmployee.jtp_code || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

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
                        <p className="font-semibold text-gray-800 dark:text-white">{selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Updated At</p>
                        <p className="font-semibold text-gray-800 dark:text-white">{selectedEmployee.updated_at ? new Date(selectedEmployee.updated_at).toLocaleDateString() : 'N/A'}</p>
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
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.latest_clock_in_out.clock_in || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Clock Out Time</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.latest_clock_in_out.clock_out || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
            )}

    </>
  );
};
