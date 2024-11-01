"use client";
import { useEffect } from "react";
import { runPythonReact } from "./components/PythonEditor";

export default function Home() {
  useEffect(() => {
    // Create the container div programmatically
    const editorContainer = document.getElementById('editor-container');
    const monacoRoot = document.createElement('div');
    monacoRoot.id = 'monaco-editor-root';
    monacoRoot.style.height = '100%';
    editorContainer?.appendChild(monacoRoot);

    // Initialize the editor
    runPythonReact();

    return () => {
      monacoRoot.remove();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col p-4">
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" id="checkbox-strictmode" />
          Enable Strict Mode
        </label>
        <button id="button-start" className="px-4 py-2 bg-blue-500 text-white rounded">
          Start Editor
        </button>
        <button id="button-dispose" className="px-4 py-2 bg-red-500 text-white rounded">
          Dispose Editor
        </button>
      </div>
      <div id="editor-container" style={{ height: '80vh' }} />
    </main>
  );
}
