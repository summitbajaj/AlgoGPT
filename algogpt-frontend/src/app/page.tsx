"use client";
import dynamic from 'next/dynamic';
import { useEffect } from "react";

const PythonEditor = dynamic(
  () => import('./components/PythonEditor').then(mod => ({ 
    default: mod.PythonEditorComponent 
  })),
  { ssr: false }
);

export default function Home() {
  useEffect(() => {
    const editorContainer = document.getElementById('editor-container');
    const monacoRoot = document.createElement('div');
    monacoRoot.id = 'monaco-editor-root';
    monacoRoot.style.height = '100%';
    editorContainer?.appendChild(monacoRoot);

    return () => {
      monacoRoot.remove();
    };
  }, []);

  return (
    <main className="app-main flex min-h-screen flex-col p-4 bg-gray-900 text-white">
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" id="checkbox-strictmode" />
          Enable Strict Mode
        </label>
        <button id="button-dispose" className="px-4 py-2 bg-red-500 text-white rounded">
          Reset Editor
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3 p-4 bg-gray-800 rounded">
          <h2 className="text-xl font-bold mb-2">Problem Description</h2>
          <p>
            Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.
            You may assume that each input would have exactly one solution, and you may not use the same element twice.
            You can return the answer in any order.
          </p>
        </div>

        <div className="w-full md:w-2/3" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
          <div id="editor-container" style={{ flex: 1 }} />
          <div className="flex justify-center mt-4">
            <button id="button-run" className="px-4 py-2 bg-green-500 text-white rounded">
              Run Code
            </button>
          </div>
        </div>
      </div>

      <PythonEditor />
    </main>
  );
}