"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fromReactFlowNodes } from "@/lib/workflow-convert";
import { useEditorStore } from "@/lib/editor-store";
import {
  groupErrorsByNodeId,
  toCompilerUiError,
  type CompilerActionStatus,
  type CompilerUiError,
} from "@/lib/compiler/compiler-types";
import { getCompilerWorkerClient } from "@/lib/compiler/compiler-worker-client";
import { buildWorkflowInput } from "@/lib/compiler/build-workflow-input";
import { downloadCompiledZip } from "@/lib/compiler/download-compiled-zip";

interface UseCompilerResult {
  canRunCompiler: boolean;
  compilerReady: boolean;
  compilerError: string | null;
  validationStatus: CompilerActionStatus;
  compileStatus: CompilerActionStatus;
  validationMessage: string | null;
  compileMessage: string | null;
  onValidate: () => Promise<void>;
  onCompile: () => Promise<void>;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown compiler error";
}

export function useCompiler(): UseCompilerResult {
  const nodes = useEditorStore((state) => state.nodes);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const workflowGlobalConfig = useEditorStore((state) => state.workflowGlobalConfig);
  const setWorkflowErrors = useEditorStore((state) => state.setWorkflowErrors);
  const setNodeLiveErrors = useEditorStore((state) => state.setNodeLiveErrors);
  const replaceNodeLiveErrorsByNodeId = useEditorStore(
    (state) => state.replaceNodeLiveErrorsByNodeId
  );
  const clearCompilerErrors = useEditorStore((state) => state.clearCompilerErrors);

  const workerClient = useMemo(() => getCompilerWorkerClient(), []);

  const [compilerReady, setCompilerReady] = useState(false);
  const [compilerError, setCompilerError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] =
    useState<CompilerActionStatus>("idle");
  const [compileStatus, setCompileStatus] =
    useState<CompilerActionStatus>("idle");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [compileMessage, setCompileMessage] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const selectedNodeJson = useMemo(() => {
    if (!selectedNode) {
      return null;
    }
    const sharedNode = fromReactFlowNodes([selectedNode])[0];
    return JSON.stringify(sharedNode);
  }, [selectedNode]);

  const globalConfigJson = useMemo(
    () => JSON.stringify(workflowGlobalConfig),
    [workflowGlobalConfig]
  );

  const selectedNodeSignature = useMemo(() => {
    if (!selectedNode) {
      return null;
    }

    return JSON.stringify({
      id: selectedNode.id,
      label: selectedNode.data.label,
      config: selectedNode.data.config,
      position: selectedNode.position,
    });
  }, [selectedNode]);

  const applyErrors = useCallback(
    (errors: CompilerUiError[]) => {
      setWorkflowErrors(errors);
      replaceNodeLiveErrorsByNodeId(groupErrorsByNodeId(errors));
    },
    [replaceNodeLiveErrorsByNodeId, setWorkflowErrors]
  );

  const serializeWorkflow = useCallback((): string => {
    const state = useEditorStore.getState();
    const workflow = buildWorkflowInput({
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      workflowCreatedAt: state.workflowCreatedAt,
      workflowGlobalConfig: state.workflowGlobalConfig,
      nodes: state.nodes,
      edges: state.edges,
    });
    return JSON.stringify(workflow);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void workerClient
      .init()
      .then(() => {
        if (cancelled) {
          return;
        }
        setCompilerReady(true);
        setCompilerError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = toMessage(error);
        setCompilerReady(false);
        setCompilerError(message);
        setWorkflowErrors([
          toCompilerUiError(
            `Compiler failed to initialize: ${message}`,
            "W101",
            "Worker"
          ),
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [setWorkflowErrors, workerClient]);

  const nodeValidationSequence = useRef(0);

  useEffect(() => {
    if (!compilerReady || compilerError || !selectedNode || !selectedNodeJson) {
      return;
    }

    const sequence = ++nodeValidationSequence.current;
    const timer = window.setTimeout(() => {
      void workerClient
        .validateNode(selectedNodeJson, globalConfigJson)
        .then((errors) => {
          if (sequence !== nodeValidationSequence.current) {
            return;
          }

          const normalizedErrors = errors.map((error) => ({
            ...error,
            node_id: error.node_id ?? selectedNode.id,
          }));

          setNodeLiveErrors(selectedNode.id, normalizedErrors);
        })
        .catch((error) => {
          if (sequence !== nodeValidationSequence.current) {
            return;
          }

          setNodeLiveErrors(selectedNode.id, [
            toCompilerUiError(
              `Node validation failed: ${toMessage(error)}`,
              "W102",
              "Worker",
              selectedNode.id
            ),
          ]);
        });
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    compilerError,
    compilerReady,
    globalConfigJson,
    selectedNode,
    selectedNodeJson,
    selectedNodeSignature,
    setNodeLiveErrors,
    workerClient,
  ]);

  const onValidate = useCallback(async () => {
    if (!compilerReady || compilerError) {
      return;
    }

    setValidationStatus("running");
    setValidationMessage("Validating workflow...");

    try {
      const errors = await workerClient.validateWorkflow(serializeWorkflow());
      applyErrors(errors);

      if (errors.length > 0) {
        setValidationStatus("error");
        setValidationMessage(`Validation found ${errors.length} issue(s)`);
        return;
      }

      setValidationStatus("success");
      setValidationMessage("Workflow validation passed");
    } catch (error) {
      const message = toMessage(error);
      applyErrors([
        toCompilerUiError(
          `Workflow validation failed: ${message}`,
          "W103",
          "Worker"
        ),
      ]);
      setValidationStatus("error");
      setValidationMessage("Workflow validation failed");
    }
  }, [applyErrors, compilerError, compilerReady, serializeWorkflow, workerClient]);

  const onCompile = useCallback(async () => {
    if (!compilerReady || compilerError) {
      return;
    }

    setCompileStatus("running");
    setCompileMessage("Compiling workflow...");

    try {
      const result = await workerClient.compileWorkflow(serializeWorkflow());

      if (result.status === "errors") {
        applyErrors(result.errors);
        setCompileStatus("error");
        setCompileMessage(`Compile failed with ${result.errors.length} error(s)`);
        return;
      }

      clearCompilerErrors();
      await downloadCompiledZip(
        result.files,
        useEditorStore.getState().workflowName
      );
      setCompileStatus("success");
      setCompileMessage(`Compiled ${result.files.length} file(s)`);
    } catch (error) {
      const message = toMessage(error);
      applyErrors([
        toCompilerUiError(`Compile failed: ${message}`, "W104", "Worker"),
      ]);
      setCompileStatus("error");
      setCompileMessage("Compile failed");
    }
  }, [
    applyErrors,
    clearCompilerErrors,
    compilerError,
    compilerReady,
    serializeWorkflow,
    workerClient,
  ]);

  return {
    canRunCompiler: compilerReady && !compilerError,
    compilerReady,
    compilerError,
    validationStatus,
    compileStatus,
    validationMessage,
    compileMessage,
    onValidate,
    onCompile,
  };
}
