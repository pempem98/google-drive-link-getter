import { useMemo } from 'react';
import { HistoryEntry, HistorySortOption } from '../types';

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('vi-VN');
};

export const useHistory = (
  history: HistoryEntry[],
  searchQuery: string,
  sortOption: HistorySortOption
) => {
  const sortedAndFilteredHistory = useMemo(() => {
    return history
      .filter(
        entry =>
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    formatDate(entry.timestamp).toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortOption) {
        case 'time_asc':
          return a.timestamp - b.timestamp;
        case 'name_asc':
          return a.title.localeCompare(b.title);
        case 'name_desc':
          return b.title.localeCompare(a.title);
        case 'time_desc':
        default:
          return b.timestamp - a.timestamp;
        }
      });
  }, [history, searchQuery, sortOption]);

  return { sortedAndFilteredHistory };
};