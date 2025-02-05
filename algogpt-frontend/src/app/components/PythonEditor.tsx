import * as vscode from 'vscode';
import {
  RegisteredFileSystemProvider,
  registerFileSystemOverlay,
  RegisteredMemoryFile,
} from '@codingame/monaco-vscode-files-service-override';
import React, { StrictMode, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';
import {
  MonacoEditorLanguageClientWrapper,
  TextChanges,
  WrapperConfig,
} from 'monaco-editor-wrapper';
import { createUserConfig } from '../config/config';
import onLoadPyCode from '!!raw-loader!../resources/onLoad.py';
import { runCode } from '../utils/api';

export const PythonEditorComponent: React.FC = () => {
  const [code, setCode] = useState(onLoadPyCode);
  const [editorRoot, setEditorRoot] = useState<ReactDOM.Root | null>(null);
  const [lspConnected, setLspConnected] = useState(true);
  const codeRef = useRef(code);

  // Always keep the latest code in the ref.
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    // Initialize the editor with LSP (or fallback to basic mode)
    initializeEditor().catch((err) => {
      console.error('Failed to initialize editor with LSP:', err);
      setLspConnected(false);
      initializeEditorWithoutLSP();
    });

    // Attach event listener to the external Run button.
    const runButton = document.querySelector('#button-run');
    const handleClick = async () => {
      try {
        const response = await runCode(codeRef.current);
        console.log('API Response:', response);
      } catch (error) {
        console.error('Failed to run code:', error);
      }
    };
    runButton?.addEventListener('click', handleClick);

    // Clean up on unmount.
    return () => {
      runButton?.removeEventListener('click', handleClick);
      editorRoot?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeEditorWithoutLSP = async () => {
    const wrapperConfig = {
      ...createUserConfig('/workspace', onLoadPyCode, '/workspace/bad.py'),
      languageClientConfig: undefined, // Disable LSP
    };

    renderEditor(wrapperConfig);
  };

  const initializeEditor = async () => {
    const onLoadPyUri = vscode.Uri.file('/workspace/bad.py');
    const fileSystemProvider = new RegisteredFileSystemProvider(false);
    fileSystemProvider.registerFile(new RegisteredMemoryFile(onLoadPyUri, onLoadPyCode));
    registerFileSystemOverlay(1, fileSystemProvider);

    const wrapperConfig = createUserConfig('/workspace', onLoadPyCode, '/workspace/bad.py');
    renderEditor(wrapperConfig);
  };

  const renderEditor = (wrapperConfig: WrapperConfig) => {
    const container = document.getElementById('monaco-editor-root');
    if (!container) {
      console.error('Editor container not found');
      return;
    }

    const root = ReactDOM.createRoot(container);
    setEditorRoot(root);

    const App = () => {
      return (
        // Use 100% height so the editor fills its container.
        <div style={{ height: '100%', padding: '5px' }}>
          {!lspConnected && (
            <div className="bg-yellow-500 text-black p-2 mb-2 rounded">
              LSP connection failed. Editor running in basic mode.
            </div>
          )}
          <MonacoEditorReactComp
            wrapperConfig={wrapperConfig}
            style={{ height: '100%' }}
            onTextChanged={(textChanges: TextChanges) => {
              if (textChanges.text) {
                setCode(textChanges.text);
              }
            }}
            onLoad={(wrapper: MonacoEditorLanguageClientWrapper) => {
              console.log(`Loaded:\n${wrapper.reportStatus().join('\n')}`);
            }}
            onError={(e) => {
              console.error('Editor error:', e);
            }}
          />
        </div>
      );
    };

    // Optionally wrap with StrictMode.
    const strictMode = (document.getElementById('checkbox-strictmode') as HTMLInputElement)?.checked ?? false;
    if (strictMode) {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    } else {
      root.render(<App />);
    }
  };

  return null;
};
