import React from 'react';
import { getMessage } from '../utils/utils';
import { Messages } from '../types';

interface CheckboxSettingProps {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  messages: Messages;
}

const CheckboxSetting: React.FC<CheckboxSettingProps> = ({
  label,
  checked,
  onChange,
  messages,
}) => {
  return (
    <div className="checkbox-setting">
      <label>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span>{getMessage(messages, label)}</span>
      </label>
    </div>
  );
};

export default CheckboxSetting;
