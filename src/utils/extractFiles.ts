// src/utils/extractFiles.ts
import { DriveFile } from '../types'; //

export interface ExtractionResult {
  files: DriveFile[];
  subFolders?: { id: string; name: string }[];
  total: number;
} //

export const extractFiles = async (
  tabId: number,
  removeExtension: boolean,
  isRecursiveContext: boolean
): Promise<ExtractionResult> => {
  try {
    const results = await new Promise<chrome.scripting.InjectionResult<ExtractionResult>[]>((resolve, reject) => {
      chrome.scripting.executeScript<[boolean, boolean], ExtractionResult>({
        target: { tabId },
        func: (removeExt, recursiveContextFlag) => {
          const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

          const getFileLink = (type: string, id: string): string => {
            // ... (logic getFileLink không đổi)
            let fileLink = 'Not Available';
            const normalizedType = type.toLowerCase();
            if (normalizedType.includes('folder') || normalizedType.includes('thư mục')) {
              fileLink = `https://drive.google.com/drive/folders/${id}`;
            } else if (normalizedType.includes('apps script')) {
              fileLink = `https://script.google.com/home/projects/${id}/edit`;
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
          }; //

          // Bọc logic async trong một hàm và gọi nó
          const executeAsyncLogic = async (resolveFn: (value: ExtractionResult | PromiseLike<ExtractionResult>) => void) => {
            let attempts = 0;
            const maxAttempts = 30;
            let lastScrollHeight = 0;
            let noChangeCount = 0;

            // checkElements vẫn có thể là async vì nó được await bên trong executeAsyncLogic
            const checkElements = async () => {
              const itemElements = document.querySelectorAll('div[data-id]:not([data-tooltip-unhoverable])');
              const scrollableView = document.querySelector('div.aqZSwc.FoN4ef') ||
                                  document.querySelector('div.bhBody') ||
                                  document.querySelector('div.NgkFIf') ||
                                  document.body;

              if (document.readyState === 'complete' && itemElements.length > 0) {
                if (scrollableView) {
                  scrollableView.scrollTo(0, scrollableView.scrollHeight);
                } else {
                  window.scrollTo(0, document.body.scrollHeight);
                }
                await sleep(800);

                const currentScrollHeight = scrollableView?.scrollHeight || document.body.scrollHeight;
                if (currentScrollHeight === lastScrollHeight) {
                  noChangeCount++;
                } else {
                  noChangeCount = 0;
                }
                lastScrollHeight = currentScrollHeight;

                const updatedItemElements = document.querySelectorAll('div[data-id]:not([data-tooltip-unhoverable])');
                if ((updatedItemElements.length > itemElements.length || noChangeCount < 3) && attempts < maxAttempts) {
                  attempts++;
                  setTimeout(checkElements, 500); // setTimeout không trả về Promise, nên không await ở đây
                  return;
                }

                await sleep(500);
                const finalItemElements = document.querySelectorAll('div[data-id]:not([data-tooltip-unhoverable])');
                const allItemsResult: DriveFile[] = [];
                const subFoldersForQueue: { id: string; name: string }[] = [];

                finalItemElements.forEach(el => {
                  const id = el.getAttribute('data-id');
                  if (!id) return;
                  let name = '';
                  const specificNameElement = el.querySelector('.KL4NAf') || el.querySelector('.Q5txwe') || el.querySelector('div[role="option"] span:not([class])');
                  if (specificNameElement) {
                    name = specificNameElement.textContent || '';
                  }
                  if (!name.trim()) {
                    const nameElViaTooltip = el.querySelector('div[data-tooltip-text]');
                    if (nameElViaTooltip) name = nameElViaTooltip.getAttribute('data-tooltip-text') || '';
                  }
                  if (!name.trim()) {
                    name = el.getAttribute('aria-label') || el.querySelector('[aria-label]')?.getAttribute('aria-label') || '';
                  }
                  name = name.trim();
                  if (name.toLowerCase().startsWith('folder, ')) name = name.substring('folder, '.length).trim();
                  else if (name.toLowerCase().startsWith('thư mục, ')) name = name.substring('thư mục, '.length).trim();
                  else if (name.toLowerCase().startsWith('file, ')) name = name.substring('file, '.length).trim();
                  else if (name.toLowerCase().startsWith('tệp, ')) name = name.substring('tệp, '.length).trim();
                  if (!name.trim()) name = 'Unknown';
                  
                  const originalNameBeforeExtRemoval = name;
                  if (removeExt && name !== 'Unknown') {
                    name = name.replace(/\.[^/.]+$/, '');
                  }
                  
                  const ariaLabel = el.getAttribute('aria-label') || '';
                  const isFolder = ariaLabel.toLowerCase().startsWith('folder') || 
                                   ariaLabel.toLowerCase().includes('thư mục') ||
                                   el.querySelector('img[src*="folder"]') !== null ||
                                   el.querySelector('div[role="img"][aria-label*="Folder"], div[role="img"][aria-label*="Thư mục"]') !== null;
                  
                  const typeGuess = ariaLabel.split(',')[0].trim() || (isFolder ? 'Google Drive Folder' : originalNameBeforeExtRemoval);
                  const shareLink = getFileLink(typeGuess, id);
                  allItemsResult.push({ name, shareLink, id });
                  if (recursiveContextFlag && isFolder) {
                    subFoldersForQueue.push({ id, name: name });
                  }
                });
                resolveFn({ files: allItemsResult, subFolders: recursiveContextFlag ? subFoldersForQueue : undefined, total: finalItemElements.length }); // Sử dụng resolveFn được truyền vào
              } else {
                attempts++;
                if (attempts >= maxAttempts) {
                  resolveFn({ files: [], subFolders: recursiveContextFlag ? [] : undefined, total: 0 }); // Sử dụng resolveFn
                } else {
                  setTimeout(checkElements, 700);
                }
              }
            }; // Kết thúc checkElements

            try {
              await checkElements(); // Gọi await ở đây vì checkElements có thể gọi lại chính nó qua setTimeout
              // Tuy nhiên, cách checkElements gọi lại chính nó qua setTimeout không thực sự tạo ra một chuỗi Promise mà await có thể chờ.
              // Cách tốt hơn là checkElements nên trả về một Promise nếu nó sử dụng setTimeout để đệ quy.
              // Hoặc, cấu trúc lại vòng lặp chờ đợi.
              // Vì mục đích sửa lỗi ESLint, chúng ta sẽ để cấu trúc đệ quy setTimeout hiện tại
              // và đảm bảo resolveFn được gọi đúng chỗ.
              // Thực tế, checkElements không cần là async nếu setTimeout được dùng để lặp.
              // Ta sẽ đơn giản hóa:
              checkElements(); // Chỉ cần gọi, logic resolveFn đã nằm trong checkElements.
            } catch (e) {
              // Nếu có lỗi đồng bộ nào đó trong executeAsyncLogic hoặc lỗi từ checkElements không được bắt đúng cách (hiếm)
              // thì có thể reject ở đây, nhưng lỗi ESLint là về executor không được async.
              // ESLint không thích `new Promise(async (resolve, reject) => { await ...; resolve() })`
              // mà thích `new Promise((resolve, reject) => { (async () => { await ...; resolve() })(); })`
              // Hoặc `myAsyncFunc().then(resolve).catch(reject)`
              // Trong trường hợp của bạn, `checkElements` tự quản lý việc gọi `resolvePromise`
              // nên không cần `try/catch` ở đây để gọi `reject` cho lỗi của `checkElements`.
            }

          }; // Kết thúc executeAsyncLogic

          return new Promise((resolvePromiseExecutor) => { // Executor không còn async
            executeAsyncLogic(resolvePromiseExecutor); // Gọi hàm async và truyền resolve của Promise này
          });

        }, // Kết thúc func
        args: [removeExtension, isRecursiveContext],
      })
        .then(resolve) // resolve của Promise ngoài cùng (new Promise<chrome.scripting.InjectionResult...>)
        .catch(reject); // reject của Promise ngoài cùng
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    throw new Error('Script execution failed or returned no result.');
  } catch (error) {
    console.error('extractFiles: Error executing script:', error);
    return { files: [], subFolders: isRecursiveContext ? [] : undefined, total: 0 };
  }
}; //