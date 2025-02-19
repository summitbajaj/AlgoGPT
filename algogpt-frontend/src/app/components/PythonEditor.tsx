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
import * as monaco from 'monaco-editor';

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
  const [lspConnected, setLspConnected] = useState(true);
  const codeRef = useRef(code);
  const editorInitializedRef = useRef(false);
  const editorRootRef = useRef<ReactDOM.Root | null>(null);
  const initialCodeRef = useRef(initialCode);
  const lspConnectedRef = useRef(true);

  // Keep refs in sync with state
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    initialCodeRef.current = initialCode;
  }, [initialCode]);

  useEffect(() => {
    lspConnectedRef.current = lspConnected;
  }, [lspConnected]);

  // Update code when initialCode prop changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Handle run button click
  useEffect(() => {
    const handleRunCode = async () => {
      try {
        // Use the refs' code value to avoid missing dependency warning.
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

    const runButton = document.querySelector('#button-run');
    runButton?.addEventListener('click', handleRunCode);

    return () => {
      runButton?.removeEventListener('click', handleRunCode);
    };
  }, [onExecutionComplete]);

  // Initialize editor once
  useEffect(() => {
    if (editorInitializedRef.current) return;
    editorInitializedRef.current = true;

    const renderEditor = (wrapperConfig: WrapperConfig) => {
      const container = document.getElementById('monaco-editor-root');
      if (!container) {
        console.error('Editor container not found');
        return;
      }

      const root = ReactDOM.createRoot(container);
      editorRootRef.current = root;

      const App: React.FC = () => {
        return (
          <div style={{ height: '100%', padding: '5px' }}>
            {!lspConnectedRef.current && (
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
                
                const editor = wrapper.getEditor();
                if (editor) {
                  // Reduce delay for faster folding if possible
                  setTimeout(() => {
                    const model = editor.getModel();
                    if (!model) return;
              
                    // Determine the block of import statements.
                    const lines = model.getLinesContent();
                    let endLine = 0;
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].startsWith("import") || lines[i].startsWith("from")) {
                        endLine = i + 1;
                      } else if (endLine > 0) {
                        // break if the import block has ended
                        break;
                      }
                    }
                    // Fold if we found more than one line in the import block.
                    if (endLine > 1) {
                      // Set the selection that covers the import block.
                      editor.setSelection(new monaco.Selection(1, 1, endLine, 1));
                      // Run the fold command for the selected region.
                      editor.getAction("editor.fold")?.run();
                    }
                  }, 50);
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

    const initializeEditor = async (code: string) => {
      try {
        const fileUri = vscode.Uri.file('/workspace/problem.py');
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

    initializeEditor(initialCodeRef.current).catch((err) => {
      console.error('Failed to initialize editor with LSP:', err);
      setLspConnected(false);
      lspConnectedRef.current = false;
      initializeEditorWithoutLSP(initialCodeRef.current);
    });

    return () => {
      editorRootRef.current?.unmount();
    };
  }, []);

  return null;
};