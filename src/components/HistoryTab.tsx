import React from 'react';
import { getMessage } from '../utils/utils';
import { HistoryEntry, HistorySortOption, Messages } from '../types';
import { useHistory } from '../hooks/useHistory';

interface HistoryTabProps {
  history: HistoryEntry[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  copyState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  exportState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  copyTreeState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  messages: Messages;
  performCopy: (textToClipboard: string, uiUpdateKey: string, successMsgKey: string, failMsgKey: string) => void;
  performExport: (linksToExport: string, currentSeparatorValue: string, key: string) => void;
  handleCopyTree: (historyEntryText: string, entrySeparator: string, uiUpdateKey: string) => void;
  handleClearHistory: () => void;
  formatDate: (timestamp: number) => string;
  copyFileNamesOnlyGlobal: boolean;
  removeDirectoryPathGlobal: boolean;
  currentSort: HistorySortOption;
  setSort: (sortOption: HistorySortOption) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  searchQuery,
  setSearchQuery,
  copyState,
  exportState,
  copyTreeState,
  messages,
  performCopy,
  performExport,
  handleCopyTree,
  handleClearHistory,
  formatDate,
  copyFileNamesOnlyGlobal,
  removeDirectoryPathGlobal,
  currentSort,
  setSort,
}) => {
  const { sortedAndFilteredHistory } = useHistory(history, searchQuery, currentSort);

  const getBaseName = (fullPathName: string): string => {
    const parts = fullPathName.split('/');
    return parts[parts.length - 1];
  };

  const getDisplayTextForHistoryEntry = (entry: HistoryEntry) => {
    if (copyFileNamesOnlyGlobal) {
      return entry.links.split('\n').map(line => {
        const parts = line.split(entry.separator);
        let namePart = parts[0] || '';
        if (removeDirectoryPathGlobal) {
          namePart = getBaseName(namePart);
        }
        return namePart;
      }).join('\n');
    }
    return entry.links.split('\n').map(line => {
      const parts = line.split(entry.separator);
      let namePart = parts[0] || '';
      const linkPart = parts.slice(1).join(entry.separator);
      if (removeDirectoryPathGlobal) {
        namePart = getBaseName(namePart);
      }
      return namePart + (linkPart ? entry.separator + linkPart : '');
    }).join('\n');
  };

  const handleHistoryCopyClick = (entry: HistoryEntry, index: number) => {
    let textToCopyForHistory = entry.links;
    let successKey = 'copyCompleted';
    let failKey = 'copyFailed';

    if (copyFileNamesOnlyGlobal) {
      const namesList = entry.links.split('\n').map(line => {
        const parts = line.split(entry.separator);
        let namePart = parts[0] || '';
        if (removeDirectoryPathGlobal) {
          namePart = getBaseName(namePart);
        }
        return namePart;
      });
      textToCopyForHistory = namesList.join('\n');
      successKey = 'copiedFileNames';
      failKey = 'copyFileNamesFailed';
    } else if (removeDirectoryPathGlobal) {
      const lines = entry.links.split('\n').map(line => {
        const parts = line.split(entry.separator);
        let namePart = parts[0] || '';
        const linkPart = parts.slice(1).join(entry.separator);
        namePart = getBaseName(namePart);
        return namePart + (linkPart ? entry.separator + linkPart : '');
      });
      textToCopyForHistory = lines.join('\n');
    }
    performCopy(textToCopyForHistory, `history-${index}`, successKey, failKey);
  };
  
  const handleHistoryExportClick = (entry: HistoryEntry, indexKey: string) => {
    let linksToExport = entry.links;
    if (removeDirectoryPathGlobal) {
      linksToExport = entry.links.split('\n').map(line => {
        const parts = line.split(entry.separator);
        let namePart = parts[0] || '';
        const linkPart = parts.slice(1).join(entry.separator);
        namePart = getBaseName(namePart);
        return namePart + (linkPart ? entry.separator + linkPart : '');
      }).join('\n');
    }
    performExport(linksToExport, entry.separator, indexKey);
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
      <div className="history-controls">
        <div className="sort-by-container">
          <label htmlFor="sort-select">{getMessage(messages, 'sortBy')}</label>
          <select 
            id="sort-select" 
            value={currentSort} 
            onChange={(e) => setSort(e.target.value as HistorySortOption)} 
            className="sort-select"
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
          disabled={history.length === 0}
        >
          {getMessage(messages, 'clearHistory')}
        </button>
      </div>

      {sortedAndFilteredHistory.length === 0 ? ( 
        <p>{getMessage(messages, 'noHistory')}</p> 
      ) : (
        sortedAndFilteredHistory.map((entry, index) => (
          <div key={entry.timestamp} className="history-entry">
            <h3 className="history-title">{entry.title}</h3>
            <strong>{formatDate(entry.timestamp)}</strong>
            <div className="history-actions">
              <button
                className={`copy-button ${copyState[`history-${index}`] === 'completed' ? 'completed' : copyState[`history-${index}`] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleHistoryCopyClick(entry, index)}
              >
                {copyState[`history-${index}`] === 'processing' ? getMessage(messages, 'copyProcessing') :
                  copyState[`history-${index}`] === 'completed' ? getMessage(messages, 'copyCompleted') :
                    copyState[`history-${index}`] === 'failed' ? getMessage(messages, 'copyFailed') :
                      getMessage(messages, 'copy')}
              </button>
              <button
                className={`export-button ${exportState[`history-${index}`] === 'completed' ? 'completed' : exportState[`history-${index}`] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleHistoryExportClick(entry, `history-${index}`)}
              >
                {exportState[`history-${index}`] === 'processing' ? getMessage(messages, 'exportProcessing') :
                  exportState[`history-${index}`] === 'completed' ? getMessage(messages, 'exportCompleted') :
                    exportState[`history-${index}`] === 'failed' ? getMessage(messages, 'exportFailed') :
                      getMessage(messages, 'export')}
              </button>
              <button
                className={`copy-tree-button ${copyTreeState[`history-tree-${index}`] === 'completed' ? 'completed' : copyTreeState[`history-tree-${index}`] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleCopyTree(entry.links, entry.separator, `history-tree-${index}`)}
              >
                {copyTreeState[`history-tree-${index}`] === 'processing' ? getMessage(messages, 'copyTreeProcessing') :
                  copyTreeState[`history-tree-${index}`] === 'completed' ? getMessage(messages, 'copyTreeCompleted') :
                    copyTreeState[`history-tree-${index}`] === 'failed' ? getMessage(messages, 'copyTreeFailed') :
                      getMessage(messages, 'copyTreeLabel')}
              </button>
            </div>
            <pre>{getDisplayTextForHistoryEntry(entry)}</pre>
          </div>
        ))
      )}
    </div>
  );
};

export default HistoryTab;