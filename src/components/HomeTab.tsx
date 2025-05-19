import React from 'react';
import { getMessage } from '../utils/utils'; // Updated path
// import { DriveFile } from '../types';

interface HomeTabProps {
  output: string;
  buttonState: 'idle' | 'completed' | 'failed';
  copyState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  exportState: { [key: string]: 'idle' | 'processing' | 'completed' | 'failed' };
  isScraping: boolean;
  totalFiles: number;
  messages: { [key: string]: { message: string; description?: string } };
  separator: string;
  handleGetLinks: () => void;
  handleCopy: (text: string, key: string) => void;
  handleExportCSV: (links: string, separator: string, key: string) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({
  output,
  buttonState,
  copyState,
  exportState,
  isScraping,
  totalFiles,
  messages,
  separator,
  handleGetLinks,
  handleCopy,
  handleExportCSV,
}) => {
  return (
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
  );
};

export default HomeTab;
