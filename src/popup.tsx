import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

interface DriveFile {
  name: string;
  shareLink: string;
}

interface HistoryEntry {
  timestamp: number;
  title: string;
  links: string;
}

const Popup: React.FC = () => {
  const [output, setOutput] = useState<string>('');
  const [buttonState, setButtonState] = useState<'idle' | 'completed' | 'failed'>('idle');
  const [isScraping, setIsScraping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentTabTitle, setCurrentTabTitle] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['history'], (result) => {
      if (result.history) {
        setHistory(result.history);
      }
    });
  }, []);

  const handleGetLinks = async () => {
    setIsScraping(true);
    setButtonState('idle');
    setOutput('');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url?.startsWith('https://drive.google.com/')) {
        setOutput('Please open a Google Drive page.');
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
        func: () => {
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
                  const nameElement = el.querySelector('div.KL4NAf');
                  const name = nameElement?.textContent?.trim() || 'Unknown';
                  if (id) {
                    files.push({ name, shareLink: `https://drive.google.com/file/d/${id}/view?usp=sharing` });
                  }
                }
                resolve(files);
              }
              lastHeight = document.body.scrollHeight;
            }, 500);
          });
        },
      });

      const files = results[0]?.result || [];
      if (files.length === 0) {
        setOutput('No files found on this page.');
        setButtonState('failed');
        setTimeout(() => setButtonState('idle'), 3000);
        setIsScraping(false);
        return;
      }

      const outputText = files
        .map((file: DriveFile) => `${file.name}:	${file.shareLink}`)
        .join('\n');
      setOutput(outputText);
      setButtonState('completed');

      // Save to history
      chrome.storage.local.get(['history'], (result) => {
        const history = result.history || [];
        history.push({ timestamp: Date.now(), title: tabTitle, links: outputText });
        if (history.length > 50) history.shift(); // Limit to 50 entries
        chrome.storage.local.set({ history }, () => {
          setHistory(history);
        });
      });

      setTimeout(() => setButtonState('idle'), 3000);
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setButtonState('failed');
      setTimeout(() => setButtonState('idle'), 3000);
    }
    setIsScraping(false);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setStatusMessage('Copied!');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (error) {
      setStatusMessage('Copy failed!');
      setTimeout(() => setStatusMessage(''), 2000);
    }
  };

  const handleExportCSV = () => {
    if (!output) return;
    try {
      const rows = output.split('\n').map(line => {
        const [name, link] = line.split(':	');
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
      setStatusMessage('Exported!');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (error) {
      setStatusMessage('Export failed!');
      setTimeout(() => setStatusMessage(''), 2000);
    }
  };

  const handleClearHistory = () => {
    chrome.storage.local.remove('history', () => {
      setHistory([]);
      setStatusMessage('History cleared!');
      setTimeout(() => setStatusMessage(''), 2000);
    });
  };

  return (
    <div className="popup-container">
      <h1>Google Drive Links Extractor</h1>
      <div className="button-container">
        <button
          className={`get-links-button ${buttonState === 'completed' ? 'completed' : buttonState === 'failed' ? 'failed' : ''}`}
          onClick={handleGetLinks}
          disabled={isScraping}
        >
          {isScraping ? 'Scraping...' : buttonState === 'completed' ? 'Completed' : buttonState === 'failed' ? 'Failed' : 'Get Links'}
        </button>
        <button
          className="copy-button"
          onClick={handleCopy}
          disabled={!output || showHistory}
        >
          Copy to Clipboard
        </button>
        <button
          className="export-button"
          onClick={handleExportCSV}
          disabled={!output || showHistory}
        >
          Export to CSV
        </button>
        <button
          className="history-button"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Back to Links' : 'View History'}
        </button>
      </div>
      {statusMessage && <span className="status-message">{statusMessage}</span>}
      {showHistory ? (
        <div className="history-container">
          <button
            className="clear-history-button"
            onClick={handleClearHistory}
            disabled={history.length === 0}
          >
            Clear History
          </button>
          {history.length === 0 ? (
            <p>No history available.</p>
          ) : (
            history.map((entry, index) => (
              <div key={index} className="history-entry">
                <h3 className="history-title">{entry.title}</h3>
                <strong>{new Date(entry.timestamp).toLocaleString()}</strong>
                <pre>{entry.links}</pre>
              </div>
            ))
          )}
        </div>
      ) : (
        <textarea
          className="output-textarea"
          value={output}
          readOnly
          rows={10}
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

