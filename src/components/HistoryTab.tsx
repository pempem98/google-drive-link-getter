// src/components/HistoryTab.tsx
import React from 'react';
import { getMessage } from '../utils/utils';
import { HistoryEntry, HistorySortOption } from '../types'; // Import HistorySortOption

interface HistoryTabProps {
  history: HistoryEntry[];
  searchQuery: string;
  copyState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  exportState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  messages: { [key: string]: { message: string; description?: string } };
  setSearchQuery: (value: string) => void;
  handleCopy: (text: string, key: string) => void;
  handleExportCSV: (links: string, separator: string, key: string) => void;
  handleClearHistory: () => void;
  formatDate: (timestamp: number) => string;
  copyFileNamesOnly: boolean;
  // Thêm props cho sắp xếp
  currentSort: HistorySortOption;
  setSort: (sortOption: HistorySortOption) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  searchQuery,
  copyState,
  exportState,
  messages,
  setSearchQuery,
  handleCopy,
  handleExportCSV,
  handleClearHistory,
  formatDate,
  copyFileNamesOnly,
  currentSort, // Sử dụng prop này
  setSort,     // Sử dụng prop này
}) => {
  const filteredHistory = history.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatDate(entry.timestamp).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Logic sắp xếp
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (currentSort === 'time_asc') {
      return a.timestamp - b.timestamp;
    } else if (currentSort === 'time_desc') {
      return b.timestamp - a.timestamp;
    } else if (currentSort === 'name_asc') {
      return a.title.localeCompare(b.title);
    } else if (currentSort === 'name_desc') {
      return b.title.localeCompare(a.title);
    }
    return 0; // Default case
  });

  const getDisplayedLinks = (entry: HistoryEntry) => {
    if (copyFileNamesOnly) {
      return entry.links.split('\n').map(line => {
        const parts = line.split(entry.separator);
        return parts[0] || '';
      }).join('\n');
    }
    return entry.links;
  };

  return (
    <div className="history-container">
      <input
        type="text"
        className="search-input"
        placeholder={getMessage(messages, 'searchHistoryPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="history-controls"> {/* Thêm div để nhóm điều khiển */}
        <div className="sort-by-container">
          <label htmlFor="sort-select">{getMessage(messages, 'sortBy')}</label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => setSort(e.target.value as HistorySortOption)}
            className="sort-select" // Thêm class để dễ style
          >
            <option value="time_desc">{getMessage(messages, 'sortTimeDesc')}</option>
            <option value="time_asc">{getMessage(messages, 'sortTimeAsc')}</option>
            <option value="name_asc">{getMessage(messages, 'sortNameAsc')}</option>
            <option value="name_desc">{getMessage(messages, 'sortNameDesc')}</option>
          </select>
        </div>
        <button
          className="clear-history-button"
          onClick={handleClearHistory}
          disabled={filteredHistory.length === 0}
        >
          {getMessage(messages, 'clearHistory')}
        </button>
      </div>
      
      {sortedHistory.length === 0 ? (
        <p>{getMessage(messages, 'noHistory')}</p>
      ) : (
        sortedHistory.map((entry, index) => ( // Sử dụng sortedHistory ở đây
          <div key={index} className="history-entry">
            <h3 className="history-title">{entry.title}</h3>
            <strong>{formatDate(entry.timestamp)}</strong>
            <div className="history-actions">
              <button
                className={`copy-button ${copyState[`history-${index}`] === 'completed' ? 'completed' : copyState[`history-${index}`] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleCopy(entry.links, `history-${index}`)}
              >
                {copyState[`history-${index}`] === 'processing' ? getMessage(messages, 'copyProcessing') :
                  copyState[`history-${index}`] === 'completed' ? getMessage(messages, 'copyCompleted') :
                    copyState[`history-${index}`] === 'failed' ? getMessage(messages, 'copyFailed') :
                      getMessage(messages, 'copy')}
              </button>
              <button
                className={`export-button ${exportState[`history-${index}`] === 'completed' ? 'completed' : exportState[`history-${index}`] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleExportCSV(entry.links, entry.separator, `history-${index}`)}
              >
                {exportState[`history-${index}`] === 'processing' ? getMessage(messages, 'exportProcessing') :
                  exportState[`history-${index}`] === 'completed' ? getMessage(messages, 'exportCompleted') :
                    exportState[`history-${index}`] === 'failed' ? getMessage(messages, 'exportFailed') :
                      getMessage(messages, 'export')}
              </button>
            </div>
            <pre>{getDisplayedLinks(entry)}</pre>
          </div>
        ))
      )}
    </div>
  );
};

export default HistoryTab;