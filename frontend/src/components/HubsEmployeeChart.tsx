import React, { useMemo, useRef, useState, useEffect } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { Hub, Employee } from '@/types';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  hubsData?: Hub[];
  employees?: Employee[];
}

export default function HubsEmployeeChart({ hubsData = [], employees = [] }: Props) {
  const { isDarkMode } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setContainerWidth(width);
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth || 800);

    return () => observer.disconnect();
  }, []);

  const dataset = useMemo(() => {
    return hubsData.map((hub) => {
      const hubEmployees = employees.filter(emp => {
        if (emp.hub == null) return false;
        if (typeof emp.hub === 'number') return emp.hub === hub.id;
        return (emp.hub as Hub).id === hub.id;
      });

      const countByStatus = (status: string) =>
        hubEmployees.filter(e => ((e.status || '') as string).toLowerCase() === status).length;

      return {
        product: hub.name,
        active: countByStatus('active'),
        awol: countByStatus('awol'),
        resign: countByStatus('resign'),
        blacklist: countByStatus('blacklist'),
      };
    });
  }, [hubsData, employees]);

  const filteredDataset = dataset.filter(
    d => d.active || d.awol || d.resign || d.blacklist
  );

  if (!filteredDataset.length) {
    return <div className="p-5">No employee data available</div>;
  }

  const textColor = isDarkMode ? '#F3F4F6' : '#374151';
  const gridColor = isDarkMode ? '#4B5563' : '#E5E7EB';

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const chartHeight = isMobile ? 220 : 380;
  const barsPerHub = 4;
  const minBarWidth = isMobile ? 56 : 90;
  const minScrollWidth = filteredDataset.length * minBarWidth * barsPerHub + 80;
  const chartWidth = Math.max(containerWidth, minScrollWidth);
  const tickFontSize = isMobile ? 8 : 11;
  const marginConfig = isMobile
    ? { top: 8, left: 36, bottom: 56, right: 12 }
    : { top: 8, left: 52, bottom: 72, right: 16 };

  return (
    <div ref={containerRef} className="w-full overflow-x-auto overflow-y-hidden thin-scrollbar pb-2">
      <BarChart
        dataset={filteredDataset}
        xAxis={[
          {
            dataKey: 'product',
            scaleType: 'band',
            tickLabelStyle: {
              angle: -35,
              textAnchor: 'end',
              fontSize: tickFontSize,
              fill: textColor,
            },
          },
        ]}
        series={[
          { dataKey: 'active', label: 'Active', color: '#22C55E' },
          { dataKey: 'awol', label: 'AWOL', color: '#F59E0B' },
          { dataKey: 'resign', label: 'Resign', color: '#6B7280' },
          { dataKey: 'blacklist', label: 'Blacklist', color: '#EF4444' },
        ]}
        slotProps={{
          bar: { rx: 3 },
        }}
        yAxis={[
          {
            label: isMobile ? '' : 'Employee Count',
            labelStyle: {
              fill: textColor,
              fontSize: 11,
            },
            tickLabelStyle: {
              fill: textColor,
              fontSize: tickFontSize,
            },
            tickMinStep: 1,
          },
        ]}
        height={chartHeight}
        width={chartWidth}
        margin={marginConfig}
        sx={{
          '& .MuiChartsAxis-line': { stroke: gridColor },
          '& .MuiChartsAxis-tick': { stroke: gridColor },
          '& .MuiChartsAxis-tickLabel': {
            fill: `${textColor} !important`,
            fontSize: `${tickFontSize}px !important`,
          },
          '& .MuiChartsAxis-label': {
            fill: `${textColor} !important`,
            fontSize: '11px !important',
          },
          '& .MuiChartsLegend-root': { display: 'none !important' },
        }}
      />
    </div>
  );
}
