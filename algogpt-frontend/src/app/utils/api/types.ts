// define the types of the API request and response
import { components } from "../api/api_types";

export type CodeExecutionRequest = components["schemas"]["CodeExecutionRequest"];
export type CodeExecutionResponse = components["schemas"]["CodeExecutionResponse"];
export type Problem = components["schemas"]["GetProblemResponse"];
export type ExampleTestCaseModel = components["schemas"]["ExampleTestCaseModel"];

// for run-code endpoint
export type PostRunCodeRequest = components["schemas"]["PostRunCodeRequest"];
export type PostRunCodeResponse = components["schemas"]["PostRunCodeResponse"];
export type RunCodeTestCase = components["schemas"]["RunCodeTestCase"];
export type RunCodeTestCaseResult = components["schemas"]["RunCodeTestCaseResult"];