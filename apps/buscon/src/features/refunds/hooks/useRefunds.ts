import { useQuery } from '@tanstack/react-query';
import { refundsApi } from '../api';

export function useRefunds() {
  return useQuery({ queryKey: ['admin', 'refunds'], queryFn: refundsApi.list });
}