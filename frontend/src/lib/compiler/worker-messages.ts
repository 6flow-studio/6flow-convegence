import type {
  CompileWorkflowResult,
  CompilerUiError,
} from "./compiler-types";

export interface CompilerWorkerPayloadMap {
  init: Record<string, never>;
  validate_node: {
    nodeJson: string;
    globalConfigJson: string;
  };
  validate_workflow: {
    workflowJson: string;
  };
  compile_workflow: {
    workflowJson: string;
  };
}

export interface CompilerWorkerSuccessPayloadMap {
  init: {
    ready: true;
  };
  validate_node: {
    errors: CompilerUiError[];
  };
  validate_workflow: {
    errors: CompilerUiError[];
  };
  compile_workflow: CompileWorkflowResult;
}

export type CompilerWorkerRequestType = keyof CompilerWorkerPayloadMap;

export type CompilerWorkerRequest<T extends CompilerWorkerRequestType = CompilerWorkerRequestType> = {
  id: number;
  type: T;
  payload: CompilerWorkerPayloadMap[T];
};

export type CompilerWorkerSuccessResponse<
  T extends CompilerWorkerRequestType = CompilerWorkerRequestType,
> = {
  id: number;
  ok: true;
  type: T;
  payload: CompilerWorkerSuccessPayloadMap[T];
};

export type CompilerWorkerErrorResponse = {
  id: number;
  ok: false;
  type: CompilerWorkerRequestType;
  error: string;
};

export type CompilerWorkerResponse =
  | CompilerWorkerSuccessResponse
  | CompilerWorkerErrorResponse;
