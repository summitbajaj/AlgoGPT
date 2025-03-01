// define the types of the API request and response
import { components } from "../api/api_types";

export type Problem = components["schemas"]["GetProblemResponse"];
export type ExampleTestCaseModel = components["schemas"]["ExampleTestCaseModel"];

// for submit-code endpoint
export type SubmitCodeRequest = components["schemas"]["SubmitCodeRequest"];
export type SubmitCodeResponse = components["schemas"]["SubmitCodeResponse"];

// for run-code endpoint
export type PostRunCodeRequest = components["schemas"]["PostRunCodeRequest"];
export type PostRunCodeResponse = components["schemas"]["PostRunCodeResponse"];
export type RunCodeTestCase = components["schemas"]["RunCodeTestCase"];
export type RunCodeTestCaseResult = components["schemas"]["RunCodeTestCaseResult"];