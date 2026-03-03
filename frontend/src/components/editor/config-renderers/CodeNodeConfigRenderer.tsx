"use client";

import { SelectField, NumberField } from "../config-fields";
import { CodeEditorField } from "../code-editor/CodeEditorField";
import type { CodeNodeConfig, CodeExecutionMode } from "@6flow/shared/model/node";

interface Props {
  config: CodeNodeConfig;
  onChange: (patch: Record<string, unknown>) => void;
}

export function CodeNodeConfigRenderer({ config, onChange }: Props) {
  return (
    <div className="space-y-3">
      <SelectField
        label="Language"
        value={config.language ?? "typescript"}
        onChange={(v) => onChange({ language: v })}
        options={[{ value: "typescript", label: "TypeScript" }]}
      />

      <SelectField
        label="Execution Mode"
        value={config.executionMode}
        onChange={(v) => onChange({ executionMode: v })}
        options={[
          { value: "runOnceForAll", label: "Run Once For All" },
          { value: "runOnceForEach", label: "Run Once For Each" },
        ]}
      />

      <CodeEditorField
        code={config.code}
        onCodeChange={(code) => onChange({ code })}
        language={config.language ?? "typescript"}
        onLanguageChange={(language) => onChange({ language })}
        executionMode={config.executionMode}
        onExecutionModeChange={(executionMode: CodeExecutionMode) =>
          onChange({ executionMode })
        }
      />

      <NumberField
        label="Timeout (ms)"
        description="Max execution time"
        value={config.timeout}
        onChange={(timeout) => onChange({ timeout })}
        min={0}
        max={30000}
        step={100}
      />
    </div>
  );
}
