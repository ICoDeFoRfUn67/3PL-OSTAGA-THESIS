import { ReactNode } from 'react';

interface InfoCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export const InfoCard = ({ title, icon, children, className = '', action }: InfoCardProps) => {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-md dark:shadow-lg dark:shadow-black/40 p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-[#8B0000] dark:text-red-500">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value: string | number | undefined | null;
  className?: string;
  highlight?: boolean;
}

export const InfoItem = ({ label, value, className = '', highlight = false }: InfoItemProps) => {
  return (
    <div className={`flex justify-between items-center py-2 ${className}`}>
      <span className="text-gray-600 dark:text-gray-400 text-sm">{label}</span>
      <span className={`font-medium ${highlight ? 'text-[#8B0000] dark:text-red-500' : 'text-gray-900 dark:text-white'} text-sm`}>
        {value ?? 'N/A'}
      </span>
    </div>
  );
};

export default InfoCard;
