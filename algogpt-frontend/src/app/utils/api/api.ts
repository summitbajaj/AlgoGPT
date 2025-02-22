import { ExecuteCodeRequest } from "./types";

export const executeCode = async (request: ExecuteCodeRequest) => {
    try {
        const response = await fetch('http://localhost:8000/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error running code:', error);
        return { error: 'Failed to run code' };
    }
};