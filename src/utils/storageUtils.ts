import { HistoryEntry } from '../types';

export const saveHistory = (
  newEntry: HistoryEntry,
  callback: (history: HistoryEntry[]) => void
) => {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    history.push(newEntry);
    if (history.length > 50) history.shift();
    chrome.storage.local.set({ history }, () => {
      callback(history);
    });
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveSettings = (settings: any, callback?: () => void) => {
  chrome.storage.local.set({ settings }, callback);
};

export const clearHistory = (callback: () => void) => {
  chrome.storage.local.remove('history', callback);
};
