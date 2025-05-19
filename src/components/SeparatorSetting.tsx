import React from 'react';
import { getMessage } from '../utils/utils'; // Updated path
import { Messages } from '../types';

interface SeparatorSettingProps {
  separator: string;
  customSeparator: string;
  setSeparator: (value: string) => void;
  setCustomSeparator: (value: string) => void;
  showCustomInput: boolean;
  setShowCustomInput: (value: boolean) => void;
  messages: Messages;
  onChange: (newSeparator: string, newCustomSeparator: string) => void;
}

const SeparatorSetting: React.FC<SeparatorSettingProps> = ({
  separator,
  customSeparator,
  setSeparator,
  setCustomSeparator,
  showCustomInput,
  setShowCustomInput,
  messages,
  onChange,
}) => {
  const handleSeparatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeparator = e.target.value === 'tab' ? '\t' : e.target.value;
    const isOtherSelected = newSeparator === 'other';
    setShowCustomInput(isOtherSelected);
    setSeparator(newSeparator);

    if (!isOtherSelected) {
      setCustomSeparator('');
    }

    onChange(newSeparator, isOtherSelected ? customSeparator : '');
  };

  const handleCustomSeparatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCustomSeparator = e.target.value;
    setCustomSeparator(newCustomSeparator);
    setSeparator(newCustomSeparator);
    onChange('other', newCustomSeparator);
  };

  return (
    <div className="setting-item separator-setting">
      <label>{getMessage(messages, 'separatorLabel')}</label>
      <select
        value={separator === '\t' ? 'tab' : (separator === 'other' || (showCustomInput && customSeparator) ? 'other' : separator)}
        onChange={handleSeparatorChange}
      >
        <option value="tab">{getMessage(messages, 'separatorTab')}</option>
        <option value=" ">{getMessage(messages, 'separatorSpace')}</option>
        <option value=":">{getMessage(messages, 'separatorColon')}</option>
        <option value=",">{getMessage(messages, 'separatorComma')}</option>
        <option value="-">{getMessage(messages, 'separatorHyphen')}</option>
        <option value="|">{getMessage(messages, 'separatorPipe')}</option>
        <option value="other">{getMessage(messages, 'separatorOther')}</option>
      </select>
      {showCustomInput && (
        <input
          type="text"
          className="custom-separator-input"
          value={customSeparator}
          onChange={handleCustomSeparatorChange}
          placeholder={getMessage(messages, 'customSeparatorPlaceholder')}
        />
      )}
    </div>
  );
};

export default SeparatorSetting;
