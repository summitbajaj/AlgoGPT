export const executeCode = async (code: string, problemId: number) => {
    try {
        const response = await fetch('http://localhost:8000/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, problem_id: problemId }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error running code:', error);
        return { error: 'Failed to run code' };
    }
};
