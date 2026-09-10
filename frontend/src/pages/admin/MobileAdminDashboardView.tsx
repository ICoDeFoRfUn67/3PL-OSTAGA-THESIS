import React, { useMemo } from 'react';
import { Card, EmptyState } from '@/components/common';
import { Search, MapPin, Users } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HubsEmployeeChart from '@/components/HubsEmployeeChart';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import AdminMobileProfile from '@/components/AdminMobileProfile';
import { AdminDashboardOverview } from '@/components/AdminDashboardOverview';


const getHubCoordinates = (hub: any): [number, number] => {
  if (hub.latitude && hub.longitude && !isNaN(hub.latitude) && !isNaN(hub.longitude)) {
    return [Number(hub.latitude), Number(hub.longitude)];
  }
  const city = (hub.city || hub.location || '').toLowerCase();
  const coords: Record<string, [number, number]> = {
    manila: [14.5995, 120.9842], cebu: [10.3157, 123.8854], davao: [7.1907, 125.4553],
    quezon: [14.6760, 121.0437], makati: [14.5547, 121.0244], lucena: [13.9314, 121.6172],
    candelaria: [13.9283, 121.4239],
  };
  for (const [key, val] of Object.entries(coords)) {
    if (city.includes(key)) return val;
  }
  return [12.8797, 121.774];
};

const FitBoundsComponent = ({ mapHubs, getCoords }: { mapHubs: any[], getCoords: (hub: any) => [number, number] }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!mapHubs?.length) return;
    const bounds = L.latLngBounds(mapHubs.map((hub) => getCoords(hub)));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, mapHubs, getCoords]);
  return null;
};

