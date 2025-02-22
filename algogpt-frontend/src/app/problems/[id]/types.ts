// type definitions for problems page

export interface Example {
    input: string;
    output: string;
    explanation?: string;
}
  
export interface Problem {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    constraints: string;
    examples: Example[];
    topics: string[];
    starter_code: string;
}