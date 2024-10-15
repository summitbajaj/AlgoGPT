'use client';
import { Editor } from "@monaco-editor/react";
import { useState } from "react";

export default function IDE() {
  const [code, setCode] = useState('print("Hello, World!")');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Handle the form submission, e.g., send the code to a server or execute it
    console.log("Submitted code:", code);
  };

  return (
    <div className="flex justify-center items-start pt-10 h-screen">
      <div className="w-full max-w-4xl p-4 border">
        <form action="#" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="comment" className="sr-only">
              Add your code
            </label>
            <Editor
              height="50vh"
              defaultLanguage="python"
              value={code}
              onChange={(value: any) => setCode(value || '')}
              theme="vs-dark" // Change the theme to dark
              options={{
                automaticLayout: true, // Automatically adjust layout
                minimap: {
                  enabled: true, // Show minimap
                  size: "fill", // Options: "proportional", "fill", "fit"
                  scale: 1, // Scale the minimap (default is 1)
                },
                lineNumbers: "on", // Show line numbers
                readOnly: false, // Make the editor read-only
                wordWrap: "on", // Enable word wrapping
                fontSize: 14, // Set font size
                tabSize: 4, // Set tab size
              }}
            />
          </div>
          <div className="flex justify-between pt-2">
            <div className="flex items-center space-x-5"></div>
            <div className="flex-shrink-0">
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Run
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}