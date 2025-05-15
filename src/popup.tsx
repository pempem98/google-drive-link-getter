import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { translations } from './translations';
import './popup.css';

// Lazy load settings component
const Settings = lazy(() => import('./settings'));

interface DriveFile {
  name: string;
  shareLink: string;
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
  const [separator, setSeparator] = useState<string>('\t'); // Mặc định: Tab
  const [removeExtension, setRemoveExtension] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('vi'); // Mặc định: Tiếng Việt
  const [totalFiles, setTotalFiles] = useState<number>(0);

  const t = translations[language as keyof typeof translations] || translations.vi;

  useEffect(() => {
    // Load history and settings
    chrome.storage.local.get(['history', 'settings'], (result) => {
      if (result.history) {
        setHistory(result.history);
      }
      if (result.settings) {
        setSeparator(result.settings.separator || '\t');
        setRemoveExtension(result.settings.removeExtension || false);
        setLanguage(result.settings.language || 'vi');
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
        setOutput(t.invalidPage);
        setButtonState('failed');
        setTimeout(() => setButtonState('idle'), 3000);
        setIsScraping(false);
        return;
      }

      const tabTitle = tab.title?.replace(/ - Google Drive$/, '') || 'Untitled';
      setCurrentTabTitle(tabTitle);

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: (removeExtension: boolean) => {
          return new Promise((resolve) => {
            let lastHeight = 0;
            const scroll = setInterval(() => {
              window.scrollTo(0, document.body.scrollHeight);
              if (document.body.scrollHeight === lastHeight) {
                clearInterval(scroll);
                const files: { name: string; shareLink: string }[] = [];
                const fileElements = document.querySelectorAll('div.WYuW0e[data-id]');
                for (const el of fileElements) {
                  const id = el.getAttribute('data-id');
                  const nameElement = el.querySelector('div.KL4NAf') || el.querySelector('div.Q5txwe');
                  let name = nameElement?.textContent?.trim() || 'Unknown';
                  if (removeExtension && name !== 'Unknown') {
                    name = name.replace(/\.[^/.]+$/, '');
                  }
                  if (id) {
                    files.push({ name, shareLink: `https://drive.google.com/file/d/${id}/view?usp=sharing` });
                  }
                }
                resolve({ files, total: fileElements.length });
              }
              lastHeight = document.body.scrollHeight;
            }, 500);
          });
        },
        args: [removeExtension],
      });

      const result = results[0]?.result as { files: DriveFile[]; total: number } | undefined;
      const files = result?.files || [];
      const totalFiles = result?.total || 0;

      if (files.length === 0) {
        setOutput(t.noFiles);
        setButtonState('failed');
        setTimeout(() => setButtonState('idle'), 3000);
        setIsScraping(false);
        return;
      }

      setTotalFiles(totalFiles);

      const outputText = files
        .map((file: DriveFile) => `${file.name}${separator}${file.shareLink}`)
        .join('\n');
      setOutput(outputText);
      setButtonState('completed');

      chrome.storage.local.get(['history'], (result) => {
        const history = result.history || [];
        history.push({
          timestamp: Date.now(),
          title: tabTitle,
          links: outputText,
          separator,
        });
        if (history.length > 50) history.shift();
        chrome.storage.local.set({ history }, () => {
          setHistory(history);
        });
      });

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
      setStatusMessage(t.copied);
      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    } catch (error) {
      setCopyState((prev) => ({ ...prev, [key]: 'failed' }));
      setStatusMessage(t.copyFailed);
      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    }
  };

