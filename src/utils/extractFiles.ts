import { DriveFile } from '../types';

export interface ExtractionResult {
  files: DriveFile[];
  subFolders?: { id: string; name: string }[];
  total: number;
}

const scrapeGoogleDrivePage = (
  removeExt: boolean,
  recursiveContextFlag: boolean
): Promise<ExtractionResult> => {
  return new Promise((resolve) => {
    const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

    const getFileLink = (type: string, id: string): string => {
      let fileLink = 'Not Available';
      const normalizedType = type.toLowerCase();
      if (normalizedType.includes('folder') || normalizedType.includes('thư mục')) {
        fileLink = `https://drive.google.com/drive/folders/${id}`;
      } else if (normalizedType.includes('apps script')) {
        fileLink = `https://script.google.com/d/${id}/edit`;
      } else if (normalizedType.includes('sheet') || normalizedType.includes('trang tính')) {
        fileLink = `https://docs.google.com/spreadsheets/d/${id}/edit`;
      } else if (normalizedType.includes('doc') || normalizedType.includes('tài liệu')) {
        fileLink = `https://docs.google.com/document/d/${id}/edit`;
      } else if (normalizedType.includes('slide') || normalizedType.includes('trang trình bày')) {
        fileLink = `https://docs.google.com/presentation/d/${id}/edit`;
      } else if (normalizedType.includes('form') || normalizedType.includes('biểu mẫu')) {
        fileLink = `https://docs.google.com/forms/d/${id}/edit`;
      } else if (normalizedType.includes('drawing') || normalizedType.includes('bản vẽ')) {
        fileLink = `https://docs.google.com/drawings/d/${id}/edit`;
      } else if (normalizedType.includes('site')) {
        fileLink = `https://sites.google.com/site/${id}`;
      } else if (normalizedType.includes('my map') || normalizedType.includes('bản đồ của tôi')) {
        fileLink = `https://www.google.com/maps/d/edit?mid=${id}`;
      } else {
        fileLink = `https://drive.google.com/file/d/${id}/view`;
      }
      return fileLink;
    };

    let attempts = 0;
    const maxAttempts = 30;
    let lastScrollHeight = 0;
    let noChangeCount = 0;

    let currentSelector = 'c-wiz > div[data-id]';
    if (!document.querySelector(currentSelector)) {
      const rowSelector = 'tbody > tr > td:nth-child(1) > div > div';
      const cellSelector = 'div[role="gridcell"]';
      const isListMode = document.querySelectorAll(rowSelector)?.length > 1;
      currentSelector = isListMode ? rowSelector : cellSelector;
    }

    const checkElements = async () => {
      const itemElements = document.querySelectorAll(currentSelector);
      const scrollableView = document.querySelector('div > div > div > c-wiz') || document.body;

      if (document.readyState === 'complete' && itemElements.length > 0) {
        if (scrollableView) {
          scrollableView.scrollTo(0, scrollableView.scrollHeight);
        }
        await sleep(200);

        const currentScrollHeight = scrollableView?.scrollHeight;
        if (currentScrollHeight === lastScrollHeight) {
          noChangeCount++;
        } else {
          noChangeCount = 0;
        }
        lastScrollHeight = currentScrollHeight;

        const updatedItemElements = document.querySelectorAll(currentSelector);

        if ((updatedItemElements.length > itemElements.length || noChangeCount < 3) && attempts < maxAttempts) {
          attempts++;
          setTimeout(checkElements, 100);
          return;
        }

        await sleep(100);
        const finalItemElements = document.querySelectorAll(currentSelector);
        const allItemsResult: DriveFile[] = [];
        const subFoldersForQueue: { id: string; name: string }[] = [];

        finalItemElements.forEach(el => {
          const id = el.getAttribute('data-id') || el.querySelector('div[data-id]')?.getAttribute('data-id');
          if (!id) return;

          let name = el.querySelector('span > strong')?.textContent || '';
          if (!name.trim()) name = el.querySelector('div[data-id]:nth-last-child(2)')?.textContent || '';
          if (!name.trim()) name = (el.querySelector('div:nth-child(2) > div')?.textContent || el.querySelector('div:nth-child(2)')?.textContent || '').trim();
          if (!name.trim()) name = 'Unknown';
          if (removeExt && name !== 'Unknown') name = name.replace(/\.[^/.]+$/, '');

          let ariaLabel = el.querySelector('div[aria-label][data-tooltip]')?.getAttribute('data-tooltip') || el?.getAttribute('arial-label');
          let typeGuess = '';
          if (ariaLabel && ariaLabel.includes(':')) {
            typeGuess = ariaLabel.split(':')[0].trim();
          } else {
            const oldArialLabel = ariaLabel?.replace(name, '').trim();
            ariaLabel = el.querySelector('div[aria-label]:has(svg)')?.getAttribute('aria-label') ?? '';
            typeGuess = ariaLabel || el.querySelector('svg > title')?.textContent || el.querySelector('img[alt]')?.getAttribute('alt') || oldArialLabel || '';
          }
          if (el.querySelector('svg.Q6yead.QJZfhe.jTxgF')) typeGuess = 'Folder';

          const shareLink = getFileLink(typeGuess, id);
          allItemsResult.push({ name, shareLink, id });

          if (recursiveContextFlag && shareLink.includes('drive.google.com/drive/folders/')) {
            subFoldersForQueue.push({ id, name: name });
          }
        });

        resolve({ files: allItemsResult, subFolders: recursiveContextFlag ? subFoldersForQueue : undefined, total: finalItemElements.length });
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          resolve({ files: [], subFolders: recursiveContextFlag ? [] : undefined, total: 0 });
        } else {
          setTimeout(checkElements, 200);
        }
      }
    };

    checkElements();
  });
};

export const extractFiles = async (
  tabId: number,
  removeExtension: boolean,
  isRecursiveContext: boolean
): Promise<ExtractionResult> => {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: scrapeGoogleDrivePage,
      args: [removeExtension, isRecursiveContext],
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    throw new Error('Script execution failed or returned no result.');
  } catch (error) {
    console.error('extractFiles: Error executing script:', error);
    return { files: [], subFolders: isRecursiveContext ? [] : undefined, total: 0 };
  }
};
