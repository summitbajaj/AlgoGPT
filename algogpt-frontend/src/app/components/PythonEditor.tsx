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

    useEffect(() => {
        runPythonReact(setCode);
        
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
        };
    }, [code]);

    return null;
};

export const runPythonReact = async (setCode: (code: string) => void) => {
    const onLoadPyUri = vscode.Uri.file('/workspace/bad.py');
    const fileSystemProvider = new RegisteredFileSystemProvider(false);
    fileSystemProvider.registerFile(new RegisteredMemoryFile(onLoadPyUri, onLoadPyCode));
    registerFileSystemOverlay(1, fileSystemProvider);

    const onTextChanged = (textChanges: TextChanges) => {
        if (textChanges.text){
            setCode(textChanges.text);
        }
        // console.log(`Dirty? ${textChanges.isDirty}\ntext: ${textChanges.text}\ntextOriginal: ${textChanges.textOriginal}`);
    };

    const wrapperConfig = createUserConfig('/workspace', onLoadPyCode, '/workspace/bad.py');
    const root = ReactDOM.createRoot(wrapperConfig.editorAppConfig.htmlContainer);

    try {
        document.querySelector('#button-start')?.addEventListener('click', async () => {
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

            const strictMode = (document.getElementById('checkbox-strictmode')! as HTMLInputElement).checked;

            if (strictMode) {
                root.render(
                    <StrictMode>
                        <App />
                    </StrictMode>
                );
            } else {
                root.render(<App />);
            }
        });
        document.querySelector('#button-dispose')?.addEventListener('click', () => {
            root.render([]);
        });
    } catch (e) {
        console.error(e);
    }
};
