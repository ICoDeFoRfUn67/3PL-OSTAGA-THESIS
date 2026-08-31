import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Hub, Employee } from '@/types';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  hubsData?: Hub[];
  employees?: Employee[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-gray-800 dark:text-white mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: entry.fill }}
          />
          <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function HubsEmployeeChart({ hubsData = [], employees = [] }: Props) {
  const { isDarkMode } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const dataset = useMemo(() => {
    return hubsData.map((hub) => {
      const hubEmployees = employees.filter((emp) => {
        if (emp.hub == null) return false;
        if (typeof emp.hub === 'number') return emp.hub === hub.id;
        return (emp.hub as Hub).id === hub.id;
      });

      const countByStatus = (status: string) =>
        hubEmployees.filter((e) => ((e.status || '') as string).toLowerCase() === status).length;

      return {
        name: hub.name,
        Active: countByStatus('active'),
        AWOL: countByStatus('awol'),
        Resign: countByStatus('resign'),
        Blacklist: countByStatus('blacklist'),
      };
    });
  }, [hubsData, employees]);

  const filteredDataset = dataset.filter(
    (d) => d.Active || d.AWOL || d.Resign || d.Blacklist
  );

  if (!filteredDataset.length) {
    return (
      <div className="flex items-center justify-center p-10 text-sm text-gray-400 dark:text-gray-500">
        No employee data available
      </div>
    );
  }

  const axisColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const gridColor = isDarkMode ? '#374151' : '#E5E7EB';

  return (
    <div ref={containerRef} className="w-full overflow-x-auto overflow-y-hidden thin-scrollbar pb-2">
      <div style={{ minWidth: Math.max(filteredDataset.length * 160, 400) }}>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={filteredDataset}
            margin={{ top: 8, right: 16, left: 8, bottom: 60 }}
            barCategoryGap="25%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={70}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              label={{
                value: 'Employee Count',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fill: axisColor, fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: axisColor }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="Active" fill="#22C55E" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="AWOL" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Resign" fill="#6B7280" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Blacklist" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
