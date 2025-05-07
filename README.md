# Google Drive File Link Extractor

A Manifest V3 Chrome extension built with TypeScript, React, and Vite that extracts file names and share links from Google Drive pages on-demand. The extension provides a user-friendly popup interface to display links, with visual feedback for success or failure and a copy-to-clipboard feature for easy sharing.

## Features

- **On-Demand Link Extraction**: Extracts file names and share links from the current Google Drive page when the "Get Links" button is clicked.
- **Visual Feedback**: Button turns green ("Completed") for successful extraction or red ("Failed") for errors, reverting after 3 seconds.
- **Copy to Clipboard**: Allows users to copy the extracted links with a single click.
- **Optimized Performance**: Uses lazy loading, code-splitting, and minimal DOM queries to ensure low memory and CPU usage.
- **MV3 Compliance**: Adheres to Chrome’s Manifest V3 requirements with a secure Content Security Policy (CSP).
- **Responsive UI**: Clean popup interface with a centered, bold/italic header and monospace textarea for links.

## Screenshots

![Popup Interface](screenshots/popup.png)
*Popup showing extracted links with "Get Links" button and copy functionality.*

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/ggdrive-link-extractor.git
   cd ggdrive-link-extractor
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
   - Click the extension icon, then click "Get Links" to extract links.
   - Use the "Copy to Clipboard" button to copy the results.

## Development Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Google Chrome** (latest stable version)

### Project Structure
```
ggdrive-link-extractor/
├── manifest.json       # Extension configuration
├── src/
│   ├── popup.tsx       # Popup UI and link extraction logic
│   ├── popup.css       # Popup styles
│   ├── popup.html      # Popup HTML template
│   ├── background.ts   # Empty service worker
├── vite.config.ts      # Vite build configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── .eslintrc.json      # ESLint configuration
├── README.md           # Project documentation
```

### Scripts
- **Build**: `npm run build` - Compiles the extension to the `dist` folder.
- **Lint**: `npm run lint` - Runs ESLint to check TypeScript and React code.

### Dependencies
- **React**: For the popup UI.
- **TypeScript**: For type-safe development.
- **Vite**: For fast building and bundling.
- **ESLint**: For code quality.
- **Tailwind CSS**: Loaded via CDN for styling.

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

