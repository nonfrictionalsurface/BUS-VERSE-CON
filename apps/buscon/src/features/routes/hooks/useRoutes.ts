import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, CreateRouteInput, CreateRouteStandInput } from '../api';

export function useRoutes() {
  return useQuery({ queryKey: ['routes'], queryFn: routesApi.list });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRouteInput) => routesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });
}

export function useAddStand() {
  return useMutation({
    mutationFn: ({ routeId, stand }: { routeId: string; stand: CreateRouteStandInput }) =>
      routesApi.addStand(routeId, stand),
  });
}

export function useCitySearch(query: string) {
  return useQuery({
    queryKey: ['cities', query],
    queryFn: () => routesApi.searchCities(query),
    enabled: query.length >= 2,
  });
}

export function useStands(cityId?: string) {
  return useQuery({
    queryKey: ['stands', cityId],
    queryFn: () => routesApi.getStands(cityId!),
    enabled: !!cityId,
  });
}
