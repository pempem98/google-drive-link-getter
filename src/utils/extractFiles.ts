import { DriveFile } from '../types';

export const extractFiles = async (
  tabId: number,
  removeExtension: boolean
): Promise<{ files: DriveFile[]; total: number }> => {
  try {
    const results = await new Promise((resolve, reject) => {
      chrome.scripting.executeScript({
        target: { tabId },
        func: (removeExtension: boolean) => {
          const sleep = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));

          // Define getFileLink directly in the injected script context
          const getFileLink = (type: string, id: string): string => {
            let fileLink = 'Not Available';
            switch (type) {
            // Gộp case tiếng Anh và tiếng Việt
            case 'Google Drive Folder':
            case 'Thư mục Google Drive': {
              fileLink = `https://drive.google.com/drive/folders/${id}`;
              break;
            }
            case 'Google Apps Script': {
              fileLink = `https://script.google.com/home/projects/${id}/edit`;
              break;
            }
            case 'Google Sheets':
            case 'Google Trang tính': {
              fileLink = `https://docs.google.com/spreadsheets/d/${id}/edit`;
              break;
            }
            case 'Google Docs':
            case 'Google Tài liệu': {
              fileLink = `https://docs.google.com/document/d/${id}/edit`;
              break;
            }
            case 'Google Slides':
            case 'Google Trang trình bày': {
              fileLink = `https://docs.google.com/presentation/d/${id}/edit`;
              break;
            }
            case 'Google Forms':
            case 'Google Biểu mẫu': {
              fileLink = `https://docs.google.com/forms/d/${id}/edit`;
              break;
            }
            case 'Google Drawings':
            case 'Google Bản vẽ': {
              fileLink = `https://docs.google.com/drawings/d/${id}/edit`;
              break;
            }
            case 'Google Sites': {
              fileLink = `https://sites.google.com/site/${id}`;
              break;
            }
            case 'Google My Maps':
            case 'Google Bản đồ của tôi': {
              fileLink = `https://www.google.com/maps/d/edit?mid=${id}`;
              break;
            }
            default: {
              fileLink = `https://drive.google.com/file/d/${id}/view`;
              break;
            }
            }
            return fileLink;
          };

          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // Limit to 50 attempts

            const checkElements = async () => {
              const fileElements = document.querySelectorAll('div.WYuW0e[data-id]');
              const bodyFrame = document.querySelector('div > c-wiz.PEfnhb');
              console.log('checkElements: document.readyState:', document.readyState, 'fileElements.length:', fileElements.length);
              if (document.readyState === 'complete' && fileElements.length > 0) {
                console.log('checkElements: Found files, preparing to scroll...');
                // Increased delay to 2000ms to allow Google Drive scripts to initialize
                await sleep(2000); // 2000ms delay before scrolling
                console.log('checkElements: Scrolling...');
                if (bodyFrame) {
                  bodyFrame.scrollTo(0, bodyFrame.scrollHeight + 200);
                } else {
                  window.scrollTo(0, document.body.scrollHeight + 200);
                }
                // Reduced delay to 1000ms after scrolling
                await sleep(1000); // 1000ms delay before checking updated file elements
                const updatedFileElements = document.querySelectorAll('div.WYuW0e[data-id]');
                console.log('checkElements: updatedFileElements.length:', updatedFileElements.length);
                if (updatedFileElements.length > fileElements.length) {
                  console.log('checkElements: More files found, continuing...');
                  checkElements();
                } else {
                  console.log('checkElements: No more files, resolving...');
                  // Reduced delay to 1000ms
                  await sleep(1000); // 1000ms delay before collecting final file elements
                  const finalFileElements = document.querySelectorAll('div.WYuW0e[data-id]');
                  const files: { name: string; shareLink: string; id: string; type: string }[] = [];
                  for (const el of finalFileElements) {
                    const id = el.getAttribute('data-id');
                    const nameElement = el.querySelector('div.KL4NAf') || el.querySelector('div.Q5txwe');
                    let name = nameElement?.textContent?.trim() || 'Unknown';
                    if (removeExtension && name !== 'Unknown') {
                      name = name.replace(/\.[^/.]+$/, '');
                    }
                    if (id) {
                      const fullName = nameElement?.getAttribute('aria-label');
                      const type = fullName?.split(':')[0] || '';
                      const fileLink = getFileLink(type, id); // Now getFileLink is defined in this context
                      files.push({ name, shareLink: fileLink, id, type });
                    }
                  }
                  console.log('checkElements: Files collected:', files);
                  resolve({ files, total: finalFileElements.length });
                }
                attempts = 0; // Reset attempts if files are found
              } else {
                attempts++;
                console.log('checkElements: No files found, attempts:', attempts);
                if (attempts >= maxAttempts) {
                  console.log('checkElements: Max attempts reached, resolving with empty result');
                  resolve({ files: [], total: 0 }); // Resolve with empty result if max attempts reached
                  return;
                }
                setTimeout(checkElements, 500);
              }
            };

            checkElements();
          });
        },
        args: [removeExtension],
      })
        .then((results) => {
          console.log('executeScript: Results:', results);
          resolve(results);
        })
        .catch((error) => {
          console.error('executeScript: Error:', error);
          reject(error);
        });
    });

    console.log('extractFiles: Results:', results);
    return results[0]?.result as { files: DriveFile[]; total: number };
  } catch (error) {
    console.error('extractFiles: Error executing script:', error);
    return { files: [], total: 0 }; // Fallback result to ensure promise resolves
  }
};
