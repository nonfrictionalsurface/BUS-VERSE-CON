import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api';

export function useAuditLogs() {
  return useQuery({ queryKey: ['admin', 'audit'], queryFn: auditApi.list });
}