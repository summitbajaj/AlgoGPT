export const runCode = async (code: string) => {
    try {
        const response = await fetch('http://localhost:5001/run-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error running code:', error);
        return { error: 'Failed to run code' };
    }
};
