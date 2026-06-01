import React, { useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { Hub, Employee } from '@/types';
import { useTheme } from '@/context/ThemeContext';
 

interface Props {
  hubsData?: Hub[];
  employees?: Employee[];
}

export default function HubsEmployeeChart({ hubsData = [], employees = [] }: Props) {
  const { isDarkMode } = useTheme();

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
  const chartHeight = isMobile ? 200 : 450;
  const itemWidth = isMobile ? 55 : 130;
  const chartWidth = Math.max(isMobile ? 280 : 800, filteredDataset.length * itemWidth);
  const legendFontSize = isMobile ? 6 : 12;
  const tickFontSize = isMobile ? 6 : 11;
  const marginConfig = isMobile 
    ? { top: 5, left: 30, bottom: 20, right: 10 } 
    : { top: 5, left: 60 };

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden thin-scrollbar pb-2">
      <BarChart
        dataset={filteredDataset}

        xAxis={[
          {
            dataKey: 'product',
            scaleType: 'band',
            tickLabelStyle: {
              angle: -40,
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

        yAxis={[
          {
            label: isMobile ? '' : 'Employee Count',
            labelStyle: {
              fill: textColor,
              fontSize: legendFontSize,
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

        slotProps={{
          legend: {
            direction: 'horizontal',
            position: { vertical: 'top', horizontal: 'center' },
          },
        }}

        sx={{
          // Axis lines & ticks
          '& .MuiChartsAxis-line': {
            stroke: gridColor,
          },
          '& .MuiChartsAxis-tick': {
            stroke: gridColor,
          },
          // Tick labels (fallbacks)
          '& .MuiChartsAxis-tickLabel': {
            fill: `${textColor} !important`,
            fontSize: `${tickFontSize}px !important`,
          },
          // Axis title/label (fallbacks)
          '& .MuiChartsAxis-label': {
            fill: `${textColor} !important`,
            fontSize: `${legendFontSize}px !important`,
          },
          // Legend layout & text
          '& .MuiChartsLegend-root': {
            display: 'none !important',
          },
          '& .MuiChartsLegend-series': {
            gap: isMobile ? '2px !important' : '8px !important',
          },
          '& .MuiChartsLegend-mark': {
            width: isMobile ? '6px !important' : '14px !important',
            height: isMobile ? '6px !important' : '14px !important',
          },
          '& .MuiChartsLegend-label': {
            fontSize: isMobile ? '6px !important' : '12px !important',
            color: `${textColor} !important`,
          },
        }}
      />
    </div>
  );
}
