import { AttendanceSidebar } from '@/components/AttendanceSidebar';
import { AttendanceHistoryModal } from '@/components/AttendanceHistoryModal';
import { useState } from 'react';

type EmployeeSidebarProps = {
  employeeId: number;
  // keep minimal typing here to avoid eslint any rule
  employee: Record<string, unknown>;
  onViewHistory?: () => void;
};


export const EmployeeSidebar = ({ employeeId, employee: _employee }: EmployeeSidebarProps) => {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="space-y-6">
      <AttendanceSidebar employeeId={employeeId} onViewHistory={() => setHistoryOpen(true)} />

    

      <AttendanceHistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} employeeId={employeeId} />
    </div>
  );
};