  const handleExportCSV = async (links: string, separator: string, key: string) => {
    setExportState((prev) => ({ ...prev, [key]: 'processing' }));
    try {
      const rows = links.split('\n').map(line => {
        const [name, link] = line.split(separator === '\t' ? '\t' : separator);
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
      setStatusMessage(t.exported);
      setTimeout(() => {
        setExportState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    } catch (error) {
      setExportState((prev) => ({ ...prev, [key]: 'failed' }));
      setStatusMessage(t.exportFailed);
      setTimeout(() => {
        setExportState((prev) => ({ ...prev, [key]: 'idle' }));
        setStatusMessage('');
      }, 2000);
    }
  };

  const handleClearHistory = () => {
    chrome.storage.local.remove('history', () => {
      setHistory([]);
      setStatusMessage(t.cleared);
      setTimeout(() => setStatusMessage(''), 2000);
    });
  };

  return (
    <div className="popup-container">
      <h1>{t.title}</h1>
      <div className="tabs">
        <button
          className={`tab-button ${!showHistory && !showSettings ? 'active' : ''}`}
          onClick={() => { setShowHistory(false); setShowSettings(false); }}
        >
          {t.homeTab}
        </button>
        <button
          className={`tab-button ${showHistory ? 'active' : ''}`}
          onClick={() => { setShowHistory(true); setShowSettings(false); }}
        >
          {t.historyTab}
        </button>
        <button
          className={`tab-button ${showSettings ? 'active' : ''}`}
          onClick={() => { setShowHistory(false); setShowSettings(true); }}
        >
          {t.settingsTab}
        </button>
      </div>
      {statusMessage && <span className="status-message">{statusMessage}</span>}
      {showSettings ? (
        <Suspense fallback={<div>{t.processing}</div>}>
          <Settings
            separator={separator}
            setSeparator={setSeparator}
            removeExtension={removeExtension}
            setRemoveExtension={setRemoveExtension}
            language={language}
            setLanguage={setLanguage}
          />
        </Suspense>
      ) : showHistory ? (
        <div className="history-container">
          <button
            className="clear-history-button"
            onClick={handleClearHistory}
            disabled={history.length === 0}
          >
            {t.clearHistory}
          </button>
          {history.length === 0 ? (
            <p>{t.noHistory}</p>
          ) : (
            history.map((entry, index) => (
              <div key={index} className="history-entry">
                <h3 className="history-title">{entry.title}</h3>
                <strong>{new Date(entry.timestamp).toLocaleString()}</strong>
                <div className="history-actions">
                  <button
                    className={`copy-button ${copyState[`history-${index}`] === 'completed' ? 'completed' : copyState[`history-${index}`] === 'failed' ? 'failed' : ''}`}
                    onClick={() => handleCopy(entry.links, `history-${index}`)}
                  >
                    {copyState[`history-${index}`] === 'processing' ? t.copyProcessing :
                      copyState[`history-${index}`] === 'completed' ? t.copyCompleted :
                        copyState[`history-${index}`] === 'failed' ? t.copyFailed : t.copy}
                  </button>
                  <button
                    className={`export-button ${exportState[`history-${index}`] === 'completed' ? 'completed' : exportState[`history-${index}`] === 'failed' ? 'failed' : ''}`}
                    onClick={() => handleExportCSV(entry.links, entry.separator, `history-${index}`)}
                  >
                    {exportState[`history-${index}`] === 'processing' ? t.exportProcessing :
                      exportState[`history-${index}`] === 'completed' ? t.exportCompleted :
                        exportState[`history-${index}`] === 'failed' ? t.exportFailed : t.export}
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
            <p className="total-files">{t.totalFiles}{totalFiles}</p>
          )}
          <div className="links-box">
            <div className="button-container">
              <button
                className={`get-links-button ${buttonState === 'completed' ? 'completed' : buttonState === 'failed' ? 'failed' : ''}`}
                onClick={handleGetLinks}
                disabled={isScraping}
              >
                {isScraping ? t.processing : buttonState === 'completed' ? t.completed : buttonState === 'failed' ? t.failed : t.getLinks}
              </button>
              <button
                className={`copy-button ${copyState['main'] === 'completed' ? 'completed' : copyState['main'] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleCopy(output, 'main')}
                disabled={!output}
              >
                {copyState['main'] === 'processing' ? t.copyProcessing :
                  copyState['main'] === 'completed' ? t.copyCompleted :
                    copyState['main'] === 'failed' ? t.copyFailed : t.copy}
              </button>
              <button
                className={`export-button ${exportState['main'] === 'completed' ? 'completed' : exportState['main'] === 'failed' ? 'failed' : ''}`}
                onClick={() => handleExportCSV(output, separator, 'main')}
                disabled={!output}
              >
                {exportState['main'] === 'processing' ? t.exportProcessing :
                  exportState['main'] === 'completed' ? t.exportCompleted :
                    exportState['main'] === 'failed' ? t.exportFailed : t.export}
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
