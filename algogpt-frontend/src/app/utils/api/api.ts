import { PostRunCodeRequest, PostRunCodeResponse, SubmitCodeRequest, SubmitCodeResponse, ComplexityAnalysisRequest, ComplexityAnalysisResponse, RoadmapResponse, TopicListResponse } from './types';

// Create a base URL constant to keep things consistent
const API_BASE_URL = 'http://localhost:8000';

export const runCode = async (request: PostRunCodeRequest): Promise<PostRunCodeResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/run-code`, {
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
        const response = await fetch(`${API_BASE_URL}/submit-code`, {
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
        const response = await fetch(`${API_BASE_URL}/analyze-complexity`, {
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

export const fetchRoadmap = async (): Promise<RoadmapResponse> => {
    try {
        // Update to use the same base URL as other API calls
        const response = await fetch(`${API_BASE_URL}/api/roadmap`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data: RoadmapResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching roadmap:', error);
        throw new Error('Failed to fetch roadmap data');
    }
};

export const fetchTopics = async (): Promise<TopicListResponse> => {
    try {
        // Update to use the same base URL as other API calls
        const response = await fetch(`${API_BASE_URL}/api/topics`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data: TopicListResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching topics:', error);
        throw new Error('Failed to fetch topics');
    }
};