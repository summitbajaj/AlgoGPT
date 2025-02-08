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

// Define a more specific interface instead of using `any`.
interface ExecutionResult {
  error?: string;
  output?: string | null;
  executionTime?: number | null;
}

interface PythonEditorProps {
  onExecutionComplete?: (result: ExecutionResult) => void;
}

export const PythonEditorComponent: React.FC<PythonEditorProps> = ({
  onExecutionComplete,
}) => {
  const [code, setCode] = useState(onLoadPyCode);
  const [editorRoot, setEditorRoot] = useState<ReactDOM.Root | null>(null);
  const [lspConnected, setLspConnected] = useState(true);
  const codeRef = useRef(code);

  // Keep codeRef in sync with `code`
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // If you only want to run the editor initialization once, you can disable the
  // react-hooks/exhaustive-deps rule here:
  useEffect(() => {
    initializeEditor().catch((err) => {
      console.error('Failed to initialize editor with LSP:', err);
      setLspConnected(false);
      initializeEditorWithoutLSP();
    });

    const runButton = document.querySelector('#button-run');
    const handleClick = async () => {
      try {
        // Run your code
        const response = await runCode(codeRef.current);
        console.log('API Response:', response);

        // Pass the execution result back to the parent component
        onExecutionComplete?.(response);
      } catch (error) {
        console.error('Failed to run code:', error);
        onExecutionComplete?.({
          error: error instanceof Error ? error.message : 'An error occurred',
          output: null,
          executionTime: null,
        });
      }
    };

    runButton?.addEventListener('click', handleClick);

    return () => {
      runButton?.removeEventListener('click', handleClick);
      editorRoot?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeEditor = async () => {
    try {
      const onLoadPyUri = vscode.Uri.file('/workspace/bad.py');
      const fileSystemProvider = new RegisteredFileSystemProvider(false);
      fileSystemProvider.registerFile(
        new RegisteredMemoryFile(onLoadPyUri, onLoadPyCode)
      );
      registerFileSystemOverlay(1, fileSystemProvider);

      const wrapperConfig = createUserConfig(
        '/workspace',
        onLoadPyCode,
        '/workspace/bad.py'
      );
      renderEditor(wrapperConfig);
    } catch (err) {
      throw err;
    }
  };

  const initializeEditorWithoutLSP = async () => {
    const wrapperConfig: WrapperConfig = {
      ...createUserConfig('/workspace', onLoadPyCode, '/workspace/bad.py'),
      languageClientConfigs: undefined,
    };
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

    const App: React.FC = () => {
      return (
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

    // Check whether Strict Mode is enabled via #checkbox-strictmode
    const strictMode =
      (document.getElementById('checkbox-strictmode') as HTMLInputElement)
        ?.checked ?? false;

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

