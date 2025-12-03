import React from 'react';

interface FormTextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export const FormTextArea: React.FC<FormTextAreaProps> = ({ 
  label, 
  value, 
  onChange, 
  rows = 3,
  placeholder 
}) => {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
      />
    </div>
  );
};