export const MobileAdminDashboardView = ({
  employees,
  hubs,
  allEmployees,
  totalEmployees,
  statusData,
  employmentTypeData,
  hubEmployeeData,
  searchTerm, setSearchTerm,
  searchHubTerm, setSearchHubTerm,
  searchLocationTerm, setSearchLocationTerm,
  setSelectedEmployee, setShowEmployeeModal
}: any) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const getStatusTextClass = (name: string) => {
    switch ((name || '').toLowerCase()) {
      case 'active':
        return 'text-[#22C55E]';
      case 'awol':
        return 'text-[#F97316]';
      case 'blacklist':
        return 'text-[#EF4444]';
      case 'resign':
        return 'text-[#9CA3AF]';
      default:
        return 'text-gray-400';
    }
  };

  const [showMapSearch, setShowMapSearch] = React.useState(false);

  
  const filteredHubs = React.useMemo(() => {
    return hubs.filter(
      (hub: any) =>
        !searchLocationTerm ||
        hub.name?.toLowerCase().includes(searchLocationTerm.toLowerCase()) ||
        hub.location?.toLowerCase().includes(searchLocationTerm.toLowerCase()) ||
        hub.city?.toLowerCase().includes(searchLocationTerm.toLowerCase())
    );
  }, [hubs, searchLocationTerm]);
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

  return (
    <div className={`min-h-screen pb-24 font-sans selection:bg-blue-500/30 ${isDarkMode ? 'bg-[#0B1120] text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* Top Header */}
      <AdminMobileProfile />

      <div className="px-4 space-y-4 mt-2">
        {/* Mobile page title removed — AdminMobileProfile provides the header */}
        
        {/* Full Dashboard Analytics & Charts (Complete Parity with Desktop Dashboard) */}
        <AdminDashboardOverview />


        {/* Map */}
        <Card className={`${isDarkMode ? 'bg-[#111827] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} overflow-hidden relative`}>
          <div className={`absolute top-0 left-0 right-0 z-[1000] flex justify-between items-center p-4 bg-gradient-to-b ${isDarkMode ? 'from-[#111827]' : 'from-white/95'} to-transparent pointer-events-none`}>
            {showMapSearch ? (
              <div className="flex items-center gap-2 w-full pointer-events-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    className={`${isDarkMode ? 'w-full bg-[#111827]/95 border border-gray-800 text-gray-300 placeholder-gray-500 focus:border-gray-700' : 'w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300'} rounded-full py-1.5 pl-8 pr-3 text-[10px] focus:outline-none`}
                    value={searchLocationTerm}
                    onChange={e => setSearchLocationTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => {
                    setShowMapSearch(false);
                    setSearchLocationTerm('');
                  }}
                  className={`text-[10px] font-semibold text-blue-400 px-2 py-1 ${isDarkMode ? 'bg-gray-800/80 border-gray-700 active:bg-gray-700' : 'bg-gray-100 border-gray-200 active:bg-gray-200'} rounded-md border transition-colors`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pointer-events-auto">
                  <div className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
                    <MapPin className={`w-4 h-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delivery Center Locations</h3>
                    <p className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Live delivery center overview</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMapSearch(true)}
                  title="Open search"
                  className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 active:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50 active:bg-gray-100'} flex items-center justify-center pointer-events-auto border transition-colors`}
                >
                  <Search className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </>
            )}
          </div>
          
          <div className={`h-[250px] w-full ${isDarkMode ? 'bg-[#0B1120]' : 'bg-gray-100'}`}>
            <MapContainer center={[14.5995, 120.9842]} zoom={6} style={{ width: '100%', height: '100%' }}>
              <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBoundsComponent mapHubs={filteredHubs} getCoords={getHubCoordinates} />
              {filteredHubs.map((hub: any) => {
                const [lat, lng] = getHubCoordinates(hub);
                return (
                  <Marker key={hub.id} position={[lat, lng]} icon={hubIcon} />
                );
              })}
            </MapContainer>
          </div>
      </Card>

        {/* Hub Employee Distribution Chart */}        <Card className={`${isDarkMode ? 'bg-[#111827] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} flex items-center justify-center border`}>
              <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delivery Center Employee Distribution</h3>
          </div>

          {/* Fixed Legend */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]"></div><span className="text-[10px] text-gray-400">Active</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]"></div><span className="text-[10px] text-gray-400">AWOL</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#6B7280]"></div><span className="text-[10px] text-gray-400">Resign</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]"></div><span className="text-[10px] text-gray-400">Blacklist</span></div>
          </div>
          
          <div className="h-[220px] w-full overflow-x-auto thin-scrollbar pb-2">
            {hubEmployeeData.length > 0 ? (
               <HubsEmployeeChart hubsData={hubs} employees={allEmployees} />
            ) : (
               <EmptyState title="No data" />
            )}
          </div>

          {/* Insight Box */}
          {hubEmployeeData.length > 0 && (
            <div className={`mt-2 p-3 rounded-lg border ${isDarkMode ? 'border-gray-800 bg-gray-800/30' : 'border-gray-200 bg-gray-55'} flex items-center gap-3 mt-4`}>
              <div className={`w-8 h-8 rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} flex items-center justify-center shrink-0 border`}>
                <div className="flex gap-0.5 items-end h-3.5">
                  <div className={`w-1 h-2 ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'} rounded-sm`}></div>
                  <div className={`w-1 h-3.5 ${isDarkMode ? 'bg-gray-300' : 'bg-gray-600'} rounded-sm`}></div>
                  <div className={`w-1 h-1.5 ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'} rounded-sm`}></div>
                </div>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-650'}`}>
                <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>
                  {hubEmployeeData.reduce((prev: any, current: any) => (prev.Active > current.Active) ? prev : current).name} Delivery Center
                </span> has the highest number of active employees.
              </p>
            </div>
          )}

        </Card>

        {/* Employees Table */}
        <Card className={`${isDarkMode ? 'bg-[#111827] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} overflow-hidden flex flex-col`}>
          <div className={`p-4 flex justify-between items-center border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-250'}`}>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Employees</h3>
            <div className="relative w-36">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input type="text" placeholder="Search employees..." className={`w-full ${isDarkMode ? 'bg-[#0B1120] border-gray-800 text-gray-300 focus:border-gray-700' : 'bg-white border-gray-200 text-gray-900 focus:border-gray-300'} border rounded-full py-1.5 pl-8 pr-3 text-[10px] placeholder-gray-500 focus:outline-none`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className={`${isDarkMode ? 'bg-gray-800/60 text-gray-300' : 'bg-gray-100 text-gray-600'} uppercase text-[9px] tracking-wider`}>
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Position</th>
                  <th className="px-4 py-2.5 font-medium">Delivery Center</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                {employees.slice(0, 10).map((emp: any) => (
                  <tr key={emp.id} className={`${isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-850'}`}>{emp.full_name}</td>
                    <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{emp.position}</td>
                    <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{emp.hub_name || 'N/A'}</td>
                    <td className={`px-4 py-3 font-semibold ${getStatusTextClass(emp.status)}`}>{emp.status}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => { setSelectedEmployee(emp); setShowEmployeeModal(true); }} className="px-3.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-semibold border border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-200">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`p-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} text-center`}>
            <button onClick={() => navigate('/admin/employees')} className={`text-[11px] ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>View all employees &gt;</button>
          </div>
        </Card>

        {/* Hubs Table */}
        <Card className={`${isDarkMode ? 'bg-[#111827] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} overflow-hidden flex flex-col mb-6`}>
          <div className={`p-4 flex justify-between items-center border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-250'}`}>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delivery Centers</h3>
            <div className="relative w-36">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input type="text" placeholder="Search delivery centers..." className={`w-full ${isDarkMode ? 'bg-[#0B1120] border-gray-800 text-gray-300 focus:border-gray-700' : 'bg-white border-gray-200 text-gray-900 focus:border-gray-300'} border rounded-full py-1.5 pl-8 pr-3 text-[10px] placeholder-gray-500 focus:outline-none`} value={searchHubTerm} onChange={e => setSearchHubTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className={`${isDarkMode ? 'bg-gray-800/60 text-gray-300' : 'bg-gray-100 text-gray-600'} uppercase text-[9px] tracking-wider`}>
                <tr>
                  <th className="px-4 py-2.5 font-medium">Delivery Center Name</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium text-center">Employees</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                {hubs
                  .filter((hub: any) =>
                    !searchHubTerm ||
                    hub.name?.toLowerCase().includes(searchHubTerm.toLowerCase()) ||
                    hub.location?.toLowerCase().includes(searchHubTerm.toLowerCase()) ||
                    hub.city?.toLowerCase().includes(searchHubTerm.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((hub: any) => {
                    const cnt = allEmployees.filter((emp: any) => emp.hub === hub.id).length;
                    return (
                      <tr key={hub.id} className={`${isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-850'}`}>{hub.name}</td>
                        <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{hub.location || hub.city || 'N/A'}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-500 text-center">{cnt}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          <div className={`p-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} text-center`}>
            <button onClick={() => navigate('/admin/hubs')} className={`text-[11px] ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>View all delivery centers &gt;</button>
          </div>
        </Card>

      </div>

    </div>
  );
};
