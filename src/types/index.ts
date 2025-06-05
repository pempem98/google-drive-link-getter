// src/types/index.ts
export interface DriveFile {
  name: string;
  shareLink: string;
  id: string;
}

export interface HistoryEntry {
  timestamp: number;
  title: string;
  links: string;
  separator: string;
}

export interface Messages {
  [key: string]: { message: string; description?: string };
}

export interface UserSettings {
  separator: string;
  customSeparator: string;
  removeExtension: boolean;
  darkMode: boolean;
  notificationsEnabled: boolean;
  autoShareEnabled: boolean;
  userLanguage: string | null;
  copyFileNamesOnly: boolean;
  recursiveScanEnabled: boolean;
  sortHistoryBy?: HistorySortOption;
  removeDirectoryPath: boolean;
}

export type HistorySortOption = 'time_desc' | 'time_asc' | 'name_asc' | 'name_desc';