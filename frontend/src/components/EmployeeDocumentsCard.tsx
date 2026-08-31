import React from 'react';
import { LoadingSpinner } from '@/components/common';
import DocumentsSection from '@/components/DocumentsSection';
import { useGetDocuments } from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/api';

interface EmployeeDocumentsCardProps {
  employeeId: number;
  readOnly?: boolean;
}

export const EmployeeDocumentsCard = ({ employeeId, readOnly = false }: EmployeeDocumentsCardProps) => {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useGetDocuments(employeeId ? { employee_id: employeeId } : undefined);
  
  const normalized = normalizeApiResponse(data);
  const documents = Array.isArray(normalized)
    ? normalized
    : Array.isArray(data)
    ? data
    : (data?.results || []);

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
      onUpdate={() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
      }}
    />
  );
};
