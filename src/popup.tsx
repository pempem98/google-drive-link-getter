import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import { loadMessages, getMessage } from './utils';

// Lazy load settings component
const Settings = lazy(() => import('./settings'));

interface DriveFile {
  name: string;
  shareLink: string;
  id: string;
}

interface HistoryEntry {
  timestamp: number;
  title: string;
  links: string;
  separator: string;
}

const Popup: React.FC = () => {
  const [output, setOutput] = useState<string>('');
  const [buttonState, setButtonState] = useState<'idle' | 'completed' | 'failed'>('idle');
  const [copyState, setCopyState] = useState<{ [key: string]: 'idle' | 'processing' | 'completed' | 'failed' }>({});
  const [exportState, setExportState] = useState<{ [key: string]: 'idle' | 'processing' | 'completed' | 'failed' }>({});
  const [isScraping, setIsScraping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentTabTitle, setCurrentTabTitle] = useState('');
  const [separator, setSeparator] = useState<string>('\t'); // Default: Tab
  const [customSeparator, setCustomSeparator] = useState<string>('');
  const [removeExtension, setRemoveExtension] = useState<boolean>(false);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [autoShareEnabled, setAutoShareEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userLanguage, setUserLanguage] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load messages based on userLanguage or browser locale
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const locale = userLanguage || chrome.i18n.getUILanguage().split('-')[0];
      const loadedMessages = await loadMessages(locale);
      setMessages(loadedMessages);
      setIsLoading(false);
    };
    load();
  }, [userLanguage]);

  // Load history and settings
  useEffect(() => {
    chrome.storage.local.get(['history', 'settings'], (result) => {
      if (result.history) {
        setHistory(result.history);
      }
      if (result.settings) {
        setSeparator(result.settings.separator || '\t');
        setCustomSeparator(result.settings.customSeparator || '');
        setRemoveExtension(result.settings.removeExtension || false);
        setDarkMode(result.settings.darkMode || false);
        setNotificationsEnabled(result.settings.notificationsEnabled !== false);
        setAutoShareEnabled(result.settings.autoShareEnabled || false);
        setUserLanguage(result.settings.userLanguage || null);
      }
    });
  }, []);

  const handleGetLinks = async () => {
    setIsScraping(true);
    setButtonState('idle');
    setOutput('');
    setTotalFiles(0);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url?.startsWith('https://drive.google.com/')) {
        setOutput(getMessage(messages, 'invalidPage'));
        setButtonState('failed');
        setTimeout(() => setButtonState('idle'), 3000);
        setIsScraping(false);
        return;
      }

      const tabTitle = tab.title?.replace(/ - Google Drive$/, '') || 'Untitled';
      setCurrentTabTitle(tabTitle);

      const results = await chrome.scripting.executeScript({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        target: { tabId: tab.id! },
        func: (removeExtension: boolean) => {
          // Helper function to create a delay using Promise
          const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // Limit to 50 attempts

            const checkElements = async () => {
              const fileElements = document.querySelectorAll('div.WYuW0e[data-id]');
              const bodyFrame = document.querySelector('div > c-wiz.PEfnhb');
              if ((document.readyState == 'complete') && (fileElements.length > 0)) {
                if (bodyFrame) {
                  bodyFrame.scrollTo(0, bodyFrame.scrollHeight + 200);
                } else {
                  window.scrollTo(0, document.body.scrollHeight + 200);
                }
                // Add a synchronous delay using await
                await sleep(2000); // 2000ms delay before checking updated file elements
                const updatedFileElements = document.querySelectorAll('div.WYuW0e[data-id]');
                if (updatedFileElements.length > fileElements.length) {
                  checkElements();
                } else {
                  // Resolve with the final list of files
                  const files: { name: string; shareLink: string; id: string }[] = [];
                  await sleep(2000); // 2000ms delay before checking updated file elements
                  const finalFileElements = document.querySelectorAll('div.WYuW0e[data-id]');
                  for (const el of finalFileElements) {
                    const id = el.getAttribute('data-id');
                    const nameElement = el.querySelector('div.KL4NAf') || el.querySelector('div.Q5txwe');
                    let name = nameElement?.textContent?.trim() || 'Unknown';
                    if (removeExtension && name !== 'Unknown') {
                      name = name.replace(/\.[^/.]+$/, '');
                    }
                    if (id) {
                      const type = nameElement.getAttribute('aria-label')?.split(':')[0] || '';
                      let fileLink = 'Not Available';
                      switch (type) {
                      case 'Google Drive Folder': {
                        fileLink = `https://drive.google.com/drive/folders/${id}`;
                        break;
                      }
                      case 'Google Apps Script': {
                        fileLink = `https://script.google.com/home/projects/${id}/edit`;
                        break;
                      }
                      case 'Google Sheets': {
                        fileLink = `https://docs.google.com/spreadsheets/d/${id}/edit`;
                        break;
                      }
                      case 'Google Docs': {
                        fileLink = `https://docs.google.com/document/d/${id}/edit`;
                        break;
                      }
                      case 'Google Slides': {
                        fileLink = `https://docs.google.com/presentation/d/${id}/edit`;
                        break;
                      }
                      case 'Google Forms': {
                        fileLink = `https://docs.google.com/forms/d/${id}/edit`;
                        break;
                      }
                      case 'Google Drawings': {
                        fileLink = `https://docs.google.com/drawings/d/${id}/edit`;
                        break;
                      }
                      case 'Google Sites': {
                        fileLink = `https://sites.google.com/site/${id}`;
                        break;
                      }
                      case 'Google My Maps': {
                        fileLink = `https://www.google.com/maps/d/edit?mid=${id}`;
                        break;
                      }
                      default: {
                        fileLink = `https://drive.google.com/file/d/${id}/view`;
                        break;
                      }
                      }
                      files.push({ name, shareLink: fileLink, id });
                    }
                  }
                  resolve({ files, total: finalFileElements.length });
                }
                attempts = 0; // Reset attempts if files are found
              } else {
                attempts++;
                if (attempts >= maxAttempts) {
                  resolve({ files: [], total: 0 }); // Resolve with empty result if max attempts reached
                  return;
                }
                setTimeout(checkElements, 500);
              }
            };

            checkElements();
          });
        },
        args: [removeExtension],
      });

      const result = results[0]?.result as { files: DriveFile[]; total: number } | undefined;
      const files = result?.files || [];
      const totalFiles = result?.total || 0;

      if (files.length === 0) {
        setOutput(getMessage(messages, 'noFiles'));
        setButtonState('failed');
        setTimeout(() => setButtonState('idle'), 3000);
        setIsScraping(false);
        return;
      }

      setTotalFiles(totalFiles);

      const updatedFiles = files;
      // Temporarily disabled auto-share logic
      /*
      if (autoShareEnabled) {
        const token = await new Promise<string>((resolve, reject) => {
          chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError || !token) {
              reject(new Error('Failed to get OAuth token'));
            } else {
              resolve(token);
            }
          });
        });

        updatedFiles = await Promise.all(
          files.map(async (file) => {
            try {
              const shareLink = await ensureFileIsShared(file.id, token);
              return { ...file, shareLink };
            } catch (error) {
              console.error(`Failed to share file ${file.id}:`, error);
              return file;
            }
          })
        );
      }
      */

      const activeSeparator = separator === 'other' ? customSeparator : separator;
      const outputText = updatedFiles
        .map((file: DriveFile) => `${file.name}${activeSeparator}${file.shareLink}`)
        .join('\n');
      setOutput(outputText);
      setButtonState('completed');

      chrome.storage.local.get(['history'], (result) => {
        const history = result.history || [];
        history.push({
          timestamp: Date.now(),
          title: tabTitle,
          links: outputText,
          separator: activeSeparator,
        });
        if (history.length > 50) history.shift();
        chrome.storage.local.set({ history }, () => {
          setHistory(history);
        });
      });

      if (notificationsEnabled) {
        chrome.runtime.sendMessage({
          type: 'SHOW_NOTIFICATION',
          title: getMessage(messages, 'completed'),
          message: `${getMessage(messages, 'totalFiles')}${totalFiles}`
        });
      }

      setTimeout(() => setButtonState('idle'), 3000);
    } catch (error) {
      setOutput(`Lỗi: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      setButtonState('failed');
      setTimeout(() => setButtonState('idle'), 3000);
    }
    setIsScraping(false);
  };

  const handleCopy = async (text: string, key: string) => {
    setCopyState((prev) => ({ ...prev, [key]: 'processing' }));
    try {
      await navigator.clipboard.writeText(text);
      setCopyState((prev) => ({ ...prev, [key]: 'completed' }));
      setStatusMessage(getMessage(messages, 'copyCompleted') + '!');
      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    } catch (error) {
      setCopyState((prev) => ({ ...prev, [key]: 'failed' }));
      setStatusMessage(getMessage(messages, 'copyFailed') + '!');
      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    }
  };

  const handleExportCSV = async (links: string, separator: string, key: string) => {
    setExportState((prev) => ({ ...prev, [key]: 'processing' }));
    try {
      const activeSeparator = separator === 'other' ? customSeparator : separator;
      const rows = links.split('\n').map(line => {
        const [name, link] = line.split(activeSeparator === '\t' ? '\t' : activeSeparator);
        return `"${name.replace(/"/g, '""')}","${link}"`;
      });
      const csvContent = ['Name,ShareLink', ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const sanitizedTitle = currentTabTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'drive-links';
      a.href = url;
      a.download = `${sanitizedTitle}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportState((prev) => ({ ...prev, [key]: 'completed' }));
      setStatusMessage(getMessage(messages, 'exportCompleted') + '!');
      setTimeout(() => {
        setExportState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    } catch (error) {
      setExportState((prev) => ({ ...prev, [key]: 'failed' }));
      setStatusMessage(getMessage(messages, 'exportFailed') + '!');
      setTimeout(() => {
        setExportState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    }
  };

  const handleClearHistory = () => {
    chrome.storage.local.remove('history', () => {
      setHistory([]);
      setStatusMessage(getMessage(messages, 'cleared'));
      setTimeout(() => setStatusMessage(''), 2000);
    });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredHistory = history.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatDate(entry.timestamp).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={`popup-container ${darkMode ? 'dark-mode' : ''}`}>
      <h1>{getMessage(messages, 'title')}</h1>
      <div className="tabs">
        <button
          className={`tab-button ${!showHistory && !showSettings ? 'active' : ''}`}
          onClick={() => { setShowHistory(false); setShowSettings(false); }}
        >
          {getMessage(messages, 'homeTab')}
        </button>
        <button
          className={`tab-button ${showHistory ? 'active' : ''}`}
          onClick={() => { setShowHistory(true); setShowSettings(false); }}
        >
          {getMessage(messages, 'historyTab')}
        </button>
        <button
          className={`tab-button ${showSettings ? 'active' : ''}`}
          onClick={() => { setShowHistory(false); setShowSettings(true); }}
        >
          {getMessage(messages, 'settingsTab')}
        </button>
      </div>
      {statusMessage && <span className="status-message">{statusMessage}</span>}
      {showSettings ? (
        <Suspense fallback={<div>{getMessage(messages, 'processing')}</div>}>
          <Settings
            separator={separator}
            setSeparator={setSeparator}
            customSeparator={customSeparator}
            setCustomSeparator={setCustomSeparator}
            removeExtension={removeExtension}
            setRemoveExtension={setRemoveExtension}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
            autoShareEnabled={autoShareEnabled}
            setAutoShareEnabled={setAutoShareEnabled}
            userLanguage={userLanguage}
            setUserLanguage={setUserLanguage}
          />
        </Suspense>
      ) : showHistory ? (
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
      ) : (
        <div className="links-container">
          {totalFiles > 0 && (
            <p className="total-files">{getMessage(messages, 'totalFiles')}{totalFiles}</p>
          )}
          <div className="links-box">
            <div className="button-container">
              <button
                className={`get-links-button ${buttonState === 'completed' ? 'completed' : buttonState === 'failed' ? 'failed' : ''}`}
                onClick={handleGetLinks}
                disabled={isScraping}
              >
                {isScraping ? getMessage(messages, 'processing') :
                  buttonState === 'completed' ? getMessage(messages, 'completed') :
                    buttonState === 'failed' ? getMessage(messages, 'failed') :
                      getMessage(messages, 'getLinks')}
              </button>
              <button
                className={`copy-button ${copyState['main'] === 'completed' ? 'completed' : copyState['main'] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleCopy(output, 'main')}
                disabled={!output}
              >
                {copyState['main'] === 'processing' ? getMessage(messages, 'copyProcessing') :
                  copyState['main'] === 'completed' ? getMessage(messages, 'copyCompleted') :
                    copyState['main'] === 'failed' ? getMessage(messages, 'copyFailed') :
                      getMessage(messages, 'copy')}
              </button>
              <button
                className={`export-button ${exportState['main'] === 'completed' ? 'completed' : exportState['main'] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleExportCSV(output, separator, 'main')}
                disabled={!output}
              >
                {exportState['main'] === 'processing' ? getMessage(messages, 'exportProcessing') :
                  exportState['main'] === 'completed' ? getMessage(messages, 'exportCompleted') :
                    exportState['main'] === 'failed' ? getMessage(messages, 'exportFailed') :
                      getMessage(messages, 'export')}
              </button>
            </div>
            <textarea
              className="output-textarea"
              value={output}
              readOnly
              rows={10}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<Popup />);
}