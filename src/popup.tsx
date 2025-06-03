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
    try {
      await navigator.clipboard.writeText(textToClipboard);
      setCopyState((prev) => ({ ...prev, [uiUpdateKey]: 'completed' }));
      setStatusMessage(getMessage(messages, successMsgKey));
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyState((prev) => ({ ...prev, [uiUpdateKey]: 'failed' }));
      setStatusMessage(getMessage(messages, failMsgKey));
    } finally {
      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [uiUpdateKey]: 'idle' }));
        // Chỉ clear status nếu không phải lỗi để user thấy lỗi, hoặc nếu là success
        if (copyState[uiUpdateKey] === 'completed' || copyState[uiUpdateKey] === 'idle') {
          setStatusMessage('');
        }
      }, 2000);
    }
  };

  const handleGetLinks = async () => {
    setIsScraping(true);
    setButtonState('idle');
    setOutput('');
    setFileNamesOnlyOutput('');
    setTotalFiles(0);
    if (!currentTabTitle) {
      setCurrentTabTitle('');
    }
    let originalUrl = '';

    try {
      const [initialTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!initialTab?.id || !initialTab.url) throw new Error('Invalid tab.');
      originalUrl = initialTab.url;

      if (!initialTab.url.startsWith('https://drive.google.com/')) { /* ... xử lý lỗi ... */
        setOutput(getMessage(messages, 'invalidPage'));
        setButtonState('failed'); setTimeout(() => setButtonState('idle'), 3000); setIsScraping(false); return;
      }

      let allFilesCollected: DriveFile[] = [];
      let accumulatedTotal = 0;
      const initialTabTitleStr = initialTab.title?.replace(/ - Google Drive$/, '') || 'Google Drive';
      setCurrentTabTitle(initialTabTitleStr);
      const activeSeparator = separator === 'other' ? customSeparator : separator;

      if (recursiveScanEnabled) {
        const extractFolderIdFromUrl = (url: string): string | null => { /* ... như cũ ... */
          const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
          if (folderMatch) return folderMatch[1];
          const driveMatch = url.match(/drive\/(my-drive|shared-with-me|recent|starred|trash)/);
          if (driveMatch) return driveMatch[1];
          if (url.includes('drive.google.com')) return 'root';
          return null;
        };
        const initialFolderId = extractFolderIdFromUrl(initialTab.url);
        if (!initialFolderId) { /* ... xử lý lỗi ... */
          setOutput('Could not determine initial folder. Navigate to a specific folder.');
          setButtonState('failed'); setTimeout(() => setButtonState('idle'), 3000); setIsScraping(false); return;
        }
        
        const folderQueue: { id: string; pathPrefix: string; name: string }[] = [{ id: initialFolderId, pathPrefix: '', name: initialTabTitleStr }];
        const visitedFolderIds = new Set<string>();

        while (folderQueue.length > 0) {
          const currentFolder = folderQueue.shift();
          if (!currentFolder || visitedFolderIds.has(currentFolder.id)) continue;
          visitedFolderIds.add(currentFolder.id);
          const folderDisplayNameForStatus = currentFolder.name || getMessage(messages, 'genericFolderName');
          setStatusMessage(getMessage(messages, 'scanningFolder') + folderDisplayNameForStatus) + '...';

          // ... (Logic điều hướng tab và chờ giữ nguyên như phản hồi trước)
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
          // --- Kết thúc logic điều hướng ---
          
          // Gọi extractFiles, isRecursiveContext = true để nó trả về subFolders cho queue
          const extractionResult = await extractFiles(initialTab.id, removeExtension, true);
          const extractedItems = extractionResult.files; // Đây là danh sách TẤT CẢ items (files và folders) ở cấp hiện tại
          const subFoldersToQueue = extractionResult.subFolders; // Đây là danh sách folder để duyệt tiếp
          
          accumulatedTotal += extractionResult.total || 0; // Hoặc dùng extractedItems.length nếu total không tin cậy
          setTotalFiles(accumulatedTotal);

          // Xử lý TẤT CẢ các item (files và folders) lấy được từ cấp hiện tại
          extractedItems.forEach(item => { // item.name là tên gốc (base name) từ extractFiles
            let finalDisplayName = item.name;
            // Chỉ thêm tiền tố đường dẫn nếu recursiveScan VÀ removeDirectoryPath KHÔNG được chọn
            if (!removeDirectoryPath) { // recursiveScanEnabled đã được kiểm tra ở nhánh ngoài
              finalDisplayName = `${currentFolder.pathPrefix}${item.name}`;
            }
            allFilesCollected.push({
              ...item, // Bao gồm id, shareLink gốc và name gốc (item.name)
              name: finalDisplayName // Ghi đè name bằng finalDisplayName để sử dụng cho output
            });
          });

          // Thêm các thư mục con vào hàng đợi để duyệt tiếp
          if (subFoldersToQueue) {
            subFoldersToQueue.forEach(subFolderData => { // subFolderData.name là tên gốc
              if (!visitedFolderIds.has(subFolderData.id)) {
                folderQueue.push({
                  id: subFolderData.id,
                  name: subFolderData.name, // Tên gốc để hiển thị "Scanning: folder_name"
                  pathPrefix: `${currentFolder.pathPrefix}${subFolderData.name}/` // pathPrefix để xây dựng đường dẫn đầy đủ
                });
              }
            });
          }
          
          // Cập nhật output tạm thời
          const tempOutputText = allFilesCollected.map(f => `${f.name}${activeSeparator}${f.shareLink}`).join('\n');
          setOutput(tempOutputText);
          const tempFileNamesOnlyText = allFilesCollected.map(f => f.name).join('\n');
          setFileNamesOnlyOutput(tempFileNamesOnlyText);
        }
      } else { // Không phải recursive scan
        const extractionResult = await extractFiles(initialTab.id, removeExtension, false);
        const extractedItems = extractionResult.files;
        accumulatedTotal = extractionResult.total || 0; // Hoặc dùng extractedItems.length
        setTotalFiles(accumulatedTotal);
        // Với non-recursive, item.name đã là tên gốc. removeDirectoryPath không ảnh hưởng.
        allFilesCollected = extractedItems.map(f => ({...f, name: f.name})); 
      }
      
      // ... (Phần xử lý output cuối cùng, saveHistory, notification, và finally block giữ nguyên như phản hồi trước)
      if (allFilesCollected.length > 0) {
        const outputText = allFilesCollected.map(file => `${file.name}${activeSeparator}${file.shareLink}`).join('\n');
        setOutput(outputText);

        const fileNamesOnlyText = allFilesCollected.map(file => file.name).join('\n');
        setFileNamesOnlyOutput(fileNamesOnlyText);

        saveHistory({
          timestamp: Date.now(),
          title: currentTabTitle,
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
      console.error('handleGetLinks: Error:', error);
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error during link extraction'}`);
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
    } catch (error) {
      setExportState((prev) => ({ ...prev, [key]: 'failed' }));
      setStatusMessage(getMessage(messages, 'exportFailed'));
    } finally {
      setTimeout(() => {
        setExportState((prev) => ({ ...prev, [key]: 'idle' }));
        if (exportState[key] === 'completed' || exportState[key] === 'idle') {
          setStatusMessage('');
        }
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

  if (isLoading) return <div className="popup-container">Loading...</div>;

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
            removeDirectoryPath={removeDirectoryPath} setRemoveDirectoryPath={setRemoveDirectoryPath} // Đã thêm ở trên
          />
        </Suspense>
      ) : showHistory ? (
        <HistoryTab
          history={history}
          searchQuery={searchQuery}
          copyState={copyState}
          exportState={exportState}
          messages={messages}
          setSearchQuery={setSearchQuery}
          performCopy={performCopy}
          performExport={(entryLinks, entrySeparator, key) => handleExportCSV(entryLinks, entrySeparator, key)}
          handleClearHistory={handleClearHistory}
          formatDate={formatDate}
          copyFileNamesOnlyGlobal={copyFileNamesOnly}
          removeDirectoryPathGlobal={removeDirectoryPath} // Đã thêm ở trên
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