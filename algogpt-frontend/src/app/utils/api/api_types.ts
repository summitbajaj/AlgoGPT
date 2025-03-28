/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
    "/api/profiling/start-profiling": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Api Start Profiling */
        post: operations["api_start_profiling_api_profiling_start_profiling_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/profiling/submit-profiling-answer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Api Submit Profiling Answer */
        post: operations["api_submit_profiling_answer_api_profiling_submit_profiling_answer_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/profiling/analyze-submission": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Api Analyze Submission */
        post: operations["api_analyze_submission_api_profiling_analyze_submission_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/profiling/profiling-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Api Profiling Status */
        post: operations["api_profiling_status_api_profiling_profiling_status_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/profiling/student/{student_id}/assessment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Student Assessment
         * @description Get assessment data for a specific student
         */
        get: operations["get_student_assessment_api_profiling_student__student_id__assessment_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/profiling/admin/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Admin Dashboard
         * @description Get aggregated data for admin dashboard
         */
        get: operations["get_admin_dashboard_api_profiling_admin_dashboard_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/profiling/finalize-assessment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Api Finalize Assessment
         * @description Manually finalize an assessment that's reached the question limit
         */
        post: operations["api_finalize_assessment_api_profiling_finalize_assessment_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/roadmap": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Roadmap
         * @description Get the complete roadmap with topics and connections.
         */
        get: operations["get_roadmap_api_roadmap_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/topics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Topics
         * @description Get list of all topics with question counts.
         */
        get: operations["get_topics_api_topics_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/problems": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Problems */
        get: operations["list_problems_problems_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/problems/{problem_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Problem */
        get: operations["get_problem_problems__problem_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/problems/{problem_id}/test-cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Fetch Test Cases */
        get: operations["fetch_test_cases_problems__problem_id__test_cases_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/submit-code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Execute Code
         * @description Fetches test cases, forwards request to code runner, and returns results.
         *     Stores submission results in the database.
         */
        post: operations["execute_code_submit_code_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/analyze-complexity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Analyze Submission Complexity
         * @description Analyzes the time and space complexity of a successful submission,
         *     with AI enhancement to provide the final determination.
         *
         *     This endpoint:
         *     1. Verifies that the submission exists and passed all tests
         *     2. Retrieves benchmark test cases for empirical analysis
         *     3. Forwards request to code-runner service for analysis
         *     4. Enhances results with AI insights
         *     5. Returns the final complexity analysis results with only the essential information
         */
        post: operations["analyze_submission_complexity_analyze_complexity_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/run-code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Run Code
         * @description Handles run code execution requests.
         *
         *     - Receives the user-submitted code, problem ID, and test cases.
         *     - Forwards the request to the code execution engine.
         *     - Retrieves the execution results and returns them to the client.
         *
         *     Args:
         *         request (PostRunCodeRequest): The request payload containing the code, problem ID, and test cases.
         *         db (Session): The database session dependency for querying/storing execution results.
         *
         *     Returns:
         *         JSON response with execution results.
         */
        post: operations["run_code_run_code_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/chat": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Chat Ai
         * @description AI Chat endpoint using LangGraph for structured chat memory with problem context.
         */
        post: operations["chat_ai_chat_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/topics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Topics
         * @description Get all available topics for problem generation
         */
        get: operations["get_topics_topics_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/generate-problem": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Generate Problem
         * @description Generate a new problem based on topic and difficulty
         */
        post: operations["generate_problem_generate_problem_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AdminDashboardResponse */
        AdminDashboardResponse: {
            /** Student Count */
            student_count: number;
            /** Topic Stats */
            topic_stats: Record<string, never>[];
            /** Recent Assessments */
            recent_assessments: Record<string, never>[];
            /** Common Struggles */
            common_struggles: Record<string, never>[];
        };
        /** ChatRequest */
        ChatRequest: {
            /** User Id */
            user_id: string;
            /** Problem Id */
            problem_id: number;
            /** User Message */
            user_message: string;
        };
        /** ComplexityAnalysisRequest */
        ComplexityAnalysisRequest: {
            /** Submission Id */
            submission_id: string;
        };
        /** ComplexityAnalysisResponse */
        ComplexityAnalysisResponse: {
            /** Submission Id */
            submission_id: string;
            /** Problem Id */
            problem_id: number;
            /** Time Complexity */
            time_complexity: string;
            /** Space Complexity */
            space_complexity: string;
            /** Message */
            message: string;
        };
        /** ExampleTestCaseModel */
        ExampleTestCaseModel: {
            /** Test Case Id */
            test_case_id: number;
            /** Input Data */
            input_data: Record<string, never>;
            /** Expected Output */
            expected_output: unknown;
            /** Explanation */
            explanation: string;
        };
        /** GenerateProblemRequest */
        GenerateProblemRequest: {
            /** Topic Id */
            topic_id: number;
            /**
             * Difficulty
             * @default Easy
             */
            difficulty: string;
            /** Existing Problem Id */
            existing_problem_id?: number | null;
        };
        /** GeneratedProblemResponse */
        GeneratedProblemResponse: {
            /** Success */
            success: boolean;
            /** Problem Id */
            problem_id?: number | null;
            /** Problem Data */
            problem_data?: Record<string, never> | null;
            /** Error */
            error?: string | null;
        };
        /** GetProblemResponse */
        GetProblemResponse: {
            /** Problem Id */
            problem_id: number;
            /** Title */
            title: string;
            /** Description */
            description: string;
            /** Difficulty */
            difficulty: string;
            /** Constraints */
            constraints: string;
            /** Topics */
            topics: string[];
            /** Examples */
            examples: components["schemas"]["ExampleTestCaseModel"][];
            /** Starter Code */
            starter_code: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** PostRunCodeRequest */
        PostRunCodeRequest: {
            /** Source Code */
            source_code: string;
            /** Problem Id */
            problem_id: number;
            /** Test Cases */
            test_cases: components["schemas"]["RunCodeTestCase"][];
        };
        /** PostRunCodeResponse */
        PostRunCodeResponse: {
            /** Test Results */
            test_results: components["schemas"]["RunCodeTestCaseResult"][];
        };
        /** ProfilingStatusRequest */
        ProfilingStatusRequest: {
            /** Session Id */
            session_id: string;
        };
        /** ProfilingStatusResponse */
        ProfilingStatusResponse: {
            /** Status */
            status: string;
            /** Completed */
            completed: boolean;
            /** Problems Attempted */
            problems_attempted: number;
            /** Current Topic */
            current_topic?: string | null;
            /** Current Difficulty */
            current_difficulty?: string | null;
        };
        /** RoadmapProblemModel */
        RoadmapProblemModel: {
            /** Id */
            id: string;
            /** Title */
            title: string;
            /** Difficulty */
            difficulty: string;
        };
        /** RoadmapResponse */
        RoadmapResponse: {
            /** Topics */
            topics: components["schemas"]["RoadmapTopicModel"][];
            /** Connections */
            connections: components["schemas"]["TopicConnectionModel"][];
        };
        /** RoadmapTopicModel */
        RoadmapTopicModel: {
            /** Id */
            id: string;
            /** Text */
            text: string;
            /** X */
            x: number;
            /** Y */
            y: number;
            /** Questions */
            questions: components["schemas"]["RoadmapProblemModel"][];
            /** Total */
            total: number;
            /**
             * Has Questions
             * @default true
             */
            has_questions: boolean;
        };
        /** RunCodeTestCase */
        RunCodeTestCase: {
            /** Test Case Id */
            test_case_id: number;
            /** Input */
            input: Record<string, never>;
        };
        /** RunCodeTestCaseResult */
        RunCodeTestCaseResult: {
            /** Test Case Id */
            test_case_id: number;
            /** Input */
            input: Record<string, never>;
            /** Output */
            output: unknown;
        };
        /** StartProfilingRequest */
        StartProfilingRequest: {
            /** Student Id */
            student_id: string;
        };
        /** StartProfilingResponse */
        StartProfilingResponse: {
            /** Session Id */
            session_id: string;
            /** Problem */
            problem: Record<string, never>;
        };
        /** StudentAssessmentResponse */
        StudentAssessmentResponse: {
            /** Student Id */
            student_id: string;
            /** Skill Level */
            skill_level: string;
            /** Overall Mastery */
            overall_mastery: number;
            /** Topic Masteries */
            topic_masteries: Record<string, never>[];
            /** Recent Attempts */
            recent_attempts: Record<string, never>[];
            /** Struggle Patterns */
            struggle_patterns: Record<string, never>[];
        };
        /** SubmitCodeRequest */
        SubmitCodeRequest: {
            /** User Id */
            user_id: string;
            /** Source Code */
            source_code: string;
            /** Problem Id */
            problem_id: number;
        };
        /** SubmitCodeResponse */
        SubmitCodeResponse: {
            /** Submission Id */
            submission_id: string;
            /** Status */
            status: string;
            /** Passed Tests */
            passed_tests: number;
            /** Total Tests */
            total_tests: number;
            /** User Code */
            user_code: string;
            failing_test?: components["schemas"]["SubmitCodeTestResult"] | null;
        };
        /** SubmitCodeTestResult */
        SubmitCodeTestResult: {
            /** Test Case Id */
            test_case_id: number;
            /** Input */
            input: Record<string, never>;
            /** Output */
            output: unknown;
            /** Passed */
            passed: boolean;
            /** Expected Output */
            expected_output: unknown;
        };
        /** SubmitProfilingAnswerRequest */
        SubmitProfilingAnswerRequest: {
            /** Session Id */
            session_id: string;
            /** Submission Result */
            submission_result: Record<string, never>;
        };
        /** SubmitProfilingAnswerResponse */
        SubmitProfilingAnswerResponse: {
            /** Status */
            status: string;
            /** Next Problem */
            next_problem?: Record<string, never> | null;
            /** Assessment Result */
            assessment_result?: Record<string, never> | null;
            /** Error */
            error?: string | null;
        };
        /** TopicConnectionModel */
        TopicConnectionModel: {
            /** From Id */
            from_id: string;
            /** To Id */
            to_id: string;
        };
        /** TopicListResponse */
        TopicListResponse: {
            /** Topics */
            topics: components["schemas"]["RoadmapTopicModel"][];
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    api_start_profiling_api_profiling_start_profiling_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartProfilingRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StartProfilingResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    api_submit_profiling_answer_api_profiling_submit_profiling_answer_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmitProfilingAnswerRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmitProfilingAnswerResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    api_analyze_submission_api_profiling_analyze_submission_post: {
        parameters: {
            query: {
                student_id: string;
                problem_id: number;
                submission_id: string;
                submission_code: string;
                submission_status: string;
                is_profiling?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": Record<string, never>[];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    api_profiling_status_api_profiling_profiling_status_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProfilingStatusRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProfilingStatusResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_student_assessment_api_profiling_student__student_id__assessment_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                student_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentAssessmentResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_admin_dashboard_api_profiling_admin_dashboard_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminDashboardResponse"];
                };
            };
        };
    };
    api_finalize_assessment_api_profiling_finalize_assessment_post: {
        parameters: {
            query: {
                session_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_roadmap_api_roadmap_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RoadmapResponse"];
                };
            };
        };
    };
    get_topics_api_topics_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TopicListResponse"];
                };
            };
        };
    };
    list_problems_problems_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    get_problem_problems__problem_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                problem_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetProblemResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    fetch_test_cases_problems__problem_id__test_cases_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                problem_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    execute_code_submit_code_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmitCodeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmitCodeResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    analyze_submission_complexity_analyze_complexity_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ComplexityAnalysisRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ComplexityAnalysisResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    run_code_run_code_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PostRunCodeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PostRunCodeResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    chat_ai_chat_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChatRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_topics_topics_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TopicListResponse"];
                };
            };
        };
    };
    generate_problem_generate_problem_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GenerateProblemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GeneratedProblemResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
