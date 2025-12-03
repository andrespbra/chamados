import React from 'react';
import { SubjectOption } from '../types';

interface FormSelectProps {
  label: string;
  value: string;
  options: SubjectOption[];
  onChange: (value: string) => void;
  required?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({ 
  label, 
  value, 
  options, 
  onChange,
  required = false
}) => {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
      >
        <option value="">Selecione uma opção...</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.label}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};