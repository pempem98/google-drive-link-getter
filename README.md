# Google Drive Link Getter

A Manifest V3 Chrome extension built with TypeScript, React, and Vite that extracts file names and share links from Google Drive pages on-demand. The extension provides a user-friendly popup interface with tabbed navigation (Home, History, Settings), visual feedback for actions, customizable settings, and optimized performance for a seamless user experience.

## Features

- **On-Demand Link Extraction**: Extracts file names and share links from the current Google Drive page with a single click on the "Get Links" button in the Home tab.
- **Multilingual Support**: Supports Vietnamese and English interfaces, with translations managed in `_locales/` for easy maintenance and extensibility.
- **Customizable Settings** (in Settings tab):
  - **Language Selection**: Choose between Vietnamese, English, or browser default.
  - **Separator Character**: Select from Tab (default), space, colon (`:`), comma (`,`), hyphen (`-`), pipe (`|`), or a custom separator.
  - **File Extension Removal**: Option to remove or keep file extensions (e.g., `.pdf`, `.docx`) in extracted names.
  - **Dark Mode**: Toggle between light and dark themes, with button states styled accordingly.
  - **Notifications**: Enable/disable browser notifications for completed actions.
- **File Count Display**: Shows the total number of files detected as a notification above the button box in the Home tab.
- **Visual Feedback**: Action buttons (Get Links, Copy, Export, Clear History) provide dynamic status updates:
  - Green for success (e.g., "Completed", "Copied", "Exported").
  - Red for errors (e.g., "Failed", "Copy failed", "Export failed").
  - Status reverts to idle after 2-3 seconds.
- **Copy to Clipboard**: Copies extracted links in the Home tab or individual history entries in the History tab, with real-time status updates (e.g., "Copying...", "Copied").
- **Export to CSV**: Exports links to a CSV file from the Home tab or History tab, respecting the separator used at extraction time, with status updates (e.g., "Exporting...", "Exported").
- **History Management** (in History tab):
  - Stores up to 50 extraction history entries.
  - Features a search bar to filter entries by title or date.
  - Allows copying or exporting individual entries, ensuring the correct separator is used.
  - Includes a "Clear History" button to remove all entries.
  - No horizontal scrollbar, with content wrapping for long links.
- **Optimized Performance**:
  - Utilizes lazy loading for the Settings tab via React's `lazy` and `Suspense`.
  - Implements code-splitting via Vite for smaller bundle sizes.
  - Minimizes DOM queries to reduce memory and CPU usage.
  - Efficient scrolling logic to load additional files in Google Drive.
- **MV3 Compliance**: Adheres to Chrome’s Manifest V3 requirements with a secure Content Security Policy (CSP).
- **Responsive UI**:
  - Tabbed navigation (Home, History, Settings) with a clean, boxed layout.
  - Borderless textarea with a dark background in the Home tab, styled consistently with the History tab.
  - Dark mode support with button state colors (green for success, red for failure).

## Screenshots

![Popup Interface](screenshots/popup.png)  
*Popup showing extracted links in the Home tab with a boxed layout, file count notification, and copy/export buttons with status updates in the Home and History tabs.*

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pempem98/google-drive-link-getter.git
   cd google-drive-link-getter
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
   - Click the extension icon to open the popup:
     - **Settings Tab**:
       - Select language (Vietnamese, English, or browser default).
       - Choose separator (default: Tab; other options: space, `:`, `,`, `-`, `|`, or custom).
       - Enable/disable file extension removal, dark mode, and notifications.
     - **Home Tab**:
       - Click "Get Links" to extract links.
       - Verify the output uses the selected separator and extension settings.
       - Check the borderless textarea with a darker background.
       - Confirm the file count notification appears above the button box.
       - Test the "Copy to Clipboard" and "Export to CSV" buttons:
         - Ensure buttons display status changes (e.g., "Copying...", "Copied", "Copy failed") with appropriate colors (green for success, red for failure).
     - **History Tab**:
       - Verify each entry has copy and export buttons.
       - Test copying or exporting individual entries, ensuring the correct separator is used and button statuses update (e.g., "Exporting...", "Exported").
       - Use the search bar to filter entries by title or date.
       - Use the "Clear History" button to clear history entries.
       - Confirm no horizontal scrollbar, with content wrapping for long links.
   - Switch languages to confirm the interface updates correctly.
   - Toggle dark mode to verify button states and theme changes.

## Development Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Google Chrome** (latest stable version)

### Project Structure
```
google-drive-link-getter/
├── manifest.json       # Extension configuration
├── src/
│   ├── components/
│   │   ├── HomeTab.tsx         # Home tab UI for link extraction
│   │   ├── HistoryTab.tsx      # History tab UI for viewing and managing history
│   │   ├── LanguageSetting.tsx # Language selection UI in Settings tab
│   │   ├── SeparatorSetting.tsx # Separator selection UI in Settings tab
│   │   ├── CheckboxSetting.tsx # Checkbox UI for settings (e.g., dark mode, notifications)
│   │   └── Settings.tsx        # Settings tab UI for customization
│   ├── hooks/
│   │   └── useMessages.ts      # Custom hook for managing multilingual messages
│   ├── styles/
│   │   ├── global.css          # Global styles for the popup
│   │   ├── homeTab.css         # Styles for the Home tab
│   │   ├── historyTab.css      # Styles for the History tab
│   │   ├── settingsTab.css     # Styles for the Settings tab
│   │   └── index.css           # Main CSS file importing all styles
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── utils/
│   │   ├── extractFiles.ts     # Logic for extracting files from Google Drive
│   │   ├── storageUtils.ts     # Utilities for managing chrome.storage
│   │   └── utils.ts            # General utilities (e.g., i18n message loading)
│   ├── popup.tsx               # Main popup UI and core logic
│   ├── popup.html              # Popup HTML template
│   ├── background.ts           # Service worker for notifications
├── vite.config.ts              # Vite build configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── eslintrc.json               # ESLint configuration
├── README.md                   # Project documentation
```

### Scripts
- **Build**: `npm run build` - Compiles the extension to the `dist` folder using Vite.
- **Lint**: `npm run lint` - Runs ESLint to check TypeScript and React code.
- **Lint Fix**: `npm run lint:fix` - Runs ESLint and automatically fixes issues where possible.

### Dependencies
- **React**: Powers the popup UI with component-based architecture.
- **TypeScript**: Ensures type-safe development with interfaces and types defined in `types/`.
- **Vite**: Enables fast building, bundling, and code-splitting for optimized performance.
- **ESLint**: Maintains code quality with TypeScript and React rules.
- **Tailwind CSS**: Loaded via CDN for efficient styling of the popup UI.

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
4. Modify code in `src/` and rebuild to test changes:
   ```bash
   npm run build
   ```
5. Run linting to ensure code quality:
   ```bash
   npm run lint:fix
   ```

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