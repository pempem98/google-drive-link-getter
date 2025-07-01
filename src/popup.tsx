import React, { useState, useEffect, lazy, Suspense, useReducer } from 'react';
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

const initialState = {
  output: '',
  fileNamesOnlyOutput: '',
  buttonState: 'idle' as 'idle' | 'completed' | 'failed',
  copyState: {} as { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' },
  exportState: {} as { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' },
  copyTreeState: {} as { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' },
  isScraping: false,
  statusMessage: '',
  activeTab: 'home' as 'home' | 'history' | 'settings',
  history: [] as HistoryEntry[],
  currentTabTitle: '',
  totalFiles: 0,
};

type Action =
  | { type: 'SET_HISTORY'; payload: HistoryEntry[] }
  | { type: 'SET_STATUS'; payload: string }
  | { type: 'CLEAR_STATUS' }
  | { type: 'SET_ACTIVE_TAB'; payload: 'home' | 'history' | 'settings' }
  | { type: 'SCRAPE_START' }
  | { type: 'SCRAPE_UPDATE_STATUS'; payload: string }
  | { type: 'SCRAPE_FINISH'; payload: { buttonState: 'completed' | 'failed'; output?: string; fileNamesOnlyOutput?: string; totalFiles?: number; title?: string; history?: HistoryEntry[] } }
  | { type: 'SET_BUTTON_STATE'; payload: 'idle' | 'completed' | 'failed' }
  | { type: 'SET_ACTION_STATE'; payload: { type: 'copy' | 'export' | 'copyTree'; key: string; state: 'idle' | 'processing' | 'completed' | 'failed' } };


function reducer(state: typeof initialState, action: Action): typeof initialState {
  switch (action.type) {
  case 'SET_HISTORY':
    return { ...state, history: action.payload };
  case 'SET_STATUS':
    return { ...state, statusMessage: action.payload };
  case 'CLEAR_STATUS':
    return { ...state, statusMessage: ''};
  case 'SET_ACTIVE_TAB':
    return { ...state, activeTab: action.payload };
  case 'SCRAPE_START':
    return { ...state, isScraping: true, buttonState: 'idle', output: '', fileNamesOnlyOutput: '', totalFiles: 0, statusMessage: '' };
  case 'SCRAPE_UPDATE_STATUS':
    return { ...state, statusMessage: action.payload };
  case 'SCRAPE_FINISH':
    return {
      ...state,
      isScraping: false,
      buttonState: action.payload.buttonState,
      output: action.payload.output ?? state.output,
      fileNamesOnlyOutput: action.payload.fileNamesOnlyOutput ?? state.fileNamesOnlyOutput,
      totalFiles: action.payload.totalFiles ?? state.totalFiles,
      currentTabTitle: action.payload.title ?? state.currentTabTitle,
      history: action.payload.history ?? state.history,
    };
  case 'SET_BUTTON_STATE':
    return {...state, buttonState: action.payload };
  case 'SET_ACTION_STATE':
  {
    const stateKey = `${action.payload.type}State` as 'copyState' | 'exportState' | 'copyTreeState';
    return {
      ...state,
      [stateKey]: {
        ...state[stateKey],
        [action.payload.key]: action.payload.state
      }
    };
  }
  default:
    return state;
  }
}

interface TreeNode {
  name: string;
  children: { [name: string]: TreeNode };
}

const Popup: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { output, fileNamesOnlyOutput, buttonState, copyState, exportState, copyTreeState, isScraping, statusMessage, activeTab, history, currentTabTitle, totalFiles } = state;

  const [settings, setSettings] = useState<UserSettings>({
    separator: '\t',
    customSeparator: '',
    removeExtension: false,
    darkMode: false,
    notificationsEnabled: true,
    autoShareEnabled: false,
    userLanguage: null,
    copyFileNamesOnly: false,
    recursiveScanEnabled: false,
    removeDirectoryPath: false,
  });
  const [historySortOption, setHistorySortOption] = useState<HistorySortOption>('time_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { messages, isLoading } = useMessages(settings.userLanguage);

  useEffect(() => {
    chrome.storage.local.get(['history', 'settings'], (result) => {
      if (result.history) {
        dispatch({ type: 'SET_HISTORY', payload: result.history });
      }
      if (result.settings) {
        setSettings(prev => ({ ...prev, ...result.settings }));
      }
    });
  }, []);
  
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
    dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copyTree', key: uiUpdateKey, state: 'processing' } });
    let success = false;
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

      if (!treeString) throw new Error(getMessage(messages, 'noDataToCopy'));

      await navigator.clipboard.writeText(treeString);
      dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copyTree', key: uiUpdateKey, state: 'completed' } });
      dispatch({ type: 'SET_STATUS', payload: getMessage(messages, 'copyTreeCompleted') });
      success = true;
    } catch (error) {
      console.error('Failed to copy tree:', error);
      dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copyTree', key: uiUpdateKey, state: 'failed' } });
      const errorMsg = error instanceof Error ? error.message : getMessage(messages, 'copyTreeFailed');
      dispatch({ type: 'SET_STATUS', payload: errorMsg });
    } finally {
      setTimeout(() => {
        dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copyTree', key: uiUpdateKey, state: 'idle' } });
        if (success) {
          dispatch({ type: 'CLEAR_STATUS' });
        }
      }, 3000);
    }
  };

  const performCopy = async (textToClipboard: string, uiUpdateKey: string, successMsgKey: string, failMsgKey: string) => {
    dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copy', key: uiUpdateKey, state: 'processing' } });
    try {
      await navigator.clipboard.writeText(textToClipboard);
      dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copy', key: uiUpdateKey, state: 'completed' } });
      dispatch({ type: 'SET_STATUS', payload: getMessage(messages, successMsgKey) });
    } catch (error) {
      console.error('Copy failed:', error);
      dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copy', key: uiUpdateKey, state: 'failed' } });
      dispatch({ type: 'SET_STATUS', payload: getMessage(messages, failMsgKey) });
    } finally {
      setTimeout(() => {
        dispatch({ type: 'SET_ACTION_STATE', payload: { type: 'copy', key: uiUpdateKey, state: 'idle' } });
        if (state.statusMessage === getMessage(messages, successMsgKey)) {
          dispatch({ type: 'CLEAR_STATUS' });
        }
      }, 2000);
    }
  };

  const handleGetLinks = async () => {
    dispatch({ type: 'SCRAPE_START' });
    let originalUrl = '';
  
    try {
      const [initialTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!initialTab?.id || !initialTab.url) {
        throw new Error(getMessage(messages, 'invalidTabError', 'Invalid tab.'));
      }
      originalUrl = initialTab.url;
  
      if (!initialTab.url.startsWith('https://drive.google.com/')) {
        throw new Error(getMessage(messages, 'invalidPage'));
      }
  
      const activeSeparator = settings.separator === 'other' ? settings.customSeparator : settings.separator;
      const initialTabTitleStr = initialTab.title?.replace(/ - Google Drive$/, '') || getMessage(messages, 'driveScanDefaultTitle', 'Drive Scan');
      let allFilesCollected: DriveFile[] = [];
      let accumulatedTotal = 0;

      if (settings.recursiveScanEnabled) {
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
          throw new Error(getMessage(messages, 'noInitialFolderError', 'Could not determine initial folder.'));
        }
            
        const folderQueue: { id: string; pathPrefix: string; name: string }[] = [{ id: initialFolderId, pathPrefix: '', name: initialTabTitleStr }];
        const visitedFolderIds = new Set<string>();
    
        while (folderQueue.length > 0) {
          const currentFolder = folderQueue.shift();
          if (!currentFolder || visitedFolderIds.has(currentFolder.id)) continue;
          visitedFolderIds.add(currentFolder.id);
                
          const folderDisplayNameForStatus = currentFolder.name || getMessage(messages, 'genericFolderName', 'folder');
          dispatch({ type: 'SCRAPE_UPDATE_STATUS', payload: getMessage(messages, 'scanningFolder') + folderDisplayNameForStatus });
    
          let targetUrl = `https://drive.google.com/drive/u/0/folders/${currentFolder.id}`;
          if (['root', 'my-drive', 'shared-with-me', 'recent', 'starred', 'trash'].includes(currentFolder.id)) {
            targetUrl = `https://drive.google.com/drive/${currentFolder.id === 'root' ? 'my-drive' : currentFolder.id}`;
          }
                
          const activeTabInfo = await chrome.tabs.get(initialTab.id);
          if (activeTabInfo.url !== targetUrl) {
            await chrome.tabs.update(initialTab.id, { url: targetUrl });
            await new Promise<void>(resolveWait => {
              const listener = (tabIdUpdate: number, changeInfo: chrome.tabs.TabChangeInfo, tabUpdated: chrome.tabs.Tab) => {
                if (tabIdUpdate === initialTab.id && changeInfo.status === 'complete' && tabUpdated.url && (tabUpdated.url.includes(targetUrl) || tabUpdated.url.includes(currentFolder.id))) {
                  chrome.tabs.onUpdated.removeListener(listener);
                  setTimeout(resolveWait, 3000);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);
            });
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
                
          const extractionResult = await extractFiles(initialTab.id, settings.removeExtension, true);
          accumulatedTotal += extractionResult.total || extractionResult.files.length;

          extractionResult.files.forEach(item => { 
            const finalDisplayName = settings.removeDirectoryPath ? item.name : `${currentFolder.pathPrefix}${item.name}`;
            allFilesCollected.push({ ...item, name: finalDisplayName });
          });
    
          if (extractionResult.subFolders) {
            extractionResult.subFolders.forEach(subFolderData => { 
              if (!visitedFolderIds.has(subFolderData.id)) {
                folderQueue.push({
                  id: subFolderData.id,
                  name: subFolderData.name, 
                  pathPrefix: `${currentFolder.pathPrefix}${subFolderData.name}/` 
                });
              }
            });
          }
        }
      } else {
        const extractionResult = await extractFiles(initialTab.id, settings.removeExtension, false);
        allFilesCollected = extractionResult.files.map(f => ({...f, name: f.name}));
        accumulatedTotal = extractionResult.total || allFilesCollected.length;
      }
      
      if (allFilesCollected.length > 0) {
        const outputText = allFilesCollected.map(file => `${file.name}${activeSeparator}${file.shareLink}`).join('\n');
        const fileNamesOnlyText = allFilesCollected.map(file => file.name).join('\n');
            
        saveHistory({
          timestamp: Date.now(),
          title: initialTabTitleStr,
          links: outputText,
          separator: activeSeparator,
        }, (updatedHistory) => {
          dispatch({ 
            type: 'SCRAPE_FINISH', 
            payload: { 
              buttonState: 'completed', 
              output: outputText, 
              fileNamesOnlyOutput: fileNamesOnlyText, 
              totalFiles: accumulatedTotal, 
              title: initialTabTitleStr, 
              history: updatedHistory 
            } 
          });
        });
      } else {
        throw new Error(getMessage(messages, 'noFiles'));
      }
  
    } catch (error) {
      const message = error instanceof Error ? error.message : getMessage(messages, 'unknownExtractionError', 'Unknown error');
      dispatch({ type: 'SCRAPE_FINISH', payload: { buttonState: 'failed', output: message } });
    } finally {
      setTimeout(() => dispatch({ type: 'SET_BUTTON_STATE', payload: 'idle' }), 3000);
      if (settings.recursiveScanEnabled && originalUrl) {
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

  const handleClearHistory = () => {
    clearHistory(() => {
      dispatch({ type: 'SET_HISTORY', payload: [] });
      dispatch({ type: 'SET_STATUS', payload: getMessage(messages, 'cleared') });
      setTimeout(() => dispatch({ type: 'CLEAR_STATUS' }), 2000);
    });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (isLoading) return <div className="popup-container">{getMessage(messages, 'processing', 'Loading...')}</div>;
  
  const activeSeparatorDisplay = settings.separator === 'other' ? settings.customSeparator : settings.separator;

  return (
    <div className={`popup-container ${settings.darkMode ? 'dark-mode' : ''}`}>
      <h1>{getMessage(messages, 'title')}</h1>
      <div className="tabs">
        <button className={`tab-button ${activeTab === 'home' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'home' })}>{getMessage(messages, 'homeTab')}</button>
        <button className={`tab-button ${activeTab === 'history' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'history' })}>{getMessage(messages, 'historyTab')}</button>
        <button className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'settings' })}>{getMessage(messages, 'settingsTab')}</button>
      </div>
      {statusMessage && <span className="status-message">{statusMessage}</span>}

      {activeTab === 'settings' ? (
        <Suspense fallback={<div>{getMessage(messages, 'processing')}</div>}>
          <Settings settings={settings} setSettings={setSettings} />
        </Suspense>
      ) : activeTab === 'history' ? (
        <HistoryTab
          history={history}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          copyState={copyState}
          exportState={exportState}
          copyTreeState={copyTreeState}
          messages={messages}
          performCopy={performCopy}
          performExport={() => {}}
          handleCopyTree={handleCopyTree}
          handleClearHistory={handleClearHistory}
          formatDate={formatDate}
          copyFileNamesOnlyGlobal={settings.copyFileNamesOnly}
          removeDirectoryPathGlobal={settings.removeDirectoryPath}
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
          performExport={() => {}}
          copyFileNamesOnlyGlobal={settings.copyFileNamesOnly}
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