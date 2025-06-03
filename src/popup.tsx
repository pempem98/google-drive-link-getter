// src/popup.tsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { getMessage } from './utils/utils';
import { extractFiles } from './utils/extractFiles';
import { saveHistory, clearHistory } from './utils/storageUtils';
import { useMessages } from './hooks/useMessages';
import HomeTab from './components/HomeTab';
import HistoryTab from './components/HistoryTab';
import { DriveFile, HistoryEntry, HistorySortOption, UserSettings } from './types';

const Settings = lazy(() => import('./components/Settings'));

const Popup: React.FC = () => {
  const [output, setOutput] = useState<string>('');
  const [fileNamesOnlyOutput, setFileNamesOnlyOutput] = useState<string>('');
  const [buttonState, setButtonState] = useState<'idle' | 'completed' | 'failed'>('idle');
  const [copyState, setCopyState] = useState<{ [key: string]: 'idle' | 'processing' | 'completed' | 'failed' }>({});
  const [exportState, setExportState] = useState<{ [key: string]: 'idle' | 'processing' | 'completed' | 'failed' }>({});
  const [copyTreeState, setCopyTreeState] = useState<{ [key: string]: 'idle' | 'processing' | 'completed' | 'failed' }>({});
  const [isScraping, setIsScraping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentTabTitle, setCurrentTabTitle] = useState('');
  const [separator, setSeparator] = useState<string>('\t');
  const [customSeparator, setCustomSeparator] = useState<string>('');
  const [removeExtension, setRemoveExtension] = useState<boolean>(false);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [autoShareEnabled, setAutoShareEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userLanguage, setUserLanguage] = useState<string | null>(null);
  const [copyFileNamesOnly, setCopyFileNamesOnly] = useState<boolean>(false);
  const [historySortOption, setHistorySortOption] = useState<HistorySortOption>('time_desc');
  const [recursiveScanEnabled, setRecursiveScanEnabled] = useState<boolean>(false);
  const [removeDirectoryPath, setRemoveDirectoryPath] = useState<boolean>(false);

  const { messages, isLoading } = useMessages(userLanguage);

  useEffect(() => {
    chrome.storage.local.get(['history', 'settings'], (result) => {
      if (result.history) {
        setHistory(result.history);
      }
      const currentSettings = result.settings as UserSettings || {};
      setSeparator(currentSettings.separator || '\t');
      setCustomSeparator(currentSettings.customSeparator || '');
      setRemoveExtension(currentSettings.removeExtension || false);
      setDarkMode(currentSettings.darkMode || false);
      setNotificationsEnabled(currentSettings.notificationsEnabled !== false);
      setAutoShareEnabled(currentSettings.autoShareEnabled || false);
      setUserLanguage(currentSettings.userLanguage || null);
      setCopyFileNamesOnly(currentSettings.copyFileNamesOnly || false);
      setRecursiveScanEnabled(currentSettings.recursiveScanEnabled || false);
      setRemoveDirectoryPath(currentSettings.removeDirectoryPath || false);
    });
  }, []);

  const performCopy = async (textToClipboard: string, uiUpdateKey: string, successMsgKey: string, failMsgKey: string) => {
    setCopyState((prev) => ({ ...prev, [uiUpdateKey]: 'processing' }));
    let operationSuccess = false;
    try {
      await navigator.clipboard.writeText(textToClipboard);
      setCopyState((prev) => ({ ...prev, [uiUpdateKey]: 'completed' }));
      setStatusMessage(getMessage(messages, successMsgKey));
      operationSuccess = true;
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyState((prev) => ({ ...prev, [uiUpdateKey]: 'failed' }));
      setStatusMessage(getMessage(messages, failMsgKey));
    } finally {
      setTimeout(() => {
        if (operationSuccess && statusMessage === getMessage(messages, successMsgKey)) {
          setStatusMessage('');
        }
        setCopyState((prev) => ({ ...prev, [uiUpdateKey]: 'idle' }));
      }, 2000);
    }
  };

  const handleGetLinks = async () => {
    setIsScraping(true);
    setButtonState('idle');
    setOutput('');
    setFileNamesOnlyOutput('');
    setTotalFiles(0);
    setCurrentTabTitle('');
    let originalUrl = '';

    try {
      const [initialTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!initialTab?.id || !initialTab.url) {
        throw new Error(getMessage(messages, 'invalidTabError', 'Invalid tab.')); // Thêm fallback text
      }
      originalUrl = initialTab.url;

      if (!initialTab.url.startsWith('https://drive.google.com/')) {
        setOutput(getMessage(messages, 'invalidPage'));
        setButtonState('failed'); setTimeout(() => setButtonState('idle'), 3000); setIsScraping(false); return;
      }

      let allFilesCollected: DriveFile[] = [];
      let accumulatedTotal = 0;
      const initialTabTitleStr = initialTab.title?.replace(/ - Google Drive$/, '') || getMessage(messages, 'driveScanDefaultTitle', 'Drive Scan');
      setCurrentTabTitle(initialTabTitleStr);
      const activeSeparator = separator === 'other' ? customSeparator : separator;

      if (recursiveScanEnabled) {
        const extractFolderIdFromUrl = (url: string): string | null => {
          const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
          if (folderMatch) return folderMatch[1];
          const driveMatch = url.match(/drive\/(my-drive|shared-with-me|recent|starred|trash)/);
          if (driveMatch) return driveMatch[1];
          if (url.includes('drive.google.com')) return 'root';
          return null;
        };
        const initialFolderId = extractFolderIdFromUrl(initialTab.url);
        if (!initialFolderId) {
          setOutput(getMessage(messages, 'noInitialFolderError', 'Could not determine initial folder. Please navigate to a specific folder.'));
          setButtonState('failed'); setTimeout(() => setButtonState('idle'), 3000); setIsScraping(false); return;
        }
        
        const folderQueue: { id: string; pathPrefix: string; name: string }[] = [{ id: initialFolderId, pathPrefix: '', name: initialTabTitleStr }];
        const visitedFolderIds = new Set<string>();

        while (folderQueue.length > 0) {
          const currentFolder = folderQueue.shift();
          if (!currentFolder || visitedFolderIds.has(currentFolder.id)) continue;
          visitedFolderIds.add(currentFolder.id);
          
          const folderDisplayNameForStatus = currentFolder.name || getMessage(messages, 'genericFolderName', 'folder');
          setStatusMessage(getMessage(messages, 'scanningFolder') +  folderDisplayNameForStatus);

          let targetUrl = `https://drive.google.com/drive/u/0/folders/${currentFolder.id}`;
          if (['root', 'my-drive', 'shared-with-me', 'recent', 'starred', 'trash'].includes(currentFolder.id)) {
            targetUrl = `https://drive.google.com/drive/${currentFolder.id === 'root' ? 'my-drive' : currentFolder.id}`;
          }
          
          const activeTabInfo = await chrome.tabs.get(initialTab.id);
          if (activeTabInfo.url !== targetUrl) {
            await chrome.tabs.update(initialTab.id, { url: targetUrl });
            await new Promise<void>(resolveWait => {
              const listener = (tabIdUpdate: number, changeInfo: chrome.tabs.TabChangeInfo, tabUpdated: chrome.tabs.Tab) => {
                if (tabIdUpdate === initialTab.id && changeInfo.status === 'complete' && tabUpdated.url && 
                    (tabUpdated.url.includes(targetUrl) || tabUpdated.url.includes(currentFolder.id) || (currentFolder.id === 'root' && tabUpdated.url.includes('my-drive')))) {
                  chrome.tabs.onUpdated.removeListener(listener);
                  setTimeout(resolveWait, 3000);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);
            });
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
          
          const extractionResult = await extractFiles(initialTab.id, removeExtension, true);
          const extractedItems = extractionResult.files; 
          const subFoldersToQueue = extractionResult.subFolders; 
          
          accumulatedTotal += extractionResult.total || extractedItems.length;
          setTotalFiles(accumulatedTotal);

          extractedItems.forEach(item => { 
            let finalDisplayName = item.name;
            if (!removeDirectoryPath) { 
              finalDisplayName = `${currentFolder.pathPrefix}${item.name}`;
            }
            allFilesCollected.push({
              ...item, 
              name: finalDisplayName 
            });
          });

          if (subFoldersToQueue) {
            subFoldersToQueue.forEach(subFolderData => { 
              if (!visitedFolderIds.has(subFolderData.id)) {
                folderQueue.push({
                  id: subFolderData.id,
                  name: subFolderData.name, 
                  pathPrefix: `${currentFolder.pathPrefix}${subFolderData.name}/` 
                });
              }
            });
          }
          
          const tempOutputText = allFilesCollected.map(f => `${f.name}${activeSeparator}${f.shareLink}`).join('\n');
          setOutput(tempOutputText);
          const tempFileNamesOnlyText = allFilesCollected.map(f => f.name).join('\n');
          setFileNamesOnlyOutput(tempFileNamesOnlyText);
        }
      } else { 
        const extractionResult = await extractFiles(initialTab.id, removeExtension, false);
        const extractedItems = extractionResult.files;
        accumulatedTotal = extractionResult.total || extractedItems.length;
        setTotalFiles(accumulatedTotal);
        allFilesCollected = extractedItems.map(f => ({...f, name: f.name})); 
      }
      
      if (allFilesCollected.length > 0) {
        const outputText = allFilesCollected.map(file => `${file.name}${activeSeparator}${file.shareLink}`).join('\n');
        setOutput(outputText);

        const fileNamesOnlyText = allFilesCollected.map(file => file.name).join('\n');
        setFileNamesOnlyOutput(fileNamesOnlyText);

        saveHistory({
          timestamp: Date.now(),
          title: currentTabTitle || initialTabTitleStr || getMessage(messages, 'driveScanDefaultTitle', 'Drive Scan'),
          links: outputText, 
          separator: activeSeparator,
        }, (updatedHistory) => setHistory(updatedHistory)
        );
        if (notificationsEnabled) {
          chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            title: getMessage(messages, 'completed'),
            message: `${getMessage(messages, 'totalFiles')}${accumulatedTotal}`
          });
        }
        setButtonState('completed');
      } else {
        setOutput(getMessage(messages, 'noFiles'));
        setButtonState('failed');
      }
      setTimeout(() => setButtonState('idle'), 3000);

    } catch (error) {
      const errorPrefixStr = getMessage(messages, 'errorPrefix', 'Error: ');
      const errorMessageBody = error instanceof Error ? error.message : getMessage(messages, 'unknownExtractionError', 'Unknown error during link extraction');
      setOutput(`${errorPrefixStr}${errorMessageBody}`);
      setButtonState('failed');
      setTimeout(() => setButtonState('idle'), 3000);
    } finally {
      setIsScraping(false);
      setStatusMessage('');
      if (recursiveScanEnabled && originalUrl) {
        try {
          const [finalTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (finalTab && finalTab.id && finalTab.url !== originalUrl) { 
            await chrome.tabs.update(finalTab.id, { url: originalUrl });
          }
        } catch (navError) {
          console.error('Error navigating back to original URL:', navError);
        }
      }
    }
  };
      
  const handleExportCSV = async (linksToExport: string, currentSeparatorValue: string, key: string) => {
    setExportState((prev) => ({ ...prev, [key]: 'processing' }));
    let operationSuccess = false;
    try {
      const activeSepToUse = currentSeparatorValue === 'other' && customSeparator ? customSeparator : currentSeparatorValue;
      const rows = linksToExport.split('\n').map(line => {
        const separatorIndex = line.indexOf(activeSepToUse);
        let name, link;
        if (separatorIndex !== -1) {
          name = line.substring(0, separatorIndex);
          link = line.substring(separatorIndex + activeSepToUse.length);
        } else {
          name = line; 
          link = ''; 
        }
        return `"${name.replace(/"/g, '""')}","${link.replace(/"/g, '""')}"`;
      });
      const csvContent = ['Name,ShareLink', ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const sanitizedTitle = (currentTabTitle || 'drive-links').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      a.href = url;
      a.download = `${sanitizedTitle}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportState((prev) => ({ ...prev, [key]: 'completed' }));
      setStatusMessage(getMessage(messages, 'exportCompleted'));
      operationSuccess = true;
    } catch (error) {
      setExportState((prev) => ({ ...prev, [key]: 'failed' }));
      setStatusMessage(getMessage(messages, 'exportFailed'));
    } finally {
      setTimeout(() => {
        if (operationSuccess && statusMessage === getMessage(messages, 'exportCompleted')) {
          setStatusMessage('');
        }
        setExportState((prev) => ({ ...prev, [key]: 'idle' }));
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

  interface TreeNode {
    name: string;
    children: { [name: string]: TreeNode };
  }

  const buildTreeFromPaths = (paths: string[]): TreeNode => {
    const root: TreeNode = { name: 'root', children: {} };
    paths.forEach(fullPathString => {
      if (!fullPathString || fullPathString.trim() === '') return;
      const parts = fullPathString.split('/').filter(p => p.length > 0);
      if (parts.length === 0) return;
      let currentLevel = root;
      parts.forEach((part) => {
        if (!currentLevel.children[part]) {
          currentLevel.children[part] = { name: part, children: {} };
        }
        currentLevel = currentLevel.children[part];
      });
    });
    return root;
  };

  const formatTreeToStringRecursive = (childrenMap: { [name: string]: TreeNode }, currentPrefix: string): string => {
    let output = '';
    const childrenArray = Object.values(childrenMap);
    childrenArray.forEach((child, index) => {
      const isLast = index === childrenArray.length - 1;
      output += currentPrefix + (isLast ? '└── ' : '├── ') + child.name + '\n';
      if (Object.keys(child.children).length > 0) {
        output += formatTreeToStringRecursive(child.children, currentPrefix + (isLast ? '    ' : '│   '));
      }
    });
    return output;
  };

  const handleCopyTree = async (historyEntryText: string, entrySeparator: string, uiUpdateKey: string) => {
    setCopyTreeState(prev => ({ ...prev, [uiUpdateKey]: 'processing' }));
    let operationSuccess = false;
    try {
      const lines = historyEntryText.split('\n');
      const namesWithPath: string[] = [];
      let hasPathData = false;
      lines.forEach(line => {
        if (line.trim() === '') return;
        const parts = line.split(entrySeparator);
        const name = parts[0];
        if (name) {
          namesWithPath.push(name);
          if (name.includes('/')) hasPathData = true;
        }
      });

      if (namesWithPath.length === 0) throw new Error(getMessage(messages, 'noDataToCopy'));

      let treeString: string;
      if (!hasPathData || namesWithPath.length === 1) {
        treeString = namesWithPath.join('\n');
      } else {
        const treeRoot = buildTreeFromPaths(namesWithPath);
        treeString = formatTreeToStringRecursive(treeRoot.children, '').trim();
      }

      if (!treeString && namesWithPath.length > 0) {
        treeString = namesWithPath.join('\n');
      }
      if (!treeString) throw new Error(getMessage(messages, 'noDataToCopy'));

      await navigator.clipboard.writeText(treeString);
      setCopyTreeState(prev => ({ ...prev, [uiUpdateKey]: 'completed' }));
      setStatusMessage(getMessage(messages, 'copyTreeCompleted'));
      operationSuccess = true;
    } catch (error) {
      console.error('Failed to copy tree:', error);
      setCopyTreeState(prev => ({ ...prev, [uiUpdateKey]: 'failed' }));
      const errorMsg = error instanceof Error ? error.message : getMessage(messages, 'copyTreeFailed');
      setStatusMessage(errorMsg);
    } finally {
      setTimeout(() => {
        if (operationSuccess && statusMessage === getMessage(messages, 'copyTreeCompleted')) {
          setStatusMessage('');
        }
        setCopyTreeState(prev => ({ ...prev, [uiUpdateKey]: 'idle' }));
      }, 3000);
    }
  };

  if (isLoading) return <div className="popup-container">{getMessage(messages, 'processing', 'Loading...')}</div>;

  const activeSeparatorDisplay = separator === 'other' ? customSeparator : separator;

  return (
    <div className={`popup-container ${darkMode ? 'dark-mode' : ''}`}>
      <h1>{getMessage(messages, 'title')}</h1>
      <div className="tabs">
        <button className={`tab-button ${!showHistory && !showSettings ? 'active' : ''}`} onClick={() => { setShowHistory(false); setShowSettings(false); }}>{getMessage(messages, 'homeTab')}</button>
        <button className={`tab-button ${showHistory ? 'active' : ''}`} onClick={() => { setShowHistory(true); setShowSettings(false); }}>{getMessage(messages, 'historyTab')}</button>
        <button className={`tab-button ${showSettings ? 'active' : ''}`} onClick={() => { setShowHistory(false); setShowSettings(true); }}>{getMessage(messages, 'settingsTab')}</button>
      </div>
      {statusMessage && <span className="status-message">{statusMessage}</span>}

      {showSettings ? (
        <Suspense fallback={<div>{getMessage(messages, 'processing')}</div>}>
          <Settings
            separator={separator} setSeparator={setSeparator}
            removeExtension={removeExtension} setRemoveExtension={setRemoveExtension}
            darkMode={darkMode} setDarkMode={setDarkMode}
            notificationsEnabled={notificationsEnabled} setNotificationsEnabled={setNotificationsEnabled}
            autoShareEnabled={autoShareEnabled} setAutoShareEnabled={setAutoShareEnabled}
            userLanguage={userLanguage} setUserLanguage={setUserLanguage}
            copyFileNamesOnly={copyFileNamesOnly} setCopyFileNamesOnly={setCopyFileNamesOnly}
            recursiveScanEnabled={recursiveScanEnabled} setRecursiveScanEnabled={setRecursiveScanEnabled}
            removeDirectoryPath={removeDirectoryPath} setRemoveDirectoryPath={setRemoveDirectoryPath}
          />
        </Suspense>
      ) : showHistory ? (
        <HistoryTab
          history={history}
          searchQuery={searchQuery}
          copyState={copyState}
          exportState={exportState}
          copyTreeState={copyTreeState}
          messages={messages}
          setSearchQuery={setSearchQuery}
          performCopy={performCopy}
          performExport={(entryLinks, entrySeparator, key) => handleExportCSV(entryLinks, entrySeparator, key)}
          handleCopyTree={handleCopyTree}
          handleClearHistory={handleClearHistory}
          formatDate={formatDate}
          copyFileNamesOnlyGlobal={copyFileNamesOnly}
          removeDirectoryPathGlobal={removeDirectoryPath}
          currentSort={historySortOption}
          setSort={setHistorySortOption}
        />
      ) : (
        <HomeTab
          output={output}
          fileNamesOnlyOutput={fileNamesOnlyOutput}
          buttonState={buttonState}
          copyState={copyState}
          exportState={exportState}
          isScraping={isScraping}
          totalFiles={totalFiles}
          messages={messages}
          separator={activeSeparatorDisplay} 
          handleGetLinks={handleGetLinks}
          performCopy={performCopy}
          performExport={(homeOutput, homeSeparator, key) => handleExportCSV(homeOutput, homeSeparator, key)}
          copyFileNamesOnlyGlobal={copyFileNamesOnly}
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