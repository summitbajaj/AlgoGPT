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
import { runCode } from '../utils/api';

interface ExecutionResult {
  error?: string;
  output?: string | null;
  executionTime?: number | null;
}

interface PythonEditorProps {
  onExecutionComplete?: (result: ExecutionResult) => void;
  initialCode?: string;
}

export const PythonEditorComponent: React.FC<PythonEditorProps> = ({
  onExecutionComplete,
  initialCode = "",
}) => {
  const [code, setCode] = useState(initialCode);
  const [editorRoot, setEditorRoot] = useState<ReactDOM.Root | null>(null);
  const [lspConnected, setLspConnected] = useState(true);
  const codeRef = useRef(code);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    initializeEditor(initialCode).catch((err) => {
      console.error('Failed to initialize editor with LSP:', err);
      setLspConnected(false);
      initializeEditorWithoutLSP(initialCode);
    });

    const runButton = document.querySelector('#button-run');
    const handleClick = async () => {
      try {
        const response = await runCode(codeRef.current);
        console.log('API Response:', response);
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
  }, []);

  const initializeEditor = async (code: string) => {
    try {
      const fileUri = vscode.Uri.file('/workspace/problem.py'); // More relevant name
      const fileSystemProvider = new RegisteredFileSystemProvider(false);
      fileSystemProvider.registerFile(new RegisteredMemoryFile(fileUri, code));
      registerFileSystemOverlay(1, fileSystemProvider);

      const wrapperConfig = createUserConfig('/workspace', code, '/workspace/problem.py');
      renderEditor(wrapperConfig);
    } catch (err) {
      throw err;
    }
  };

  const initializeEditorWithoutLSP = async (code: string) => {
    const wrapperConfig: WrapperConfig = {
      ...createUserConfig('/workspace', code, '/workspace/problem.py'),
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

              // set up initial folding
              const editor = wrapper.getEditor()
              if (editor) {
                // Force initial fold of imports
                setTimeout(() => {
                    editor.trigger('fold', 'editor.fold', {
                        selectionLines: [1, 2] // Lines containing your imports
                    });
                }, 500);
              }
            }}
            onError={(e) => {
              console.error('Editor error:', e);
            }}
          />
        </div>
      );
    };

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
