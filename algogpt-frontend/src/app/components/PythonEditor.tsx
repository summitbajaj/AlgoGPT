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

interface EditorAppProps {
  wrapperConfig: WrapperConfig;
  lspConnected: boolean;
  onCodeChange: (code: string) => void;
  editorWrapperRef: React.MutableRefObject<MonacoEditorLanguageClientWrapper | null>;
}

const EditorApp: React.FC<EditorAppProps> = ({
  wrapperConfig,
  lspConnected,
  onCodeChange,
  editorWrapperRef,
}) => {
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
            onCodeChange(textChanges.text);
          }
        }}
        onLoad={(wrapper: MonacoEditorLanguageClientWrapper) => {
          editorWrapperRef.current = wrapper;
          console.log(`Loaded:\n${wrapper.reportStatus().join('\n')}`);
          
          const editor = wrapper.getEditor();
          if (editor) {
            setTimeout(() => {
              const model = editor.getModel();
              if (!model) return;
        
              const lines = model.getLinesContent();
              let endLine = 0;
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith("import") || lines[i].startsWith("from")) {
                  endLine = i + 1;
                } else if (endLine > 0) {
                  break;
                }
              }
              if (endLine > 1) {
                editor.setSelection(new monaco.Selection(1, 1, endLine, 1));
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

export const PythonEditorComponent: React.FC<PythonEditorProps> = ({
  onExecutionComplete,
  initialCode = "",
}) => {
  const [code, setCode] = useState(initialCode);
  const [lspConnected, setLspConnected] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<MonacoEditorLanguageClientWrapper | null>(null);
  const isEditorMountedRef = useRef(false);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    const handleRunCode = async () => {
      try {
        const response = await runCode(code);
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
  }, [code, onExecutionComplete]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isEditorMountedRef.current) return;

    const initializeEditor = async () => {
      try {
        const fileUri = vscode.Uri.file('/workspace/problem.py');
        const fileSystemProvider = new RegisteredFileSystemProvider(false);
        fileSystemProvider.registerFile(new RegisteredMemoryFile(fileUri, initialCode));
        registerFileSystemOverlay(1, fileSystemProvider);

        const wrapperConfig = createUserConfig('/workspace', initialCode, '/workspace/problem.py');
        
        const root = ReactDOM.createRoot(container);
        
        const strictMode = (document.getElementById('checkbox-strictmode') as HTMLInputElement)?.checked ?? false;
        
        root.render(
          strictMode ? (
            <StrictMode>
              <EditorApp 
                wrapperConfig={wrapperConfig}
                lspConnected={lspConnected}
                onCodeChange={setCode}
                editorWrapperRef={editorWrapperRef}
              />
            </StrictMode>
          ) : (
            <EditorApp 
              wrapperConfig={wrapperConfig}
              lspConnected={lspConnected}
              onCodeChange={setCode}
              editorWrapperRef={editorWrapperRef}
            />
          )
        );

        isEditorMountedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize editor with LSP:', error);
        setLspConnected(false);
        
        const wrapperConfig: WrapperConfig = {
          ...createUserConfig('/workspace', initialCode, '/workspace/problem.py'),
          languageClientConfigs: undefined,
        };
        
        if (container) {
          const root = ReactDOM.createRoot(container);
          root.render(
            <EditorApp 
              wrapperConfig={wrapperConfig}
              lspConnected={false}
              onCodeChange={setCode}
              editorWrapperRef={editorWrapperRef}
            />
          );
          isEditorMountedRef.current = true;
        }
      }
    };

    initializeEditor();

    return () => {
      if (editorWrapperRef.current) {
        editorWrapperRef.current.dispose();
        editorWrapperRef.current = null;
      }
      isEditorMountedRef.current = false;
    };
  }, [initialCode, lspConnected]);

  return <div ref={containerRef} style={{ height: '100%' }} />;
};