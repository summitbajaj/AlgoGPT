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
import {
  PostRunCodeRequest,
  PostRunCodeResponse,
  RunCodeTestCase,
  SubmitCodeRequest,
  SubmitCodeResponse
} from '../utils/api/types';
import { useWebSocket, WebSocketContextType } from '../context/WebSocketContext';
import { debounce } from 'lodash'; 

interface PythonEditorProps {
  onRunCodeComplete?: (result: PostRunCodeResponse) => void;
  onSubmitCodeComplete?: (result: SubmitCodeResponse) => void;
  initialCode?: string;
  problemId: number;
  testCaseInputs: RunCodeTestCase[];
  disableWebSocket?: boolean; // New prop to make WebSocket optional
  userId: string;
}

/**
 * A helper hook that returns the WebSocket context if available,
 * otherwise returns a fallback object to prevent errors.
 */
function useOptionalWebSocket(): WebSocketContextType {
  try {
    return useWebSocket();
  } catch {
    return {
      sendChatMessage: () => {},
      sendCodeUpdate: () => {},
      isConnected: false,
    };
  }
}

export const PythonEditorComponent: React.FC<PythonEditorProps> = ({
  onRunCodeComplete: onExecutionComplete,
  onSubmitCodeComplete,
  initialCode = "",
  problemId,
  testCaseInputs,
  disableWebSocket = false,
  userId,
}) => {
  const [code, setCode] = useState(initialCode);
  const [lspConnected, setLspConnected] = useState(true);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const codeRef = useRef(code);
  const editorRootRef = useRef<ReactDOM.Root | null>(null);
  const wrapperRef = useRef<MonacoEditorLanguageClientWrapper | null>(null);

  // Always call the hook unconditionally:
  const webSocketContext = useOptionalWebSocket();
  // Provide no-op if WebSocket updates are disabled
  const sendCodeUpdate = disableWebSocket ? () => {} : webSocketContext.sendCodeUpdate;

  // Create refs outside of effects for the submit/run buttons and handlers
  const submitButtonRef = useRef<HTMLElement | null>(null);
  const runButtonRef = useRef<HTMLElement | null>(null);

  // Debounce the sendCodeUpdate function (1 second).
  const debouncedSendCodeUpdate = useRef(
    debounce((codeToSend: string) => {
      if (!disableWebSocket) {
        sendCodeUpdate(codeToSend);
      }
    }, 1000)
  ).current;

  // Keep codeRef in sync with state changes
  useEffect(() => {
    codeRef.current = code;
    if (code && code !== initialCode && editorInitialized && !disableWebSocket) {
      debouncedSendCodeUpdate(code);
    }
  }, [code, debouncedSendCodeUpdate, initialCode, editorInitialized, disableWebSocket]);

  // Update code if initialCode prop changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Cleanup the debouncer on unmount
  useEffect(() => {
    return () => {
      debouncedSendCodeUpdate.cancel();
    };
  }, [debouncedSendCodeUpdate]);

  // Handlers for run and submit
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
        user_id: userId
      };
      const response = await submitCode(request);
      onSubmitCodeComplete?.(response);
    } catch (error) {
      console.error('Failed to submit code:', error);
    }
  }, [onSubmitCodeComplete, problemId]);

  // Listen for run button clicks
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
  
  // Listen for submit button clicks
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

  // Reinitialize the editor when problemId changes
  useEffect(() => {
    setEditorInitialized(false);
    if (wrapperRef.current) {
      wrapperRef.current.dispose();
      wrapperRef.current = null;
    }
    if (editorRootRef.current) {
      editorRootRef.current.unmount();
      editorRootRef.current = null;
    }
    setCode(initialCode);
  }, [problemId, initialCode]);

  // Initialize with LSP first
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
                  // Attempt to fold import statements after a short delay
                  setTimeout(() => {
                    const model = editor.getModel();
                    if (!model) return;
                    const lines = model.getLinesContent();
                    let endLine = 0;
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].startsWith("import") || lines[i].startsWith("from")) {
                        endLine = i + 1;
                      } else if (endLine > 0) {
                        break; // End of the import block
                      }
                    }
                    if (endLine > 1) {
                      editor.setSelection(new monaco.Selection(1, 1, endLine, 1));
                      editor.getAction("editor.fold")?.run();
                    }
                  }, 50);
                }
              }}
              onError={(editorError) => {
                console.error('Editor error:', editorError);
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
        
        const wrapperConfig = createUserConfig(
          '/workspace',
          code,
          `/workspace/problem-${problemId}.py`
        );        
        renderEditor(wrapperConfig);
        setEditorInitialized(true);
      } catch (initError) {
        console.error('Failed to initialize editor with LSP:', initError);
        setLspConnected(false);
      }
    };

    initializeEditor(initialCode);
  }, [editorInitialized, initialCode, lspConnected, problemId]);

  // If LSP fails and we haven't initialized the editor, fall back to basic mode
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
                onError={(editorError) => {
                  console.error('Editor error in basic mode:', editorError);
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
