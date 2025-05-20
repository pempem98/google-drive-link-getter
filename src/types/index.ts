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
