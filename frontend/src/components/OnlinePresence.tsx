import React, { useState, useEffect } from 'react';
import { employeeAPI } from '@/api/apiService';
import { Card } from './common';

const OnlinePresence: React.FC = () => {
  const [online, setOnline] = useState<any[]>([]);
  const [pulseIds, setPulseIds] = useState<Set<number>>(new Set());
  const intervalMs = 5000; // fixed 5s refresh
  const prevIdsRef = React.useRef<Set<number>>(new Set());

  const fetchOnline = async () => {
    try {
      const res = await employeeAPI.getOnlineEmployees();
      const list = res?.employees || [];
      setOnline(Array.isArray(list) ? list : []);

      const newIds = new Set<number>((list || []).map((e: any) => e.id));
      const prev = prevIdsRef.current;
      const newlyOnline: number[] = [];
      for (const id of newIds) if (!prev.has(id)) newlyOnline.push(id);

      if (newlyOnline.length) {
        setPulseIds((prevSet) => {
          const next = new Set(prevSet);
          newlyOnline.forEach((id) => next.add(id));
          return next;
        });
        setTimeout(() => {
          setPulseIds((prevSet) => {
            const next = new Set(prevSet);
            newlyOnline.forEach((id) => next.delete(id));
            return next;
          });
        }, 2500);
      }

      prevIdsRef.current = newIds;
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchOnline();
    const id = setInterval(fetchOnline, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  if (!online.length) return null;

  return (
    <div>
      <style>{`
        @keyframes online-pulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); } 70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
      `}</style>

      <div className="mb-4">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Online Now</div>
            <div className="text-xs text-gray-400">Auto-refresh: 5s</div>
          </div>

          <div className="w-full overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-3 py-2">
              {online.map((e: any) => {
                const isPulsing = pulseIds.has(e.id);
                return (
                  <div key={e.id} className="flex flex-col items-center text-center w-16">
                    <div className="relative w-12 h-12">
                      {e.profile_image ? (
                        <img src={e.profile_image} alt={e.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-teal-500 flex items-center justify-center text-white font-bold">{(e.firstname || '')[0]}{(e.lastname || '')[0]}</div>
                      )}

                      <span className="absolute right-0 bottom-0 inline-block w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
                      {isPulsing && (
                        <span className="absolute right-0 bottom-0 inline-block w-3 h-3 rounded-full bg-emerald-400 opacity-40 animate-pulse" />
                      )}
                    </div>

                    <div className="text-xs text-gray-700 dark:text-gray-200 truncate mt-1 max-w-[64px]">{e.full_name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OnlinePresence;
