import React from 'react';

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'datetime-local';
  placeholder?: string;
  required?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder,
  required = false
}) => {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      />
    </div>
  );
};