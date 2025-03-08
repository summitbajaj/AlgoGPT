import * as vscode from 'vscode';
import {
  RegisteredFileSystemProvider,
  registerFileSystemOverlay,
  RegisteredMemoryFile,
} from '@codingame/monaco-vscode-files-service-override';
import React, { StrictMode, useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';
import {
  MonacoEditorLanguageClientWrapper,
  TextChanges,
  WrapperConfig,
} from 'monaco-editor-wrapper';
import { createUserConfig } from '../config/config';
import { runCode, submitCode } from '../utils/api/api';
import * as monaco from 'monaco-editor';
import { PostRunCodeRequest, PostRunCodeResponse, RunCodeTestCase, SubmitCodeRequest, SubmitCodeResponse } from '../utils/api/types';
import { useWebSocket } from '../context/WebSocketContext';
import { debounce } from 'lodash'; 

interface PythonEditorProps {
  onRunCodeComplete?: (result: PostRunCodeResponse) => void;
  onSubmitCodeComplete?: (result: SubmitCodeResponse) => void;
  initialCode?: string;
  problemId: number;
  testCaseInputs: RunCodeTestCase[];
  disableWebSocket?: boolean; // New prop to make WebSocket optional
}

export const PythonEditorComponent: React.FC<PythonEditorProps> = ({
  onRunCodeComplete: onExecutionComplete,
  onSubmitCodeComplete,
  initialCode = "",
  problemId,
  testCaseInputs,
  disableWebSocket = false // Default to using WebSocket
}) => {
  const [code, setCode] = useState(initialCode);
  const [lspConnected, setLspConnected] = useState(true);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const codeRef = useRef(code);
  const editorRootRef = useRef<ReactDOM.Root | null>(null);
  const wrapperRef = useRef<MonacoEditorLanguageClientWrapper | null>(null);
  
  // Only use WebSocket context if not disabled
  const webSocketContext = !disableWebSocket ? useWebSocket() : { sendCodeUpdate: () => {} };
  const { sendCodeUpdate } = webSocketContext;
  
  // Create refs outside of effects for the submit button and its handler
  const submitButtonRef = useRef<HTMLElement | null>(null);
  const runButtonRef = useRef<HTMLElement | null>(null);

  // Create a debounced version of the sendCodeUpdate function
  // This will only send code updates after the user stops typing for 1 second
  const debouncedSendCodeUpdate = useRef(
    debounce((codeToSend: string) => {
      if (!disableWebSocket) {
        sendCodeUpdate(codeToSend);
      }
    }, 1000)
  ).current;

  // Keep refs in sync with state and send code updates
  useEffect(() => {
    codeRef.current = code;
    
    // Only send non-empty code after editor is initialized and if WebSocket is enabled
    if (code && code !== initialCode && editorInitialized && !disableWebSocket) {
      debouncedSendCodeUpdate(code);
    }
  }, [code, debouncedSendCodeUpdate, initialCode, editorInitialized, disableWebSocket]);

  // Update code when initialCode prop changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Clean up the debouncer on unmount
  useEffect(() => {
    return () => {
      debouncedSendCodeUpdate.cancel();
    };
  }, [debouncedSendCodeUpdate]);

  // Define handlers for run and submit outside of effects
  const handleRunCode = useCallback(async () => {
    try {
      const request: PostRunCodeRequest = {
        source_code: codeRef.current,
        problem_id: problemId,
        test_cases: testCaseInputs,
      };
      const response = await runCode(request);
      onExecutionComplete?.(response);
    } catch (error) {
      console.error('Failed to run code:', error);
      
      // Provide a default CodeExecutionResponse on error
      onExecutionComplete?.({
        test_results: [],
      });
    }
  }, [onExecutionComplete, problemId, testCaseInputs]);

  const handleSubmitCode = useCallback(async () => {
    try {
      const request: SubmitCodeRequest = {
        source_code: codeRef.current,
        problem_id: problemId,
      };
      const response = await submitCode(request);
      onSubmitCodeComplete?.(response);
    } catch (error) {
      console.error('Failed to submit code:', error);
    }
  }, [onSubmitCodeComplete, problemId]);

  // Handle run button click
  useEffect(() => {
    const runButton = document.querySelector('#button-run');
    runButtonRef.current = runButton as HTMLElement;
    
    if (runButtonRef.current) {
      runButtonRef.current.addEventListener('click', handleRunCode);
    }
  
    return () => {
      if (runButtonRef.current) {
        runButtonRef.current.removeEventListener('click', handleRunCode);
      }
    };
  }, [handleRunCode]);
  
  // Handle submit button click
  useEffect(() => {
    const submitButton = document.querySelector('#button-submit');
    submitButtonRef.current = submitButton as HTMLElement;
    
    if (submitButtonRef.current) {
      submitButtonRef.current.addEventListener('click', handleSubmitCode);
    }
  
    return () => {
      if (submitButtonRef.current) {
        submitButtonRef.current.removeEventListener('click', handleSubmitCode);
      }
    };
  }, [handleSubmitCode]);

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
        const fileUri = vscode.Uri.file(`/workspace/problem-${problemId}.py`);
        const fileSystemProvider = new RegisteredFileSystemProvider(false);
        fileSystemProvider.registerFile(new RegisteredMemoryFile(fileUri, code));
        registerFileSystemOverlay(1, fileSystemProvider);
        
        const wrapperConfig = createUserConfig('/workspace', code, `/workspace/problem-${problemId}.py`);        
        renderEditor(wrapperConfig);
        setEditorInitialized(true);
      } catch (err) {
        console.error('Failed to initialize editor with LSP:', err);
        setLspConnected(false);
        // We'll let the next useEffect handle the fallback initialization
      }
    };

    initializeEditor(initialCode);
  }, [editorInitialized, initialCode, lspConnected, problemId]);

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

  return (
    <div style={{ height: '100%', width: '100%' }} id="monaco-editor-root" />
  );
};