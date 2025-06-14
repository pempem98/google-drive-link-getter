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

            // const rowSelector = 'tbody > tr > td:nth-child(1) > div > div > div:nth-child(2) > div';
            // const cellSelector = 'div[role="gridcell"] > div > div:nth-child(2)';
            // const isListMode = document.querySelectorAll(rowSelector)?.length ? true : false;
            // const currentSelector = isListMode ? rowSelector : cellSelector;
            const currentSelector = 'c-wiz > div[data-id]';

            // checkElements vẫn có thể là async vì nó được await bên trong executeAsyncLogic
            const checkElements = async () => {
              const itemElements = document.querySelectorAll(currentSelector);
              const scrollableView = document.querySelector('div > div > div > c-wiz') || document.body;

              if (document.readyState === 'complete' && itemElements.length > 0) {
                if (scrollableView) {
                  scrollableView.scrollTo(0, scrollableView.scrollHeight);
                }
                await sleep(800);

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
                  setTimeout(checkElements, 500); // setTimeout không trả về Promise, nên không await ở đây
                  return;
                }

                await sleep(500);
                const finalItemElements = document.querySelectorAll(currentSelector);
                const allItemsResult: DriveFile[] = [];
                const subFoldersForQueue: { id: string; name: string }[] = [];

                finalItemElements.forEach(el => {
                  const id = el.getAttribute('data-id');
                  if (!id) return;
                  let name = el.querySelector('span > strong')?.textContent || '';
                  if (!name.trim()) {
                    name = el.querySelector('div[data-id]:nth-last-child(2)')?.textContent || '';
                  }
                  if (!name.trim()) {
                    name = el.querySelector('div:nth-child(2) > div')?.textContent ||
                          el.querySelector('div:nth-child(2)')?.textContent || '';
                  }
                  name = name.trim();
                  if (!name.trim()) name = 'Unknown';
                  if (removeExt && name !== 'Unknown') {
                    name = name.replace(/\.[^/.]+$/, '');
                  }

                  let ariaLabel = el.querySelector('div[aria-label][data-tooltip]')?.getAttribute('data-tooltip');
                  let typeGuess = '';
                  if (ariaLabel && ariaLabel.includes(':')) {
                    typeGuess = ariaLabel.split(':')[0].trim();
                  } else {
                    ariaLabel = el.querySelector('div[aria-label]:has(svg)')?.getAttribute('aria-label');
                    typeGuess = ariaLabel || el.querySelector('svg > title')?.textContent || '';
                  }
                  const shareLink = getFileLink(typeGuess, id);
                  allItemsResult.push({ name, shareLink, id });
                  if (recursiveContextFlag && shareLink.includes('drive.google.com/drive/folders/')) {
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