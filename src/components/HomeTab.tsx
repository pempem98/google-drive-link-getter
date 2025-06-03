// src/components/HomeTab.tsx
import React from 'react';
import { getMessage } from '../utils/utils';
import { Messages } from '../types';

interface HomeTabProps {
  output: string;
  fileNamesOnlyOutput: string;
  buttonState: 'idle' | 'completed' | 'failed';
  copyState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  exportState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  isScraping: boolean;
  totalFiles: number;
  messages: Messages;
  separator: string;
  handleGetLinks: () => void;
  performCopy: (textToClipboard: string, uiUpdateKey: string, successMsgKey: string, failMsgKey: string) => void;
  performExport: (linksToExport: string, currentSeparatorValue: string, key: string) => void;
  copyFileNamesOnlyGlobal: boolean;
}

const HomeTab: React.FC<HomeTabProps> = ({
  output,
  fileNamesOnlyOutput,
  buttonState,
  copyState,
  exportState,
  isScraping,
  totalFiles,
  messages,
  separator,
  handleGetLinks,
  performCopy,
  performExport,
  copyFileNamesOnlyGlobal,
}) => {

  const handleCopyClick = () => {
    const textToCopy = copyFileNamesOnlyGlobal ? fileNamesOnlyOutput : output;
    const successKey = copyFileNamesOnlyGlobal ? 'copiedFileNames' : 'copyCompleted';
    const failKey = copyFileNamesOnlyGlobal ? 'copyFileNamesFailed' : 'copyFailed';
    performCopy(textToCopy, 'main', successKey, failKey);
  };

  const handleExportClick = () => {
    performExport(output, separator, 'main');
  };

  return (
    <div className="links-container">
      {totalFiles > 0 && (
        <p className="total-files">{getMessage(messages, 'totalFiles')}{totalFiles}</p>
      )}
      <div className="links-box">
        <div className="button-container">
          <button /* ... Get Links button ... */
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
            onClick={handleCopyClick}
            disabled={!output && !fileNamesOnlyOutput}
          >
            {copyState['main'] === 'processing' ? getMessage(messages, 'copyProcessing') :
              copyState['main'] === 'completed' ? getMessage(messages, 'copyCompleted') :
                copyState['main'] === 'failed' ? getMessage(messages, 'copyFailed') :
                  getMessage(messages, 'copy')}
          </button>
          <button /* ... Export button ... */
            className={`export-button ${exportState['main'] === 'completed' ? 'completed' : exportState['main'] === 'failed' ? 'failed' : ''}`}
            onClick={handleExportClick}
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
          value={copyFileNamesOnlyGlobal ? fileNamesOnlyOutput : output}
          readOnly
          rows={10}
        />
      </div>
    </div>
  );
};

export default HomeTab;