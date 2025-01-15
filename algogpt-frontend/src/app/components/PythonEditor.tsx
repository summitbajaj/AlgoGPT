import * as vscode from 'vscode';
import { RegisteredFileSystemProvider, registerFileSystemOverlay, RegisteredMemoryFile } from '@codingame/monaco-vscode-files-service-override';
import React, { StrictMode, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';
import { MonacoEditorLanguageClientWrapper, TextChanges } from 'monaco-editor-wrapper';
import { createUserConfig } from '../config/config';
import onLoadPyCode from '!!raw-loader!../resources/onLoad.py';
import { runCode } from '../utils/api';

export const PythonEditorComponent: React.FC = () => {
    const [code, setCode] = useState(onLoadPyCode);
    const [editorRoot, setEditorRoot] = useState<ReactDOM.Root | null>(null);

    useEffect(() => {
        // Initialize editor automatically
        initializeEditor();

        // Add event listener for the "Run" button to send code to the API
        const runButton = document.querySelector('#button-run');
        const handleClick = async () => {
            const response = await runCode(code);
            console.log("API Response:", response);
        };
        runButton?.addEventListener('click', handleClick);

        // Clean up event listener on component unmount
        return () => {
            runButton?.removeEventListener('click', handleClick);
            editorRoot?.unmount();
        };
    }, []);

    const initializeEditor = async () => {
        const onLoadPyUri = vscode.Uri.file('/workspace/bad.py');
        const fileSystemProvider = new RegisteredFileSystemProvider(false);
        fileSystemProvider.registerFile(new RegisteredMemoryFile(onLoadPyUri, onLoadPyCode));
        registerFileSystemOverlay(1, fileSystemProvider);

        const onTextChanged = (textChanges: TextChanges) => {
            if (textChanges.text) {
                setCode(textChanges.text);
            }
        };

        const wrapperConfig = createUserConfig('/workspace', onLoadPyCode, '/workspace/bad.py');
        const root = ReactDOM.createRoot(wrapperConfig.editorAppConfig.htmlContainer);
        setEditorRoot(root);

        try {
            const App = () => {
                return (
                    <div style={{ height: '80vh', padding: '5px' }}>
                        <MonacoEditorReactComp
                            wrapperConfig={wrapperConfig}
                            style={{ height: '100%' }}
                            onTextChanged={onTextChanged}
                            onLoad={(wrapper: MonacoEditorLanguageClientWrapper) => {
                                console.log(`Loaded ${wrapper.reportStatus().join('\n').toString()}`);
                            }}
                            onError={(e) => {
                                console.error(e);
                            }}
                        />
                    </div>
                );
            };

            // Get strict mode preference (you might want to make this a prop or config)
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
            console.error(e);
        }
    };

    return null;
};