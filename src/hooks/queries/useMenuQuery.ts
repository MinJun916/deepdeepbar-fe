import { useQuery } from '@tanstack/react-query';

import { getMenus } from '@/services/menu.service';

export const useMenusQuery = (keyword = '') => {
  return useQuery({
    queryKey: ['menus', keyword],
    staleTime: 30_000,
    queryFn: ({ signal }) => getMenus(keyword || undefined, signal),
  });
};
