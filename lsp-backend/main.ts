/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { resolve } from 'node:path';
import { IncomingMessage } from 'node:http';
import { runLanguageServer } from './utils/language-server-runner.js';
import { LanguageName } from './utils/server-commons.js';

export const runPythonServer = (baseDir: string, relativeDir: string) => {
    const processRunPath = resolve(baseDir, relativeDir);

    // Get port from environment variable or use default 30001
    const serverPort = parseInt(process.env.PORT || '30001');
    runLanguageServer({
        serverName: 'PYRIGHT',
        pathName: '/pyright',
        serverPort: serverPort,
        runCommand: LanguageName.node,
        runCommandArgs: [
            processRunPath,
            '--stdio'
        ],
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false,
            clientTracking: true,
            verifyClient: (
                clientInfo: { origin: string; secure: boolean; req: IncomingMessage },
                callback
            ) => {
                const parsedURL = new URL(`${clientInfo.origin}${clientInfo.req.url ?? ''}`);
                const authToken = parsedURL.searchParams.get('authorization');
                if (authToken === 'UserAuth') {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        },
        logMessages: false
    });
};
