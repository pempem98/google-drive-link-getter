import React from 'react';
import { translations } from './translations';

interface SettingsProps {
  separator: string;
  setSeparator: (value: string) => void;
  removeExtension: boolean;
  setRemoveExtension: (value: boolean) => void;
  language: string;
  setLanguage: (value: string) => void;
}

const Settings: React.FC<SettingsProps> = ({
  separator,
  setSeparator,
  removeExtension,
  setRemoveExtension,
  language,
  setLanguage,
}) => {
  const t = translations[language as keyof typeof translations] || translations.vi;

  const handleSeparatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeparator = e.target.value === 'tab' ? '\t' : e.target.value;
    setSeparator(newSeparator);
    chrome.storage.local.set({ settings: { separator: newSeparator, removeExtension, language } });
  };

  const handleExtensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setRemoveExtension(newValue);
    chrome.storage.local.set({ settings: { separator, removeExtension: newValue, language } });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    chrome.storage.local.set({ settings: { separator, removeExtension, language: newLanguage } });
  };

  return (
    <div className="settings-container">
      <h2>{t.settingsTab}</h2>
      <div className="setting-item">
        <label>{t.languageLabel}</label>
        <select value={language} onChange={handleLanguageChange}>
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="setting-item">
        <label>{t.separatorLabel}</label>
        <select value={separator === '\t' ? 'tab' : separator} onChange={handleSeparatorChange}>
          <option value="tab">Tab</option>
          <option value=" ">Space</option>
          <option value=":">Colon (:)</option>
          <option value=",">Comma (,)</option>
          <option value="-">Hyphen (-)</option>
          <option value="|">Pipe (|)</option>
        </select>
      </div>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={removeExtension}
            onChange={handleExtensionChange}
          />
          {t.extensionLabel}
        </label>
      </div>
    </div>
  );
};

export default Settings;