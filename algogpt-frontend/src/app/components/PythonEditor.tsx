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
import { executeCode } from '../utils/api/api';
import * as monaco from 'monaco-editor';
import { CodeExecutionRequest, CodeExecutionResponse } from '../utils/api/types';

interface PythonEditorProps {
  onExecutionComplete?: (result: CodeExecutionResponse) => void;
  initialCode?: string;
  problemId: number;
}

export const PythonEditorComponent: React.FC<PythonEditorProps> = ({
  onExecutionComplete,
  initialCode = "",
  problemId
}) => {
  const [code, setCode] = useState(initialCode);
  const [lspConnected, setLspConnected] = useState(true);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const codeRef = useRef(code);
  const editorRootRef = useRef<ReactDOM.Root | null>(null);
  const wrapperRef = useRef<MonacoEditorLanguageClientWrapper | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Update code when initialCode prop changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Handle run button click
  useEffect(() => {
    const handleRunCode = async () => {
      try {
        const request: CodeExecutionRequest = {
          code: codeRef.current,
          problem_id: problemId,
        };
        const response = await executeCode(request);
        onExecutionComplete?.(response);
      } catch (error) {
        console.error('Failed to run code:', error);
        
        // Provide a default CodeExecutionResponse on error
        onExecutionComplete?.({
          test_results: [],
          execution_time: 0,
        });
      }
    };
  
    const runButton = document.querySelector('#button-run');
    runButton?.addEventListener('click', handleRunCode);
  
    return () => {
      runButton?.removeEventListener('click', handleRunCode);
    };
  }, [onExecutionComplete, problemId]);
  

  // Force editor reinitialization when problemId changes
  useEffect(() => {
    // Reset editor state
    setEditorInitialized(false);
    
    // Clean up existing editor
    if (wrapperRef.current) {
      wrapperRef.current.dispose();
      wrapperRef.current = null;
    }
    
    // Clean up existing root
    if (editorRootRef.current) {
      editorRootRef.current.unmount();
      editorRootRef.current = null;
    }
    
    // Reset code to initial state
    setCode(initialCode);
    
  }, [problemId, initialCode]);

  // Initialize editor based on LSP connection status
  useEffect(() => {
    if (editorInitialized) return;

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
                wrapperRef.current = wrapper;
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
        setEditorInitialized(true);
      } catch (err) {
        console.error('Failed to initialize editor with LSP:', err);
        setLspConnected(false);
        // We'll let the next useEffect handle the fallback initialization
      }
    };

    initializeEditor(initialCode);
  }, [editorInitialized, initialCode, lspConnected]); // Added lspConnected to dependencies

  // Handle fallback to basic mode if LSP connection fails
  useEffect(() => {
    if (!lspConnected && !wrapperRef.current && !editorInitialized) {
      const initializeEditorWithoutLSP = (code: string) => {
        const wrapperConfig: WrapperConfig = {
          ...createUserConfig('/workspace', code, '/workspace/problem.py'),
          languageClientConfigs: undefined,
        };
        
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
              <div className="bg-yellow-500 text-black p-2 mb-2 rounded">
                LSP connection failed. Editor running in basic mode.
              </div>
              <MonacoEditorReactComp
                wrapperConfig={wrapperConfig}
                style={{ height: '100%' }}
                onTextChanged={(textChanges: TextChanges) => {
                  if (textChanges.text) {
                    setCode(textChanges.text);
                  }
                }}
                onLoad={(wrapper: MonacoEditorLanguageClientWrapper) => {
                  wrapperRef.current = wrapper;
                  console.log(`Basic mode loaded:\n${wrapper.reportStatus().join('\n')}`);
                }}
                onError={(e) => {
                  console.error('Editor error in basic mode:', e);
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
        
        setEditorInitialized(true);
      };

      initializeEditorWithoutLSP(initialCode);
    }
  }, [lspConnected, editorInitialized, initialCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editorRootRef.current?.unmount();
    };
  }, []);

  return null;
};