import { PostRunCodeRequest, PostRunCodeResponse, SubmitCodeRequest, SubmitCodeResponse, ComplexityAnalysisRequest, ComplexityAnalysisResponse } from './types';

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

export const submitCode = async (request: SubmitCodeRequest): Promise<SubmitCodeResponse> => {
    try {
        const response = await fetch('http://localhost:8000/submit-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data: SubmitCodeResponse = await response.json();
        // Keep logging here only
        console.log('Submit code response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Error submitting code:', error);
        throw new Error('Failed to submit code');
    }
};

export const analyzeComplexity = async (request: ComplexityAnalysisRequest): Promise<ComplexityAnalysisResponse> => {
    try {
        const response = await fetch('http://localhost:8000/analyze-complexity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data: ComplexityAnalysisResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error analyzing complexity:', error);
        throw new Error('Failed to analyze code complexity');
    }
};