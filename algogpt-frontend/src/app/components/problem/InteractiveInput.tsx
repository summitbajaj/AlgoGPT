import React, { useState, useEffect } from 'react';

// Define more specific types for arrays and objects
type JsonValue = string | number | boolean | null | JsonArray | JsonObject;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type InputValue = string | number | boolean | JsonArray | JsonObject;
type InputData = Record<string, InputValue>;

interface InteractiveInputProps {
  inputData: InputData;
  onChange?: (newData: InputData) => void;
}

function stringifyForDisplay(value: InputValue): string {
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value);
  } else if (typeof value === 'string') {
    return `"${value}"`;
  } else {
    return String(value);
  }
}

const InteractiveInput: React.FC<InteractiveInputProps> = ({ inputData, onChange }) => {
  const [rawStrings, setRawStrings] = useState<Record<string, string>>({});

  useEffect(() => {
    const newRawStrings: Record<string, string> = {};
    for (const [key, val] of Object.entries(inputData)) {
      newRawStrings[key] = stringifyForDisplay(val);
    }
    setRawStrings(newRawStrings);
  }, [inputData]);

  const handleInputChange = (key: string, newText: string) => {
    setRawStrings((prev) => ({ ...prev, [key]: newText }));

    const updatedData: InputData = {
      ...inputData,
      [key]: newText,
    };

    onChange?.(updatedData);
  };

  return (
    <div className="rounded-lg">
      {Object.entries(rawStrings).map(([key, val]) => (
        <div key={key} className="mb-4">
          <div className="text-xs text-gray-500 mb-1 font-mono">{key}</div>
          <input
            type="text"
            value={val}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full bg-transparent font-mono text-base p-2 
                       rounded border border-gray-700 focus:outline-none 
                       focus:border-blue-500"
          />
        </div>
      ))}
    </div>
  );
};

export default InteractiveInput;
