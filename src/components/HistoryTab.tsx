import React from 'react';
import { getMessage } from '../utils/utils'; // Updated path
import { HistoryEntry } from '../types';

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
}) => {
  const filteredHistory = history.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatDate(entry.timestamp).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="history-container">
      <input
        type="text"
        className="search-input"
        placeholder={getMessage(messages, 'searchHistoryPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button
        className="clear-history-button"
        onClick={handleClearHistory}
        disabled={filteredHistory.length === 0}
      >
        {getMessage(messages, 'clearHistory')}
      </button>
      {filteredHistory.length === 0 ? (
        <p>{getMessage(messages, 'noHistory')}</p>
      ) : (
        filteredHistory.map((entry, index) => (
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
            <pre>{entry.links}</pre>
          </div>
        ))
      )}
    </div>
  );
};

export default HistoryTab;
