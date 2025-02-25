import React, { useState, useEffect } from "react";

export interface InputData {
  [key: string]: unknown;
}

interface InteractiveInputProps {
  inputData: InputData;
  onChange?: (newData: InputData) => void;
}

const InputEditor: React.FC<InteractiveInputProps> = ({ inputData, onChange }) => {
  const [initialized, setInitialized] = useState(false);
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});

  // Only run this once (or when inputData truly changes to a new object).
  useEffect(() => {
    if (!initialized) {
      const initialInputs: Record<string, string> = {};

      for (const [key, value] of Object.entries(inputData)) {
        if (typeof value === "string") {
          // Show with quotes on first load, e.g. () => "()"
          initialInputs[key] = `"${value}"`;
        } else if (typeof value === "object" && value !== null) {
          initialInputs[key] = JSON.stringify(value);
        } else {
          initialInputs[key] = String(value);
        }
      }

      setLocalInputs(initialInputs);
      setInitialized(true);
    }
  }, [initialized, inputData]);

  // Let user edits stand as-is, no parsing or re-quoting.
  const handleInputChange = (key: string, newValue: string) => {
    setLocalInputs((prev) => ({ ...prev, [key]: newValue }));

    // If you want to notify parent of changes (raw), do so:
    const updatedData = { ...inputData };
    updatedData[key] = newValue;
    onChange?.(updatedData);
  };

  return (
    <div className="space-y-2">
      {Object.entries(localInputs).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="text-sm text-gray-600">{key} = </div>
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="editor-textarea h-9 min-h-0"
            style={{ resize: "none", minHeight: "auto" }}
            spellCheck={false}
          />
        </div>
      ))}
    </div>
  );
};

export default InputEditor;
