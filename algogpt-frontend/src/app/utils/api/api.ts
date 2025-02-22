import { CodeExecutionRequest, CodeExecutionResponse } from "./types";

export const executeCode = async (request: CodeExecutionRequest): Promise<CodeExecutionResponse> => {
    try {
        const response = await fetch('http://localhost:8000/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data: CodeExecutionResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error running code:', error);
        throw new Error('Failed to run code');
    }
};
