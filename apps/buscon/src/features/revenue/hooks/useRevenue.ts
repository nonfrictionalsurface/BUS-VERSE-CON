import { useQuery } from '@tanstack/react-query';
import { revenueApi } from '../api';

export function useRevenueSummary() {
  return useQuery({ queryKey: ['revenue', 'summary'], queryFn: revenueApi.getSummary });
}

export function useDailyTrend() {
  return useQuery({ queryKey: ['revenue', 'daily'], queryFn: revenueApi.getDailyTrend });
}