import React from 'react';
import { LoadingSpinner } from '@/components/common';
import DocumentsSection from '@/components/DocumentsSection';
import { useGetDocuments } from '@/hooks/useQueries';

interface EmployeeDocumentsCardProps {
  employeeId: number;
  readOnly?: boolean;
}

export const EmployeeDocumentsCard = ({ employeeId, readOnly = false }: EmployeeDocumentsCardProps) => {
  const { data, isLoading } = useGetDocuments({ employee_id: employeeId });
  
  const documents = data?.results || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <DocumentsSection
      documents={documents}
      employeeId={employeeId}
      readOnly={readOnly}
    />
  );
};
