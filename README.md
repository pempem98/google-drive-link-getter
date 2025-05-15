# Google Drive Links Extractor

A Manifest V3 Chrome extension built with TypeScript, React, and Vite that extracts file names and share links from Google Drive pages on-demand. The extension provides a user-friendly popup interface with tabbed navigation, visual feedback for actions, and customizable settings for a seamless user experience.

## Features

- **On-Demand Link Extraction**: Extracts file names and share links from the current Google Drive page with a single click on the "Get Links" button.
- **Multilingual Support**: Supports Vietnamese and English interfaces, with translations managed in a dedicated file for easy maintenance and extensibility.
- **Customizable Settings**:
  - **Separator Character**: Choose from Tab (default), space, colon (`:`), comma (`,`), hyphen (`-`), or pipe (`|`) to separate file names and links.
  - **File Extension Removal**: Option to remove or keep file extensions (e.g., `.pdf`, `.docx`) in extracted names.
- **File Count Display**: Displays the total number of files detected as a notification in the Home tab.
- **Visual Feedback**: Action buttons (Get Links, Copy, Export) provide dynamic status updates:
  - Green for success (e.g., "Completed", "Copied", "Exported").
  - Red for errors (e.g., "Failed", "Copy failed", "Export failed").
  - Status reverts to idle after 2-3 seconds.
- **Copy to Clipboard**: Copies extracted links in the Home tab or individual history entries in the History tab, with real-time status updates (e.g., "Copying...", "Copied").
- **Export to CSV**: Exports links to a CSV file from the Home tab or History tab, respecting the separator used at extraction time, with status updates (e.g., "Exporting...", "Exported").
- **History Management**: Stores up to 50 extraction history entries, with options to view, copy, export, or clear, ensuring correct separator handling for each entry.
- **Optimized Performance**: Utilizes lazy loading for the Settings component, code-splitting via Vite, and minimal DOM queries to ensure low memory and CPU usage.
- **MV3 Compliance**: Adheres to Chrome’s Manifest V3 requirements with a secure Content Security Policy (CSP).
- **Responsive UI**: Features a clean popup interface with:
  - Tabbed navigation (Home, History, Settings).
  - A boxed layout for buttons in the Home tab.
  - A borderless textarea with a dark background, styled consistently with the History tab.

## Screenshots

![Popup Interface](screenshots/popup.png)
*Popup showing extracted links in the Home tab with a boxed layout, file count notification, and copy/export buttons with status updates in the Home and History tabs.*

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pempem98/google-drive-links-extractor.git
   cd google-drive-links-extractor
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   ```bash
   npm run build
   ```
   This generates the `dist` folder with the compiled extension.

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode" (top-right toggle).
   - Click "Load unpacked" and select the `dist` folder from the project directory.

5. **Test the Extension**:
   - Open a Google Drive folder (e.g., `https://drive.google.com/drive/folders/1oPhY3e2mZSk3147C2kYAhz4OWtJWI0Rn`).
   - Click the extension icon, then go to the "Settings" tab:
     - Select language (Vietnamese or English).
     - Choose separator (default: Tab; other options: space, `:`, `,`, `-`, `|`).
     - Enable/disable file extension removal.
   - Navigate to the "Home" tab and click "Get Links" to extract links:
     - Verify the output uses the selected separator and extension settings.
     - Check the borderless textarea with a darker background.
     - Confirm the file count notification appears above the button box.
   - Test the "Copy to Clipboard" and "Export to CSV" buttons in the Home tab:
     - Ensure buttons display status changes (e.g., "Copying...", "Copied", "Copy failed") with appropriate colors (green for success, red for failure).
   - Go to the "History" tab:
     - Verify each entry has copy and export buttons.
     - Test copying or exporting individual entries, ensuring the correct separator is used and button statuses update (e.g., "Exporting...", "Exported").
   - Use the "Clear History" button to clear history entries.
   - Switch languages to confirm the interface updates correctly.

## Development Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Google Chrome** (latest stable version)

### Project Structure
```
google-drive-links-extractor/
├── manifest.json       # Extension configuration
├── src/
│   ├── popup.tsx       # Popup UI and link extraction logic
│   ├── settings.tsx    # Settings UI for separator, file extension, and language options
│   ├── translations.ts # Translation strings for multilingual support
│   ├── popup.css       # Popup styles
│   ├── popup.html      # Popup HTML template
│   ├── background.ts   # Empty service worker
├── vite.config.ts      # Vite build configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── eslintrc.json       # ESLint configuration
├── README.md           # Project documentation
```

### Scripts
- **Build**: `npm run build` - Compiles the extension to the `dist` folder.
- **Lint**: `npm run lint` - Runs ESLint to check TypeScript and React code.

### Dependencies
- **React**: Powers the popup UI.
- **TypeScript**: Ensures type-safe development.
- **Vite**: Enables fast building and bundling with code-splitting.
- **ESLint**: Maintains code quality with TypeScript and React rules.
- **Tailwind CSS**: Loaded via CDN for efficient styling.
- **adm-zip**: Used for optional ZIP packaging (not included in runtime).

### Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Load the `dist` folder in Chrome as described in the Installation section.
4. Modify code in `src/` and rebuild to test changes.

## Contributing

Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m 'Add your feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

Please ensure code follows the project’s ESLint rules and includes tests if applicable.

## License

[MIT License](LICENSE)

## Acknowledgments

- Built with [Vite](https://vitejs.dev/), [React](https://reactjs.org/), and [TypeScript](https://www.typescriptlang.org/).
- Inspired by the need to simplify Google Drive link extraction.
- Special thanks to the open-source community for tools and libraries that made this project possible.