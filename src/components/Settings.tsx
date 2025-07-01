import React from 'react';
import LanguageSetting from './LanguageSetting';
import SeparatorSetting from './SeparatorSetting';
import CheckboxSetting from './CheckboxSetting';
import { useMessages } from '../hooks/useMessages';
import { saveSettings } from '../utils/storageUtils';
import { getMessage } from '../utils/utils';
import { UserSettings } from '../types';

interface SettingsProps {
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const { messages, isLoading } = useMessages(settings.userLanguage);

  const handleSettingChange = (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSeparatorChange = (newSeparator: string, newCustomSeparator: string) => {
    handleSettingChange({ separator: newSeparator, customSeparator: newCustomSeparator });
  };

  const handleLanguageChange = (newLanguage: string | null) => {
    handleSettingChange({ userLanguage: newLanguage });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="settings-container">
      <h2>{getMessage(messages, 'settingsTab')}</h2>
      <LanguageSetting
        userLanguage={settings.userLanguage}
        setUserLanguage={() => {}}
        messages={messages}
        onChange={handleLanguageChange}
      />
      <SeparatorSetting
        separator={settings.separator}
        customSeparator={settings.customSeparator}
        setSeparator={() => {}}
        setCustomSeparator={() => {}}
        showCustomInput={settings.separator === 'other'}
        setShowCustomInput={() => {}}
        messages={messages}
        onChange={handleSeparatorChange}
      />
      <CheckboxSetting
        label="extensionLabel"
        checked={settings.removeExtension}
        onChange={(e) => handleSettingChange({ removeExtension: e.target.checked })}
        messages={messages}
      />
      <CheckboxSetting
        label="removeDirectoryLabel"
        checked={settings.removeDirectoryPath}
        onChange={(e) => handleSettingChange({ removeDirectoryPath: e.target.checked })}
        messages={messages}
      />
      <CheckboxSetting
        label="darkModeLabel"
        checked={settings.darkMode}
        onChange={(e) => handleSettingChange({ darkMode: e.target.checked })}
        messages={messages}
      />
      <CheckboxSetting
        label="notificationsLabel"
        checked={settings.notificationsEnabled}
        onChange={(e) => handleSettingChange({ notificationsEnabled: e.target.checked })}
        messages={messages}
      />
      <CheckboxSetting
        label="copyFileNamesOnlyLabel"
        checked={settings.copyFileNamesOnly}
        onChange={(e) => handleSettingChange({ copyFileNamesOnly: e.target.checked })}
        messages={messages}
      />
      <CheckboxSetting
        label="recursiveScanLabel"
        checked={settings.recursiveScanEnabled}
        onChange={(e) => handleSettingChange({ recursiveScanEnabled: e.target.checked })}
        messages={messages}
      />
    </div>
  );
};

export default Settings;