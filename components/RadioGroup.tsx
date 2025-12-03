import React from 'react';

interface RadioGroupProps {
  label: string;
  value: 'Sim' | 'Não';
  onChange: (value: 'Sim' | 'Não') => void;
  name: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ label, value, onChange, name }) => {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex space-x-4">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            name={name}
            value="Sim"
            checked={value === 'Sim'}
            onChange={() => onChange('Sim')}
            className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Sim</span>
        </label>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            name={name}
            value="Não"
            checked={value === 'Não'}
            onChange={() => onChange('Não')}
            className="form-radio h-4 w-4 text-red-600 focus:ring-red-500"
          />
          <span className="ml-2 text-sm text-gray-700">Não</span>
        </label>
      </div>
    </div>
  );
};