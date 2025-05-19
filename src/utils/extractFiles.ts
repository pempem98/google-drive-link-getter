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
            case 'Google Drive Folder': {
              fileLink = `https://drive.google.com/drive/folders/${id}`;
              break;
            }
            case 'Google Apps Script': {
              fileLink = `https://script.google.com/home/projects/${id}/edit`;
              break;
            }
            case 'Google Sheets': {
              fileLink = `https://docs.google.com/spreadsheets/d/${id}/edit`;
              break;
            }
            case 'Google Docs': {
              fileLink = `https://docs.google.com/document/d/${id}/edit`;
              break;
            }
            case 'Google Slides': {
              fileLink = `https://docs.google.com/presentation/d/${id}/edit`;
              break;
            }
            case 'Google Forms': {
              fileLink = `https://docs.google.com/forms/d/${id}/edit`;
              break;
            }
            case 'Google Drawings': {
              fileLink = `https://docs.google.com/drawings/d/${id}/edit`;
              break;
            }
            case 'Google Sites': {
              fileLink = `https://sites.google.com/site/${id}`;
              break;
            }
            case 'Google My Maps': {
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
              console.log('checkElements: document.readyState:', document.readyState, 'fileElements.length:', fileElements.length); // Debug log
              if (document.readyState === 'complete' && fileElements.length > 0) {
                console.log('checkElements: Found files, preparing to scroll...'); // Debug log
                // Increased delay to 2000ms to allow Google Drive scripts to initialize
                await sleep(2000); // 2000ms delay before scrolling
                console.log('checkElements: Scrolling...'); // Debug log
                if (bodyFrame) {
                  bodyFrame.scrollTo(0, bodyFrame.scrollHeight + 200);
                } else {
                  window.scrollTo(0, document.body.scrollHeight + 200);
                }
                // Reduced delay to 1000ms after scrolling
                await sleep(1000); // 1000ms delay before checking updated file elements
                const updatedFileElements = document.querySelectorAll('div.WYuW0e[data-id]');
                console.log('checkElements: updatedFileElements.length:', updatedFileElements.length); // Debug log
                if (updatedFileElements.length > fileElements.length) {
                  console.log('checkElements: More files found, continuing...'); // Debug log
                  checkElements();
                } else {
                  console.log('checkElements: No more files, resolving...'); // Debug log
                  // Reduced delay to 1000ms
                  await sleep(1000); // 1000ms delay before collecting final file elements
                  const finalFileElements = document.querySelectorAll('div.WYuW0e[data-id]');
                  const files: { name: string; shareLink: string; id: string }[] = [];
                  for (const el of finalFileElements) {
                    const id = el.getAttribute('data-id');
                    const nameElement = el.querySelector('div.KL4NAf') || el.querySelector('div.Q5txwe');
                    let name = nameElement?.textContent?.trim() || 'Unknown';
                    if (removeExtension && name !== 'Unknown') {
                      name = name.replace(/\.[^/.]+$/, '');
                    }
                    if (id) {
                      const type = nameElement?.getAttribute('aria-label')?.split(':')[0] || '';
                      const fileLink = getFileLink(type, id); // Now getFileLink is defined in this context
                      files.push({ name, shareLink: fileLink, id });
                    }
                  }
                  console.log('checkElements: Files collected:', files); // Debug log
                  resolve({ files, total: finalFileElements.length });
                }
                attempts = 0; // Reset attempts if files are found
              } else {
                attempts++;
                console.log('checkElements: No files found, attempts:', attempts); // Debug log
                if (attempts >= maxAttempts) {
                  console.log('checkElements: Max attempts reached, resolving with empty result'); // Debug log
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
          console.log('executeScript: Results:', results); // Debug log
          resolve(results);
        })
        .catch((error) => {
          console.error('executeScript: Error:', error); // Debug log
          reject(error);
        });
    });

    console.log('extractFiles: Results:', results); // Debug log
    return results[0]?.result as { files: DriveFile[]; total: number };
  } catch (error) {
    console.error('extractFiles: Error executing script:', error); // Debug log
    return { files: [], total: 0 }; // Fallback result to ensure promise resolves
  }
};
