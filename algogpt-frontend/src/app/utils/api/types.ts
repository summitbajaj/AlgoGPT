// define the types of the API request and response
import { components } from "../api/api_types";

export type Problem = components["schemas"]["GetProblemResponse"];
export type ExampleTestCaseModel = components["schemas"]["ExampleTestCaseModel"];

// for submit-code endpoint
export type SubmitCodeRequest = components["schemas"]["SubmitCodeRequest"];
export type SubmitCodeResponse = components["schemas"]["SubmitCodeResponse"];
export type SubmitCodeTestCaseResult = components["schemas"]["SubmitCodeTestResult"];

// for run-code endpoint
export type PostRunCodeRequest = components["schemas"]["PostRunCodeRequest"];
export type PostRunCodeResponse = components["schemas"]["PostRunCodeResponse"];
export type RunCodeTestCase = components["schemas"]["RunCodeTestCase"];
export type RunCodeTestCaseResult = components["schemas"]["RunCodeTestCaseResult"];

// for analyze-code endpoint
export type ComplexityAnalysisRequest = components["schemas"]["ComplexityAnalysisRequest"];
export type ComplexityAnalysisResponse = components["schemas"]["ComplexityAnalysisResponse"];

// for roadmap endpoint
export type RoadmapResponse = components["schemas"]["RoadmapResponse"];
export type RoadmapTopicModel = components["schemas"]["RoadmapTopicModel"];
export type RoadmapProblemModel = components["schemas"]["RoadmapProblemModel"];
export type TopicConnectionModel = components["schemas"]["TopicConnectionModel"];
export type TopicListResponse = components["schemas"]["TopicListResponse"];