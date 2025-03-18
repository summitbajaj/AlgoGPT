/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import '@codingame/monaco-vscode-python-default-extension';
import { LogLevel } from 'vscode/services';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { createUrl } from 'monaco-languageclient/tools';
import { WrapperConfig } from 'monaco-editor-wrapper';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { useConfigureMonacoWorkers } from '../utils/utils';

export const createUserConfig = (workspaceRoot: string, code: string, codeUri: string): WrapperConfig => {
    // Get the LSP backend URL from environment variables or use localhost as fallback
    const lspHost = process.env.NEXT_PUBLIC_LSP_HOST || 'localhost';
    const lspPort = process.env.NEXT_PUBLIC_LSP_PORT || '30001';
    const lspProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    const url = createUrl({
        secured: lspProtocol === 'wss:',
        host: lspHost,
        port: parseInt(lspPort),
        path: 'pyright',
        extraParams: {
            authorization: 'UserAuth'
        }
    });
    const webSocket = new WebSocket(url);
    const iWebSocket = toSocket(webSocket);
    const reader = new WebSocketMessageReader(iWebSocket);
    const writer = new WebSocketMessageWriter(iWebSocket);

    return {
        languageClientConfigs: {
            python: {
                languageId: 'python',
                name: 'AlgoGPT Python Language Server',
                connection: {
                    options: {
                        $type: 'WebSocketDirect',
                        webSocket: webSocket,
                        startOptions: {
                            onCall: (languageClient?: MonacoLanguageClient) => {
                                setTimeout(() => {
                                    ['pyright.restartserver', 'pyright.organizeimports'].forEach((cmdName) => {
                                        vscode.commands.registerCommand(cmdName, (...args: unknown[]) => {
                                            languageClient?.sendRequest('workspace/executeCommand', { command: cmdName, arguments: args });
                                        });
                                    });
                                }, 250);
                            },
                            reportStatus: true,
                        }
                    },
                    messageTransports: { reader, writer }
                },
                clientOptions: {
                    documentSelector: ['python'],
                    workspaceFolder: {
                        index: 0,
                        name: 'workspace',
                        uri: vscode.Uri.parse(workspaceRoot)
                    },
                }
            }
        },
        logLevel: LogLevel.Debug,
        vscodeApiConfig: {
            userServices: {
                ...getKeybindingsServiceOverride()
            },
            userConfiguration: {
                json: JSON.stringify({
                    'workbench.colorTheme': 'Default Dark Modern',
                    'editor.guides.bracketPairsHorizontal': 'active',
                    'editor.wordBasedSuggestions': 'off',
                    // extra stuff that were added
                    'editor.experimental.asyncTokenization': true,
                    'python.analysis.diagnosticMode': 'workspace',
                    'python.analysis.typeCheckingMode': 'basic',
                    'python.analysis.diagnosticSeverityOverrides': {
                        'reportMissingImports': 'none',
                        'reportMissingModuleSource': 'none',
                    },
                    // Enable these features for better IntelliSense
                    'editor.suggestSelection': 'first',
                    'editor.suggest.showMethods': true,
                    'editor.suggest.preview': true,
                    'editor.acceptSuggestionOnEnter': 'on',
                    'editor.suggestOnTriggerCharacters': true,
                    'editor.hover.enabled': true,

                    // Monaco editor specific folding settings
                    'editor.folding': true,
                    'editor.foldingStrategy': 'auto',
                    'editor.foldingHighlight': true,
                    'editor.showFoldingControls': 'always',
                    'editor.foldingImportsByDefault': true,
                    
                    // Language specific settings
                    '[python]': {
                        'editor.foldingStrategy': 'auto',
                        'editor.defaultFoldingRangeProvider': 'pyright'
                    },
                    
                    // Add these for better folding support
                    'editor.unfoldOnClickAfterEndOfLine': true,
                    'editor.semanticHighlighting.enabled': true
                })
            } 
        },
        editorAppConfig: {
            $type: 'extended',
            codeResources: {
                main: {
                    text: code,
                    uri: codeUri
                }
            },
            useDiffEditor: false,
            monacoWorkerFactory: useConfigureMonacoWorkers,
            htmlContainer: document.getElementById('monaco-editor-root')!
        }
    };
};
