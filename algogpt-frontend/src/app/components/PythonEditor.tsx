import * as vscode from 'vscode';
import { RegisteredFileSystemProvider, registerFileSystemOverlay, RegisteredMemoryFile } from '@codingame/monaco-vscode-files-service-override';
import React, { StrictMode, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';
import { MonacoEditorLanguageClientWrapper, TextChanges, WrapperConfig } from 'monaco-editor-wrapper';
import { createUserConfig } from '../config/config';
import onLoadPyCode from '!!raw-loader!../resources/onLoad.py';
import { runCode } from '../utils/api';

export const PythonEditorComponent: React.FC = () => {
    const [code, setCode] = useState(onLoadPyCode);
    const [editorRoot, setEditorRoot] = useState<ReactDOM.Root | null>(null);
    const [lspConnected, setLspConnected] = useState(true);
    const codeRef = useRef(code); // to always hold the latest code

    // Keep the ref updated with the latest code
    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    useEffect(() => {
        // Initialize editor automatically
        initializeEditor().catch(err => {
            console.error('Failed to initialize editor with LSP:', err);
            // If LSP initialization fails, try again without LSP
            setLspConnected(false);
            initializeEditorWithoutLSP();
        });

        // Add event listener for the "Run" button to send code to the API
        const runButton = document.querySelector('#button-run');
        const handleClick = async () => {
            try {
                const response = await runCode(codeRef.current);
                console.log("API Response:", response);
            } catch (error) {
                console.error("Failed to run code:", error);
            }
        };
        runButton?.addEventListener('click', handleClick);

        // Clean up event listener on component unmount
        return () => {
            runButton?.removeEventListener('click', handleClick);
            editorRoot?.unmount();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initializeEditorWithoutLSP = async () => {
        const wrapperConfig = {
            ...createUserConfig('/workspace', onLoadPyCode, '/workspace/bad.py'),
            languageClientConfig: undefined // Disable LSP
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

        try {
            const App = () => {
                return (
                    <div style={{ height: '80vh', padding: '5px' }}>
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
                                console.log(`Loaded ${wrapper.reportStatus().join('\n').toString()}`);
                            }}
                            onError={(e) => {
                                console.error('Editor error:', e);
                                // Don't fail completely on error, just log it
                            }}
                        />
                    </div>
                );
            };

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
        } catch (e) {
            console.error('Failed to render editor:', e);
            // Show a basic error message in the editor container
            container.innerHTML = `
                <div class="bg-red-500 text-white p-4 rounded">
                    Failed to initialize editor. Please refresh the page or contact support.
                </div>
            `;
        }
    };

    return null;
};