import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { getMessage } from './utils/utils';
import { extractFiles } from './utils/extractFiles';
import { saveHistory, clearHistory } from './utils/storageUtils';
import { useMessages } from './hooks/useMessages';
import HomeTab from './components/HomeTab';
import HistoryTab from './components/HistoryTab';
import { DriveFile, HistoryEntry } from './types';

// Lazy load settings component
const Settings = lazy(() => import('./components/Settings'));

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

  const { messages, isLoading } = useMessages(userLanguage);

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
      console.log('handleGetLinks: Tab queried:', tab); // Debug log
      if (!tab.url?.startsWith('https://drive.google.com/')) {
        console.log('handleGetLinks: Invalid URL, failing...'); // Debug log
        setOutput(getMessage(messages, 'invalidPage'));
        setButtonState('failed');
        setTimeout(() => setButtonState('idle'), 3000);
        setIsScraping(false);
        return;
      }
  
      const tabTitle = tab.title?.replace(/ - Google Drive$/, '') || 'Untitled';
      setCurrentTabTitle(tabTitle);
  
      if (!tab.id) {
        throw new Error('Tab ID is undefined');
      }
  
      console.log('handleGetLinks: Calling extractFiles...'); // Debug log
      const { files, total } = await extractFiles(tab.id, removeExtension).catch((error) => {
        console.error('handleGetLinks: extractFiles failed:', error); // Debug log
        throw error; // Re-throw to be caught by outer try-catch
      });
      console.log('handleGetLinks: extractFiles result:', { files, total }); // Debug log
      const totalFiles = total || 0;
      const updatedFiles = files || [];
  
      if (updatedFiles.length === 0) {
        console.log('handleGetLinks: No files found, failing...'); // Debug log
        setOutput(getMessage(messages, 'noFiles'));
        setButtonState('failed');
        setTimeout(() => setButtonState('idle'), 3000);
        setIsScraping(false);
        return;
      }
  
      setTotalFiles(totalFiles);
  
      const activeSeparator = separator === 'other' ? customSeparator : separator;
      const outputText = updatedFiles
        .map((file: DriveFile) => `${file.name}${activeSeparator}${file.shareLink}`)
        .join('\n');
      setOutput(outputText);
      setButtonState('completed');
  
      saveHistory(
        {
          timestamp: Date.now(),
          title: tabTitle,
          links: outputText,
          separator: activeSeparator,
        },
        (updatedHistory) => setHistory(updatedHistory)
      );
  
      if (notificationsEnabled) {
        chrome.runtime.sendMessage({
          type: 'SHOW_NOTIFICATION',
          title: getMessage(messages, 'completed'),
          message: `${getMessage(messages, 'totalFiles')}${totalFiles}`
        });
      }
  
      setTimeout(() => setButtonState('idle'), 3000);
    } catch (error) {
      console.error('handleGetLinks: Error:', error); // Debug log
      setOutput(`Lỗi: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      setButtonState('failed');
      setTimeout(() => setButtonState('idle'), 3000);
    } finally {
      setIsScraping(false);
      console.log('handleGetLinks: Complete, isScraping:', false); // Debug log
    }
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
    clearHistory(() => {
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  console.log('Rendering Popup, showSettings:', showSettings); // Debug log

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
          {(() => {
            try {
              return (
                <Settings
                  separator={separator}
                  setSeparator={setSeparator}
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
              );
            } catch (error) {
              console.error('Error rendering Settings tab:', error);
              return <div>Error loading Settings tab</div>;
            }
          })()}
        </Suspense>
      ) : showHistory ? (
        <HistoryTab
          history={history}
          searchQuery={searchQuery}
          copyState={copyState}
          exportState={exportState}
          messages={messages}
          setSearchQuery={setSearchQuery}
          handleCopy={handleCopy}
          handleExportCSV={handleExportCSV}
          handleClearHistory={handleClearHistory}
          formatDate={formatDate}
        />
      ) : (
        <HomeTab
          output={output}
          buttonState={buttonState}
          copyState={copyState}
          exportState={exportState}
          isScraping={isScraping}
          totalFiles={totalFiles}
          messages={messages}
          separator={separator}
          handleGetLinks={handleGetLinks}
          handleCopy={handleCopy}
          handleExportCSV={handleExportCSV}
        />
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<Popup />);
}
