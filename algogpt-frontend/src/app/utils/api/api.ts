import {PostRunCodeRequest, PostRunCodeResponse } from './types';

export const runCode = async (request: PostRunCodeRequest): Promise<PostRunCodeResponse> => {
    try {
        const response = await fetch('http://localhost:8000/run-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data: PostRunCodeResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error running code:', error);
        throw new Error('Failed to run code');
    }
};
